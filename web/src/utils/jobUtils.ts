import type { Job } from "../types/job.ts";

/**
 * Safely decodes HTML entities and strips all HTML tags to produce clean readable text.
 * Prevents double-encoded strings like &amp;lt;div class=&amp;quot;...&amp;gt;
 */
export function cleanJobText(raw: string | null | undefined): string {
  if (!raw) return "";

  let text = String(raw);

  // Step 1: Decode entities recursively (up to 2 passes for double-encoded text)
  for (let i = 0; i < 2; i++) {
    if (text.includes("&amp;") || text.includes("&lt;") || text.includes("&gt;") || text.includes("&quot;") || text.includes("&#")) {
      text = text
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&nbsp;/g, " ");
    } else {
      break;
    }
  }

  // Step 2: Strip common company intro boilerplates that leak into job summaries (before stripping tags)
  text = text.replace(/^[\s\S]*?(?:content-intro|company-intro)[\s\S]*?(?:Position Overview|Role Overview|About the Role|About the Job|Responsibilities|Overview|Summary|Role|Job Description):?\s*/i, "");

  // Step 3: Strip any HTML tags (complete or truncated)
  text = text.replace(/<[^>]+>/g, " ").replace(/<[^>]*$/g, " ");

  // Step 4: Normalize spaces
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

/**
 * Replaces awkward displays like "0h ago" with human-readable relative timestamps.
 */
export function formatPostingTime(postedAt: string | null | undefined, ageHours: number): string {
  if (!postedAt && (!ageHours || ageHours <= 0)) {
    return "Recently detected";
  }

  const hours = typeof ageHours === "number" ? Math.max(0, ageHours) : 0;

  if (hours < 1) {
    return "Just posted";
  }
  if (hours < 2) {
    return "1 hour ago";
  }
  if (hours < 24) {
    return `${Math.round(hours)} hours ago`;
  }
  if (hours >= 24 && hours < 48) {
    return "Yesterday";
  }
  const days = Math.round(hours / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

/**
 * Normalizes location strings, eliminating "Other-India", "undefined", and "null".
 */
export function formatLocation(city: string | null | undefined, rawLocation: string | null | undefined): string {
  if (city && city !== "Other-India" && city !== "unknown" && city !== "null" && city !== "undefined") {
    return city;
  }

  if (rawLocation && rawLocation !== "null" && rawLocation !== "undefined") {
    const rawClean = cleanJobText(rawLocation);
    // Detect major hubs if raw contains them
    const hubs = ["Bengaluru", "Bangalore", "Hyderabad", "Pune", "Delhi NCR", "Gurgaon", "Gurugram", "Noida", "Mumbai", "Chennai"];
    for (const h of hubs) {
      if (rawClean.toLowerCase().includes(h.toLowerCase())) {
        return h === "Bangalore" ? "Bengaluru" : (h === "Gurugram" ? "Gurgaon" : h);
      }
    }
    if (rawClean && rawClean.length < 35 && !rawClean.toLowerCase().includes("other-india")) {
      return rawClean;
    }
  }

  return "India";
}

/**
 * Standardizes work arrangement into Remote, Hybrid, or On-site.
 */
export function formatWorkMode(mode: string | null | undefined): "Remote" | "Hybrid" | "On-site" {
  if (!mode) return "On-site";
  const m = mode.toLowerCase().trim();
  if (m === "remote") return "Remote";
  if (m === "hybrid") return "Hybrid";
  return "On-site";
}

export interface RelevanceScoreResult {
  score: number;
  breakdown: string[];
}

/**
 * Safely sanitizes external application URLs to prevent script execution (XSS)
 * or open redirects to unsafe protocols like javascript:, data:, file:, etc.
 */
export function sanitizeExternalUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl) return "#";
  try {
    const trimmed = rawUrl.trim();
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.href;
    }
    return "#";
  } catch {
    return "#";
  }
}

/**
 * Computes a transparent, deterministic 0-100 relevance score for a job.
 */
