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

console.log('\nAll JobOps Frontend Utility Tests Passed Successfully (4/4)!');
