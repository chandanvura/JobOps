import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanJobText,
  sanitizeExternalUrl,
  normalizeJobUrl,
  formatPostingTime,
  formatLocation,
  formatWorkMode,
  calculateRelevanceScore,
  matchJobSearch,
  matchJobExperience,
  matchJobCity,
  sanitizeCsvField,
  validateJobImportData,
} from "../src/utils/jobUtils.ts";
import type { Job } from "../src/types/job.ts";

const dummyJob: Job = {
  id: "test-123",
  external_id: "ext-123",
  company_id: "razorpay",
  company_name: "Razorpay",
  ats_provider: "greenhouse",
  title: "Senior Backend Engineer",
  job_url: "https://boards.greenhouse.io/razorpay/jobs/123",
  is_engineering: true,
  role_category: "backend",
  role_label: "Backend & Systems",
  location_raw: "Bengaluru, Karnataka, India",
  city: "Bengaluru",
  work_mode: "hybrid",
  is_india: true,
  min_years: 3.0,
  max_years: 5.0,
  experience_level: "3-5 yrs",
  skills: ["Golang", "Kafka", "PostgreSQL", "AWS"],
  posted_at: new Date().toISOString(),
  age_hours: 2.0,
  is_fresh_24h: true,
  first_seen_at: new Date().toISOString(),
  last_seen_at: new Date().toISOString(),
  is_active: true,
  summary: "Design and maintain high-throughput payment processing APIs in Golang.",
};

test("cleanJobText - recursively decodes double-encoded entities and strips HTML tags", () => {
  const dirty = "&amp;lt;div class=&amp;quot;intro&amp;quot;&amp;gt;&lt;p&gt;About the Role: Looking for a &amp;amp; Backend Dev&lt;/p&gt;&lt;/div&gt;";
  const cleaned = cleanJobText(dirty);
  assert.strictEqual(cleaned.includes("&amp;"), false);
  assert.strictEqual(cleaned.includes("<div"), false);
  assert.strictEqual(cleaned.includes("<p"), false);
  assert.strictEqual(cleaned.includes("&lt;"), false);
  assert.ok(cleaned.includes("Looking for a & Backend Dev"));
});

test("sanitizeExternalUrl - blocks dangerous protocols and allows valid HTTP/HTTPS", () => {
  assert.strictEqual(sanitizeExternalUrl("javascript:alert(1)"), "#");
  assert.strictEqual(sanitizeExternalUrl("data:text/html,<script>alert(1)</script>"), "#");
  assert.strictEqual(sanitizeExternalUrl("file:///etc/passwd"), "#");
  assert.strictEqual(sanitizeExternalUrl("https://careers.google.com/jobs"), "https://careers.google.com/jobs");
  assert.strictEqual(sanitizeExternalUrl("http://example.com/job"), "http://example.com/job");
  assert.strictEqual(sanitizeExternalUrl(""), "#");
  assert.strictEqual(sanitizeExternalUrl(null), "#");
});

test("sanitizeCsvField - protects against CSV Formula Injection (CWE-1236)", () => {
  // Test formula injection triggers
  assert.strictEqual(sanitizeCsvField("=1+1"), "\"'=1+1\"");
  assert.strictEqual(sanitizeCsvField("+cmd|' /C calc'!A0"), "\"'+cmd|' /C calc'!A0\"");
  assert.strictEqual(sanitizeCsvField("-2+5"), "\"'-2+5\"");
  assert.strictEqual(sanitizeCsvField("@SUM(A1:A10)"), "\"'@SUM(A1:A10)\"");
  assert.strictEqual(sanitizeCsvField("\tTabInjected"), "\"'\tTabInjected\"");

  // Test quote escaping
  assert.strictEqual(sanitizeCsvField('Software "Staff" Engineer'), '"Software ""Staff"" Engineer"');

  // Normal safe string
  assert.strictEqual(sanitizeCsvField("Normal Company, Inc."), '"Normal Company, Inc."');
});