export function calculateRelevanceScore(
  job: Job,
  searchQuery: string,
  selectedSkills: string[],
  selectedRole?: string
): RelevanceScoreResult {
  let score = 50; // Baseline for verified engineering jobs
  const breakdown: string[] = ["Base Verified Engineering Match (+50)"];

  // Freshness boost
  if (job.is_fresh_24h) {
    score += 20;
    breakdown.push("Fresh in Last 24 Hours (+20)");
  }

  // Search query match
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    if (job.title.toLowerCase().includes(q)) {
      score += 15;
      breakdown.push(`Direct Title Match for "${searchQuery}" (+15)`);
    } else if (job.skills?.some((s) => s.toLowerCase().includes(q))) {
      score += 10;
      breakdown.push(`Skills Match for "${searchQuery}" (+10)`);
    } else if (job.company_name.toLowerCase().includes(q)) {
      score += 10;
      breakdown.push(`Company Match for "${searchQuery}" (+10)`);
    }
  }

  // Selected skills alignment
  if (selectedSkills.length > 0 && job.skills) {
    const matched = selectedSkills.filter((sk) =>
      job.skills.some((js) => js.toLowerCase() === sk.toLowerCase())
    );
    if (matched.length > 0) {
      const skillPts = Math.min(15, matched.length * 5);
      score += skillPts;
      breakdown.push(`Matches ${matched.length} Selected Skill(s): ${matched.join(", ")} (+${skillPts})`);
    }
  }

  // Role category match
  if (selectedRole && selectedRole !== "all" && job.role_category === selectedRole) {
    score += 5;
    breakdown.push(`Discipline Aligned with ${job.role_label} (+5)`);
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    breakdown,
  };
}

const STOPWORDS = new Set([
  "and", "or", "roles", "role", "jobs", "job", "in", "at", "for", "with", "a", "an", "the", "to", "of"
]);

/**
 * Intelligent engineering search matching with stopword stripping, tokenization,
 * and tech synonym expansion (e.g. "Java Developer" -> matches Java engineers/SDEs,
 * "DevOps and SRE roles" -> matches DevOps or SRE).
 */
