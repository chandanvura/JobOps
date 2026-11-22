export interface Job {
  id: string;
  external_id: string;
  company_id: string;
  company_name: string;
  ats_provider: string;
  title: string;
  job_url: string;
  is_engineering: boolean;
  role_category: string;
  role_label: string;
  location_raw: string;
  city: string;
  work_mode: "remote" | "hybrid" | "onsite" | "unknown";
  is_india: boolean;
  min_years: number | null;
  max_years: number | null;
  experience_level: string;
  skills: string[];
  posted_at: string | null;
  age_hours: number;
  is_fresh_24h: boolean;
  first_seen_at: string;
  last_seen_at: string;
  is_active: boolean;
  summary: string;
}

export interface FilterState {
  searchQuery: string;
  roles: string[];
  experienceLevels: string[];
  cities: string[];
  workModes: string[];
  freshOnly: boolean;
  selectedSkills: string[];
  // Backwards compatibility accessors for scalar reads
  roleCategory?: string;
  experienceLevel?: string;
  city?: string;
  workMode?: string;
}