test("matchJobSearch - intelligent tokenization and tech synonym expansion", () => {
  // "developer" query matches "Senior Backend Engineer" via tech synonym
  assert.strictEqual(matchJobSearch(dummyJob, "Backend Developer"), true);
  assert.strictEqual(matchJobSearch(dummyJob, "Golang"), true);
  assert.strictEqual(matchJobSearch(dummyJob, "Kafka"), true);
  assert.strictEqual(matchJobSearch(dummyJob, "Razorpay"), true);

  // Disjunctive search: "DevOps and SRE roles" or "Backend or Mobile"
  assert.strictEqual(matchJobSearch(dummyJob, "Backend or Mobile"), true);
  assert.strictEqual(matchJobSearch(dummyJob, "iOS Developer"), false);
});

test("matchJobExperience - matches year bounds and category ranges", () => {
  assert.strictEqual(matchJobExperience(dummyJob, "All"), true);
  assert.strictEqual(matchJobExperience(dummyJob, "3-5 yrs"), true);
  assert.strictEqual(matchJobExperience(dummyJob, "Fresher / 0-1 yr"), false);
});

test("matchJobCity - matches Indian tech hubs and aliases", () => {
  assert.strictEqual(matchJobCity(dummyJob, "All"), true);
  assert.strictEqual(matchJobCity(dummyJob, "Bengaluru"), true);
  assert.strictEqual(matchJobCity(dummyJob, "Hyderabad"), false);

  const ncrJob = { ...dummyJob, location_raw: "Gurugram, Haryana", city: "Gurgaon" };
  assert.strictEqual(matchJobCity(ncrJob, "Delhi NCR"), true);

  const remoteJob = { ...dummyJob, work_mode: "remote" as const, city: "Remote" };
  assert.strictEqual(matchJobCity(remoteJob, "Remote"), true);
});

test("calculateRelevanceScore - transparent scoring breakdown", () => {
  const res = calculateRelevanceScore(dummyJob, "Backend", ["Golang", "Kafka"], "backend");
  assert.ok(res.score >= 80, `Expected score >= 80, got ${res.score}`);
  assert.ok(res.breakdown.some((b) => b.includes("Base Verified Engineering Match")));
  assert.ok(res.breakdown.some((b) => b.includes("Fresh in Last 24 Hours")));
  assert.ok(res.breakdown.some((b) => b.includes("Selected Skill")));
});

test("validateJobImportData - validates schema and detects duplicates", () => {
  // 1. Invalid payload: not array
  const invalidPayload = validateJobImportData({ not: "an array" });
  assert.strictEqual(invalidPayload.valid, false);
  assert.ok(invalidPayload.errors.length > 0);

  // 2. Valid payload with duplicate IDs
  const validPayload = [
    {
      id: "job-1",
      title: "Full Stack Engineer",
      company_name: "Swiggy",
      job_url: "https://careers.swiggy.com/1",
      pipelineTracking: { stage: "Applied", notes: "First interview passed" },
    },
    {
      id: "job-1", // duplicate
      title: "Duplicate Title",
      company_name: "Swiggy",
      job_url: "https://careers.swiggy.com/1",
    },
    {
      id: "job-2",
      title: "Frontend Architect",
      company_name: "Cred",
      job_url: "https://careers.cred.club/2",
      pipelineTracking: { stage: "Interview", notes: "=cmd|' /C calc'!A0" },
    },
    {
      // Missing title and company
      id: "job-bad",
    },
  ];

  const res = validateJobImportData(validPayload);
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.validJobs.length, 2); // job-1 and job-2
  assert.strictEqual(res.duplicateCount, 1);
  assert.strictEqual(res.trackingMap["job-1"].stage, "Applied");
  assert.strictEqual(res.trackingMap["job-2"].stage, "Interview");
  assert.ok(res.errors.length >= 1); // error for job-bad
});

test("URL Query Parameter Sanitization - prevents injection and respects allowlists", () => {
  const sanitizeQueryParam = (raw: string, maxLen = 100) => {
    return raw.slice(0, maxLen).replace(/[<>]/g, "").trim();
  };

  assert.strictEqual(sanitizeQueryParam("<script>alert(1)</script>"), "scriptalert(1)/script");
  assert.strictEqual(sanitizeQueryParam("Java Developer & SRE"), "Java Developer & SRE");
  assert.strictEqual(sanitizeQueryParam("Bengaluru, India"), "Bengaluru, India");

  const ALLOWED_ROLES = ["all", "backend", "frontend", "fullstack", "devops_sre"];
  const parseRole = (role: string) => (ALLOWED_ROLES.includes(role) ? role : "all");
  assert.strictEqual(parseRole("backend"), "backend");
  assert.strictEqual(parseRole("malicious_role"), "all");
});

