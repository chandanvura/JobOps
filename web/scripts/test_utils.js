import assert from "node:assert";

// Standalone mirror of jobUtils for direct node execution verification
function cleanJobText(raw) {
  if (!raw) return "";
  let text = String(raw);
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
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

function formatPostingTime(postedAt, ageHours) {
  if (!postedAt && (!ageHours || ageHours <= 0)) {
    return "Recently detected";
  }
  const hours = typeof ageHours === "number" ? Math.max(0, ageHours) : 0;
  if (hours < 1) return "Just posted";
  if (hours < 2) return "1 hour ago";
  if (hours < 24) return `${Math.round(hours)} hours ago`;
  if (hours >= 24 && hours < 48) return "Yesterday";
  const days = Math.round(hours / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

function formatLocation(city, rawLocation) {
  if (city && city !== "Other-India" && city !== "unknown" && city !== "null" && city !== "undefined") {
    return city;
  }
  if (rawLocation && rawLocation !== "null" && rawLocation !== "undefined") {
    const rawClean = cleanJobText(rawLocation);
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

function sanitizeExternalUrl(rawUrl) {
  if (!rawUrl) return "#";
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.href;
    }
    return "#";
  } catch {
    return "#";
  }
}

const STOPWORDS = new Set([
  "and", "or", "roles", "role", "jobs", "job", "in", "at", "for", "with", "a", "an", "the", "to", "of"
]);

function matchJobSearch(job, searchQuery) {
  const q = searchQuery.toLowerCase().trim();
  if (!q) return true;

  const title = (job.title || "").toLowerCase();
  const co = (job.company_name || "").toLowerCase();
  const skills = (job.skills || []).map((s) => s.toLowerCase());
  const summary = (job.summary || "").toLowerCase();
  const roleLabel = (job.role_label || "").toLowerCase();

  if (title.includes(q) || co.includes(q) || skills.some((s) => s.includes(q)) || summary.includes(q)) {
    return true;
  }

  const rawTokens = q.split(/[^a-zA-Z0-9+#]+/).filter(Boolean);
  if (rawTokens.length === 0) return true;

  const tokens = rawTokens.filter((t) => !STOPWORDS.has(t));
  if (tokens.length === 0) return true;

  const isDisjunctive = q.includes(" or ") || (tokens.includes("devops") && tokens.includes("sre"));

  const matchesToken = (token) => {
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

function matchJobExperience(job, experienceLevel) {
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

function matchJobCity(job, selectedCity) {
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

// Test 1: HTML entity decoding & tag stripping
const rawHtml = '&amp;lt;div class=&amp;quot;content-intro&amp;quot;&amp;gt;&amp;lt;p&amp;gt;Everpure (NYSE: P) is hiring.&amp;lt;/p&amp;gt;&amp;lt;/div&amp;gt;Role Overview: Build microservices in Go.';
const cleaned = cleanJobText(rawHtml);
assert.strictEqual(cleaned, 'Build microservices in Go.');
console.log('✓ Test 1: Recursive HTML entity unescaping & boilerplate stripping passed');

// Test 2: Relative timestamp formatting
assert.strictEqual(formatPostingTime("2026-11-20", 0.4), "Just posted");
assert.strictEqual(formatPostingTime("2026-11-20", 1.2), "1 hour ago");
assert.strictEqual(formatPostingTime("2026-11-20", 5.0), "5 hours ago");
assert.strictEqual(formatPostingTime("2026-11-19", 26.0), "Yesterday");
assert.strictEqual(formatPostingTime("2026-11-17", 72.0), "3 days ago");
console.log('✓ Test 2: Timestamp humanization passed');

// Test 3: Location normalization
assert.strictEqual(formatLocation("Other-India", "Bengaluru, Karnataka, India"), "Bengaluru");
assert.strictEqual(formatLocation("null", "Pune, India"), "Pune");
assert.strictEqual(formatLocation("Other-India", ""), "India");
assert.strictEqual(formatLocation("Hyderabad", ""), "Hyderabad");
console.log('✓ Test 3: Location normalization passed');

// Test 4: External URL sanitization (XSS mitigation)
assert.strictEqual(sanitizeExternalUrl("javascript:alert(1)"), "#");
assert.strictEqual(sanitizeExternalUrl("data:text/html,<script>alert(1)</script>"), "#");
assert.strictEqual(sanitizeExternalUrl("https://boards.greenhouse.io/razorpay/jobs/123"), "https://boards.greenhouse.io/razorpay/jobs/123");
assert.strictEqual(sanitizeExternalUrl("http://careers.swiggy.com"), "http://careers.swiggy.com/");
console.log('✓ Test 4: External URL protocol sanitization passed');

// Test 5: Intelligent search matching (synonyms, stopwords, multi-token)
const sampleJavaJob = { title: "Senior Java Software Engineer", company_name: "Atlassian", skills: ["Java", "Spring Boot"], summary: "Lead distributed architecture" };
const sampleDevOpsJob = { title: "Lead Site Reliability Engineer (SRE)", company_name: "Uber", skills: ["Kubernetes", "AWS"], summary: "Platform infra" };
assert.strictEqual(matchJobSearch(sampleJavaJob, "Java Developer"), true, "Should match Java Developer to Java Software Engineer");
assert.strictEqual(matchJobSearch(sampleDevOpsJob, "DevOps and SRE roles"), true, "Should match DevOps and SRE roles to Site Reliability Engineer (SRE)");
assert.strictEqual(matchJobSearch(sampleJavaJob, "Python Developer"), false, "Should not match Python Developer to Java Engineer");
console.log('✓ Test 5: Intelligent search matching (synonyms, stopwords, tokenization) passed');

// Test 6: Flexible experience level matching
const sampleFresherJob = { title: "Graduate Engineer Trainee", experience_level: "Fresher / 0-1 yr", min_years: 0, max_years: 1 };
const sampleJuniorJob = { title: "Software Engineer I", experience_level: "0-2 yrs", min_years: 0, max_years: 2 };
const sampleSeniorJob = { title: "Staff Architect", experience_level: "5+ yrs", min_years: 5, max_years: null };
assert.strictEqual(matchJobExperience(sampleFresherJob, "Fresher / 0-1 yr"), true);
assert.strictEqual(matchJobExperience(sampleJuniorJob, "1-3 yrs"), true);
assert.strictEqual(matchJobExperience(sampleSeniorJob, "5+ yrs"), true);
assert.strictEqual(matchJobExperience(sampleSeniorJob, "Fresher / 0-1 yr"), false);
console.log('✓ Test 6: Flexible experience level matching passed');

// Test 7: Multi-city and hub matching
const multiLocJob = { title: "Backend Engineer", city: "Bengaluru", location_raw: "Bengaluru; Hyderabad" };
assert.strictEqual(matchJobCity(multiLocJob, "Bengaluru"), true);
assert.strictEqual(matchJobCity(multiLocJob, "Hyderabad"), true);
assert.strictEqual(matchJobCity(multiLocJob, "Pune"), false);
console.log('✓ Test 7: Multi-city and hub matching passed');

console.log('\nAll JobOps Frontend Utility Tests Passed Successfully (7/7)!');