export function matchJobSearch(job: Job, searchQuery: string): boolean {
  const q = searchQuery.toLowerCase().trim();
  if (!q) return true;

  const title = (job.title || "").toLowerCase();
  const co = (job.company_name || "").toLowerCase();
  const skills = (job.skills || []).map((s) => s.toLowerCase());
  const summary = (job.summary || "").toLowerCase();
  const roleLabel = (job.role_label || "").toLowerCase();

  // 1. Exact phrase match anywhere
  if (title.includes(q) || co.includes(q) || skills.some((s) => s.includes(q)) || summary.includes(q)) {
    return true;
  }

  // 2. Tokenize search query
  const rawTokens = q.split(/[^a-zA-Z0-9+#]+/).filter(Boolean);
  if (rawTokens.length === 0) return true;

  // Filter stopwords
  const tokens = rawTokens.filter((t) => !STOPWORDS.has(t));
  if (tokens.length === 0) return true;

  // Check if query is disjunctive (e.g. contains "or", or "devops and sre")
  const isDisjunctive = q.includes(" or ") || (tokens.includes("devops") && tokens.includes("sre"));

  const matchesToken = (token: string): boolean => {
    const synonyms = [token];
    if (token === "dev" || token === "developer") {
      synonyms.push("engineer", "engineering", "programmer", "sde");
    } else if (token === "engineer" || token === "engineering") {
      synonyms.push("developer", "dev", "sde");
    }

    return synonyms.some(
      (syn) =>
        title.includes(syn) ||
        co.includes(syn) ||
        skills.some((s) => s.includes(syn)) ||
        summary.includes(syn) ||
        roleLabel.includes(syn)
    );
  };

  if (isDisjunctive) {
    return tokens.some(matchesToken);
  }

  return tokens.every(matchesToken);
}

/**
 * Robust experience level matching supporting both structured ranges and numeric year bounds.
 */
export function matchJobExperience(job: Job, experienceLevel: string): boolean {
  if (experienceLevel === "All") return true;

  const expStr = job.experience_level || "";
  const minY = job.min_years;
  const maxY = job.max_years;

  switch (experienceLevel) {
    case "Fresher / 0-1 yr":
      return (
        expStr === "Fresher / 0-1 yr" ||
        expStr === "0-2 yrs" ||
        (minY !== null && minY !== undefined && minY <= 1.0)
      );
    case "1-3 yrs":
      return (
        expStr === "1-3 yrs" ||
        expStr === "0-2 yrs" ||
        expStr === "2-4 yrs" ||
        expStr === "2-5 yrs" ||
        (minY !== null && minY !== undefined && minY <= 3.0 && (maxY === null || maxY === undefined || maxY >= 1.0))
      );
    case "3-5 yrs":
      return (
        expStr === "3-5 yrs" ||
        expStr === "2-5 yrs" ||
        expStr === "2-4 yrs" ||
        (minY !== null && minY !== undefined && minY <= 5.0 && (maxY === null || maxY === undefined || maxY >= 3.0))
      );
    case "5+ yrs":
      return (
        expStr === "5+ yrs" ||
        (minY !== null && minY !== undefined && minY >= 5.0)
      );
    default:
      return expStr === experienceLevel;
  }
}

/**
 * Intelligent hub and location matching supporting multi-city postings (e.g. "Bengaluru; Hyderabad").
 */
export function matchJobCity(job: Job, selectedCity: string): boolean {
  if (selectedCity === "All") return true;

  const city = (job.city || "").toLowerCase();
  const rawLoc = (job.location_raw || "").toLowerCase();
  const sel = selectedCity.toLowerCase();

  if (sel === "remote") {
    return job.work_mode === "remote" || city.includes("remote") || rawLoc.includes("remote");
  }

  if (sel === "delhi ncr") {
    return (
      city.includes("delhi") ||
      city.includes("ncr") ||
      city.includes("gurgaon") ||
      city.includes("noida") ||
      rawLoc.includes("delhi") ||
      rawLoc.includes("ncr") ||
      rawLoc.includes("gurgaon") ||
      rawLoc.includes("gurugram") ||
      rawLoc.includes("noida")
    );
  }

  return (
    city === sel ||
    city.includes(sel) ||
    rawLoc.includes(sel)
  );
}

/**
 * Valid pipeline application lifecycle stages.
 */
export const ALLOWED_PIPELINE_STAGES = [
  "Saved",
  "Interested",
  "Applied",
  "Assessment",
  "Interview",
  "Offer",
  "Rejected",
  "Withdrawn",
  "Follow-up",
] as const;

export type PipelineStage = (typeof ALLOWED_PIPELINE_STAGES)[number];

export interface ValidatedJobImport {
  valid: boolean;
  validJobs: Job[];
  trackingMap: Record<string, { stage: PipelineStage; notes: string; savedAt: string; appliedAt?: string }>;
  duplicateCount: number;
  errors: string[];
}

/**
 * Validates untrusted imported JSON data against the JobOps application schema.
 * Rejects corrupt structures, validates fields, and sanitizes tracking metadata.
 */
export function validateJobImportData(data: unknown): ValidatedJobImport {
  const errors: string[] = [];
  if (!Array.isArray(data)) {
    return {
      valid: false,
      validJobs: [],
      trackingMap: {},
      duplicateCount: 0,
      errors: ["Import payload is not a valid JSON array."],
    };
  }

  if (data.length === 0) {
    return {
      valid: false,
      validJobs: [],
      trackingMap: {},
      duplicateCount: 0,
      errors: ["Import array is empty."],
    };
  }

  const validJobs: Job[] = [];
  const trackingMap: Record<string, { stage: PipelineStage; notes: string; savedAt: string; appliedAt?: string }> = {};
  const seenIds = new Set<string>();
  let duplicateCount = 0;

  for (let idx = 0; idx < data.length; idx++) {
    const item = data[idx];
    if (!item || typeof item !== "object") {
      errors.push(`Record #${idx + 1} is not a valid object.`);
      continue;
    }

    const rec = item as Record<string, any>;
    const id = typeof rec.id === "string" ? rec.id.trim() : "";
    const title = typeof rec.title === "string" ? cleanJobText(rec.title).slice(0, 150) : "";
    const company = typeof rec.company_name === "string" ? cleanJobText(rec.company_name).slice(0, 100) : "";
    const url = sanitizeExternalUrl(rec.job_url);

    if (!id) {
      errors.push(`Record #${idx + 1} is missing a unique 'id'.`);
      continue;
    }
    if (!title) {
      errors.push(`Record #${idx + 1} (id: ${id}) is missing a 'title'.`);
      continue;
    }
    if (!company) {
      errors.push(`Record #${idx + 1} (id: ${id}) is missing 'company_name'.`);
      continue;
    }

    if (seenIds.has(id)) {
      duplicateCount++;
      continue;
    }
    seenIds.add(id);

    // Normalize pipeline stage
    let stage: PipelineStage = "Saved";
    let notes = "";
    let appliedAt: string | undefined = undefined;
    const savedAt = typeof rec.pipelineTracking?.savedAt === "string" ? rec.pipelineTracking.savedAt : new Date().toISOString();

    if (rec.pipelineTracking && typeof rec.pipelineTracking === "object") {
      const pStage = rec.pipelineTracking.stage;
      if (ALLOWED_PIPELINE_STAGES.includes(pStage)) {
        stage = pStage;
      }
      if (typeof rec.pipelineTracking.notes === "string") {
        notes = cleanJobText(rec.pipelineTracking.notes).slice(0, 2000);
      }
      if (typeof rec.pipelineTracking.appliedAt === "string") {
        appliedAt = rec.pipelineTracking.appliedAt.slice(0, 30);
      }
    }

    trackingMap[id] = { stage, notes, savedAt, appliedAt };

    let validMode: "remote" | "hybrid" | "onsite" | "unknown" = "unknown";
    if (rec.work_mode === "remote" || rec.work_mode === "hybrid" || rec.work_mode === "onsite") {
      validMode = rec.work_mode;
    }

    const job: Job = {
      id,
      external_id: typeof rec.external_id === "string" ? rec.external_id : id,
      company_name: company,
      company_id: typeof rec.company_id === "string" ? rec.company_id : id,
      title,
      job_url: url,
      ats_provider: typeof rec.ats_provider === "string" ? rec.ats_provider : "direct",
      is_engineering: true,
      role_category: typeof rec.role_category === "string" ? rec.role_category : "fullstack",
      role_label: typeof rec.role_label === "string" ? rec.role_label : "Full Stack",
      city: typeof rec.city === "string" ? rec.city : "India",
      location_raw: typeof rec.location_raw === "string" ? rec.location_raw : "",
      work_mode: validMode,
      is_india: true,
      min_years: typeof rec.min_years === "number" ? rec.min_years : null,
      max_years: typeof rec.max_years === "number" ? rec.max_years : null,
      experience_level: typeof rec.experience_level === "string" ? rec.experience_level : "1-3 yrs",
      skills: Array.isArray(rec.skills) ? rec.skills.filter((s: any) => typeof s === "string") : [],
      posted_at: typeof rec.posted_at === "string" ? rec.posted_at : new Date().toISOString(),
      age_hours: typeof rec.age_hours === "number" ? rec.age_hours : 1,
      is_fresh_24h: Boolean(rec.is_fresh_24h),
      first_seen_at: typeof rec.first_seen_at === "string" ? rec.first_seen_at : new Date().toISOString(),
      last_seen_at: typeof rec.last_seen_at === "string" ? rec.last_seen_at : new Date().toISOString(),
      is_active: typeof rec.is_active === "boolean" ? rec.is_active : true,
      summary: typeof rec.summary === "string" ? cleanJobText(rec.summary).slice(0, 400) : `${title} at ${company}`,
    };

    validJobs.push(job);
  }

  return {
    valid: validJobs.length > 0,
    validJobs,
    trackingMap,
    duplicateCount,
    errors,
  };
}

/**
 * Escapes CSV values and neutralizes spreadsheet formula injection (CWE-1236).
 * Values starting with =, +, -, @, \t, or \r are prefixed with a single quote.
 */
export function sanitizeCsvField(rawVal: unknown): string {
  if (rawVal === null || rawVal === undefined) return '""';
  let str = String(rawVal);

  // Strip carriage returns and normalize newlines
  str = str.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Prevent Spreadsheet Formula Injection (CWE-1236)
  if (/^[\=\+\-\@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escape double quotes
  return `"${str.replace(/"/g, '""')}"`;
}