test("normalizeJobUrl - fixes Workday redundant tenant and Eightfold search parameters", () => {
  // 1. Workday redundant tenant path stripping
  const brokenWorkday = "https://kyndryl.wd5.myworkdayjobs.com/en-US/kyndryl/KyndrylProfessionalCareers/job/Tokyo-Japan/Mod-AI-Engineer_R-71941-1";
  const fixedWorkday = normalizeJobUrl(brokenWorkday);
  assert.strictEqual(fixedWorkday, "https://kyndryl.wd5.myworkdayjobs.com/en-US/KyndrylProfessionalCareers/job/Tokyo-Japan/Mod-AI-Engineer_R-71941-1");

  // Already correct Workday URL remains intact
  const validWorkday = "https://cisco.wd5.myworkdayjobs.com/en-US/Cisco_Careers/job/San-Jose/Engineer_123";
  assert.strictEqual(normalizeJobUrl(validWorkday), validWorkday);

  // 2. Eightfold /careers?pid= -> /careers/job/ normalization
  const morganStanley = "https://morganstanley.eightfold.ai/careers?pid=549798643496";
  assert.strictEqual(normalizeJobUrl(morganStanley), "https://morganstanley.eightfold.ai/careers/job/549798643496");

  const qualcomm = "https://careers.qualcomm.com/careers?pid=446721561657&domain=qualcomm.com";
  assert.strictEqual(normalizeJobUrl(qualcomm), "https://careers.qualcomm.com/careers/job/446721561657?domain=qualcomm.com");

  // Invalid or unsafe protocols blocked
  assert.strictEqual(normalizeJobUrl("javascript:evil()"), "#");
  assert.strictEqual(normalizeJobUrl(null), "#");
});

test("matchJobSearch - multi-field location and tech synonym expansion", () => {
  const jobInPune: Job = {
    ...dummyJob,
    title: "Java Full Stack Developer",
    location_raw: "Pune, Maharashtra, India",
    city: "Pune",
    skills: ["Java", "Spring Boot", "React"],
  };

  // City token matching in search
  assert.strictEqual(matchJobSearch(jobInPune, "Pune"), true);
  assert.strictEqual(matchJobSearch(jobInPune, "Java Developer in Pune"), true);
  assert.strictEqual(matchJobSearch(jobInPune, "React Developer Pune"), true);

  // Synonym expansion: SRE matches DevOps / SRE role
  const sreJob: Job = {
    ...dummyJob,
    title: "Site Reliability Engineer II",
    role_label: "DevOps / SRE / Cloud",
    role_category: "devops_sre",
  };
  assert.strictEqual(matchJobSearch(sreJob, "DevOps"), true);
  assert.strictEqual(matchJobSearch(sreJob, "SRE"), true);
  assert.strictEqual(matchJobSearch(sreJob, "Cloud Engineer"), true);
});

test("matchJobExperience - matches entry-level and early career opportunities", () => {
  const fresherJob: Job = {
    ...dummyJob,
    title: "Software Engineer",
    experience_level: "Any Experience",
    min_years: null,
    max_years: null,
  };

  // Open / unconstrained experience positions match early career
  assert.strictEqual(matchJobExperience(fresherJob, "Fresher / 0-1 yr"), true);
  assert.strictEqual(matchJobExperience(fresherJob, "1-3 yrs"), true);

  // Senior positions do NOT match Fresher even if exp is open
  const seniorRole: Job = {
    ...dummyJob,
    title: "Staff Software Architect",
    experience_level: "Any Experience",
    min_years: null,
  };
  assert.strictEqual(matchJobExperience(seniorRole, "Fresher / 0-1 yr"), false);
  assert.strictEqual(matchJobExperience(seniorRole, "1-3 yrs"), false);
  assert.strictEqual(matchJobExperience(seniorRole, "5+ yrs"), true);
});

