import { Job } from "../types/job";

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