test("Multi-filter combination and toggle logic", () => {
  const sampleJobs: Job[] = [
    {
      ...dummyJob,
      id: "j1",
      title: "Backend Engineer (Go)",
      role_category: "backend",
      city: "Bengaluru",
      experience_level: "1-3 yrs",
      min_years: 1,
      max_years: 3,
      work_mode: "hybrid",
      skills: ["Go", "Kafka"],
    },
    {
      ...dummyJob,
      id: "j2",
      title: "Frontend Engineer (React)",
      role_category: "frontend",
      location_raw: "Hyderabad, Telangana, India",
      city: "Hyderabad",
      experience_level: "Fresher / 0-1 yr",
      min_years: 0,
      max_years: 0.5,
      work_mode: "remote",
      skills: ["React", "TypeScript"],
    },
    {
      ...dummyJob,
      id: "j3",
      title: "DevOps Engineer (AWS)",
      role_category: "devops_sre",
      location_raw: "Pune, Maharashtra, India",
      city: "Pune",
      experience_level: "3-5 yrs",
      min_years: 3,
      max_years: 5,
      work_mode: "onsite",
      skills: ["AWS", "Docker", "Kubernetes"],
    },
    {
      ...dummyJob,
      id: "j4",
      title: "Full Stack Engineer",
      role_category: "fullstack",
      city: "Bengaluru",
      experience_level: "1-3 yrs",
      min_years: 1,
      max_years: 3,
      work_mode: "remote",
      skills: ["Java", "React"],
    },
  ];

  // Helper evaluating multi-category AND, intra-category OR
  const filterDataset = (
    items: Job[],
    roles: string[],
    experienceLevels: string[],
    cities: string[],
    workModes: string[],
    skills: string[]
  ) => {
    return items.filter((j) => {
      if (roles.length > 0 && !roles.includes(j.role_category)) return false;
      if (experienceLevels.length > 0 && !experienceLevels.some((lvl) => matchJobExperience(j, lvl))) return false;
      if (cities.length > 0 && !cities.some((c) => matchJobCity(j, c))) return false;
      if (workModes.length > 0 && !workModes.includes(j.work_mode)) return false;
      if (skills.length > 0 && !skills.some((sk) => j.skills.some((js) => js.toLowerCase() === sk.toLowerCase()))) return false;
      return true;
    });
  };

  // 1. Multiple cities (Bengaluru OR Hyderabad)
  const resCities = filterDataset(sampleJobs, [], [], ["Bengaluru", "Hyderabad"], [], []);
  assert.strictEqual(resCities.length, 3); // j1, j2, j4

  // 2. Multi-category combination: (Bengaluru OR Hyderabad) AND (1-3 yrs)
  const resCombo1 = filterDataset(sampleJobs, [], ["1-3 yrs"], ["Bengaluru", "Hyderabad"], [], []);
  assert.strictEqual(resCombo1.length, 2); // j1 and j4

  // 3. Multi-skill combination: (Go OR React)
  const resSkills = filterDataset(sampleJobs, [], [], [], [], ["Go", "React"]);
  assert.strictEqual(resSkills.length, 3); // j1 (Go), j2 (React), j4 (React)

  // 4. Toggle behavior test:
  // Selecting "Bengaluru" then toggling it adds/removes it
  let activeCities = ["Bengaluru"];
  assert.strictEqual(filterDataset(sampleJobs, [], [], activeCities, [], []).length, 2); // j1, j4
  // Toggle on Hyderabad
  activeCities = [...activeCities, "Hyderabad"];
  assert.strictEqual(filterDataset(sampleJobs, [], [], activeCities, [], []).length, 3); // j1, j2, j4
  // Toggle OFF Bengaluru
  activeCities = activeCities.filter((c) => c !== "Bengaluru");
  assert.strictEqual(filterDataset(sampleJobs, [], [], activeCities, [], []).length, 1); // j2 (Hyderabad)
  // Toggle OFF Hyderabad -> empty (all return)
  activeCities = activeCities.filter((c) => c !== "Hyderabad");
  assert.strictEqual(filterDataset(sampleJobs, [], [], activeCities, [], []).length, 4); // All 4 jobs
});

