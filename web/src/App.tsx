import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Job, FilterState } from "./types/job";
import { Navbar } from "./components/Navbar";
import { FilterSidebar } from "./components/FilterSidebar";
import { JobCard } from "./components/JobCard";
import { JobDetailModal } from "./components/JobDetailModal";
import { FetchTriggerModal } from "./components/FetchTriggerModal";
import { SavedJobsModal } from "./components/SavedJobsModal";
import { CompaniesPage, CompanyItem } from "./components/CompaniesPage";
import { useDarkMode } from "./hooks/useDarkMode";
import { Search, Filter, ChevronLeft, ChevronRight, Zap, AlertCircle } from "lucide-react";

const ALLOWED_ROLES = [
  "all",
  "backend",
  "frontend",
  "fullstack",
  "devops_sre",
  "ai_ml",
  "data_engineering",
  "mobile",
  "qa_sdet",
  "security",
  "systems_embedded",
  "software_general",
];

const ALLOWED_EXPERIENCES = [
  "All",
  "Fresher / 0-1 yr",
  "1-3 yrs",
  "3-5 yrs",
  "5+ yrs",
];

const ALLOWED_MODES = ["all", "remote", "hybrid", "onsite"];

export const App: React.FC = () => {
  const { isDark, toggleDarkMode } = useDarkMode();

  // Parse Initial URL State
  const initialUrlParams = useMemo(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const q = (sp.get("q") || "").slice(0, 100).replace(/[<>]/g, "");
      const role = ALLOWED_ROLES.includes(sp.get("role") || "") ? sp.get("role")! : "all";
      const exp = ALLOWED_EXPERIENCES.includes(sp.get("exp") || "") ? sp.get("exp")! : "All";
      const city = (sp.get("city") || "All").slice(0, 40).replace(/[<>]/g, "");
      const mode = ALLOWED_MODES.includes(sp.get("mode") || "") ? sp.get("mode")! : "all";
      const fresh = sp.get("fresh") === "true" || sp.get("fresh") === "1";
      const tab: "jobs" | "companies" = sp.get("tab") === "companies" ? "companies" : "jobs";
      const page = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
      const jobId = sp.get("job") || null;
      return { q, role, exp, city, mode, fresh, tab, page, jobId };
    } catch {
      return {
        q: "",
        role: "all",
        exp: "All",
        city: "All",
        mode: "all",
        fresh: false,
        tab: "jobs" as const,
        page: 1,
        jobId: null,
      };
    }
  }, []);

  const [currentTab, setCurrentTab] = useState<"jobs" | "companies">(initialUrlParams.tab);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    searchQuery: initialUrlParams.q,
    roleCategory: initialUrlParams.role,
    experienceLevel: initialUrlParams.exp,
    city: initialUrlParams.city,
    workMode: initialUrlParams.mode,
    freshOnly: initialUrlParams.fresh,
    selectedSkills: [],
  });

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [savedJobIds, setSavedJobIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("jobops_saved_ids");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [isFetchModalOpen, setIsFetchModalOpen] = useState(false);
  const [isSavedModalOpen, setIsSavedModalOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [currentPage, setCurrentPage] = useState(initialUrlParams.page);
  const pageSize = 24;

  // Sync state back to URL parameters safely
  const updateUrlState = useCallback(() => {
    try {
      const params = new URLSearchParams();
      if (currentTab === "companies") {
        params.set("tab", "companies");
      }
      if (filters.searchQuery.trim()) {
        params.set("q", filters.searchQuery.trim());
      }
      if (filters.roleCategory !== "all") {
        params.set("role", filters.roleCategory);
      }
      if (filters.experienceLevel !== "All") {
        params.set("exp", filters.experienceLevel);
      }
      if (filters.city !== "All") {
        params.set("city", filters.city);
      }
      if (filters.workMode !== "all") {
        params.set("mode", filters.workMode);
      }
      if (filters.freshOnly) {
        params.set("fresh", "true");
      }
      if (currentPage > 1) {
        params.set("page", String(currentPage));
      }
      if (selectedJob) {
        params.set("job", selectedJob.id);
      }

      const queryString = params.toString();
      const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    } catch {}
  }, [currentTab, filters, currentPage, selectedJob]);

  useEffect(() => {
    updateUrlState();
  }, [updateUrlState]);

  // Fast Stale-While-Revalidate data loader with zero-latency hydration
  useEffect(() => {
    try {
      const cachedJobsStr = sessionStorage.getItem("jobops_cached_jobs");
      const cachedCosStr = sessionStorage.getItem("jobops_cached_companies");
      if (cachedJobsStr) {
        const parsed = JSON.parse(cachedJobsStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setJobs(parsed);
          setLoading(false);
        }
      }
      if (cachedCosStr) {
        const parsed = JSON.parse(cachedCosStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCompanies(parsed);
        }
      }
    } catch {}

    const loadData = async () => {
      const candidatePaths = [
        "./",
        import.meta.env.BASE_URL || "./",
        "/JobOps/",
        "/",
      ];

      let loadedJobs: Job[] | null = null;
      let loadedCompanies: CompanyItem[] | null = null;

      for (const basePath of candidatePaths) {
        const cleanBase = basePath.endsWith("/") ? basePath : `${basePath}/`;
        try {
          if (!loadedJobs) {
            const res = await fetch(`${cleanBase}jobs.json`);
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data) && data.length > 0) {
                loadedJobs = data;
              }
            }
          }

          if (!loadedCompanies) {
            const res = await fetch(`${cleanBase}companies.json`);
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data) && data.length > 0) {
                loadedCompanies = data;
              }
            }
          }

          if (loadedJobs && loadedCompanies) break;
        } catch {
          continue;
        }
      }

      if (loadedJobs) {
        setJobs(loadedJobs);
        try {
          sessionStorage.setItem("jobops_cached_jobs", JSON.stringify(loadedJobs));
        } catch {}

        // Check if a deep-linked job_id was in URL
        if (initialUrlParams.jobId) {
          const match = loadedJobs.find((j) => j.id === initialUrlParams.jobId);
          if (match) setSelectedJob(match);
        }
      } else if (!sessionStorage.getItem("jobops_cached_jobs")) {
        setError("Could not load jobs catalog. Check connection or reload.");
      }

      if (loadedCompanies) {
        setCompanies(loadedCompanies);
        try {
          sessionStorage.setItem("jobops_cached_companies", JSON.stringify(loadedCompanies));
        } catch {}
      }

      setLoading(false);
    };

    loadData();
  }, [initialUrlParams.jobId]);

  const toggleSaveJob = (job: Job) => {
    setSavedJobIds((prev) => {
      const exists = prev.includes(job.id);
      const next = exists ? prev.filter((id) => id !== job.id) : [...prev, job.id];
      try {
        localStorage.setItem("jobops_saved_ids", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const resetFilters = () => {
    setFilters({
      searchQuery: "",
      roleCategory: "all",
      experienceLevel: "All",
      city: "All",
      workMode: "all",
      freshOnly: false,
      selectedSkills: [],
    });
    setCurrentPage(1);
  };

  const handleSelectCompanyFromDirectory = (companyName: string) => {
    setFilters((prev) => ({
      ...prev,
      searchQuery: companyName,
      roleCategory: "all",
      city: "All",
      experienceLevel: "All",
      workMode: "all",
      freshOnly: false,
      selectedSkills: [],
    }));
    setCurrentTab("jobs");
    setCurrentPage(1);
  };

  // Role Counts & City Counts Aggregations
  const { roleCounts, cityCounts, freshCount } = useMemo(() => {
    const roles: Record<string, number> = {};
    const cities: Record<string, number> = {};
    let fresh = 0;

    for (const j of jobs) {
      if (j.is_fresh_24h) fresh++;
      roles[j.role_category] = (roles[j.role_category] || 0) + 1;
      if (j.city) {
        cities[j.city] = (cities[j.city] || 0) + 1;
      }
    }
    return { roleCounts: roles, cityCounts: cities, freshCount: fresh };
  }, [jobs]);

  // Main Filtering Logic
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (filters.freshOnly && !job.is_fresh_24h) return false;
      if (filters.roleCategory !== "all" && job.role_category !== filters.roleCategory) return false;
      if (filters.experienceLevel !== "All" && job.experience_level !== filters.experienceLevel) return false;
      if (filters.city !== "All" && job.city !== filters.city) return false;
      if (filters.workMode !== "all" && job.work_mode !== filters.workMode) return false;

      if (filters.selectedSkills.length > 0) {
        const hasAll = filters.selectedSkills.every((sk) =>
          job.skills?.some((js) => js.toLowerCase() === sk.toLowerCase())
        );
        if (!hasAll) return false;
      }

      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase().trim();
        const inTitle = job.title.toLowerCase().includes(q);
        const inCo = job.company_name.toLowerCase().includes(q);
        const inSkills = job.skills?.some((s) => s.toLowerCase().includes(q));
        if (!inTitle && !inCo && !inSkills) return false;
      }

      return true;
    });
  }, [jobs, filters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const totalPages = Math.ceil(filteredJobs.length / pageSize) || 1;
  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredJobs.slice(start, start + pageSize);
  }, [filteredJobs, currentPage]);

  const savedJobs = useMemo(() => {
    return jobs.filter((j) => savedJobIds.includes(j.id));
  }, [jobs, savedJobIds]);

  const triggerLiveRefresh = () => {
    setIsFetching(true);
    setTimeout(() => {
      setIsFetching(false);
      setIsFetchModalOpen(false);
    }, 1800);
  };

  return (
    <div className="min-h-screen flex flex-col bg-brand-bg text-brand-text transition-colors">
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        searchQuery={filters.searchQuery}
        setSearchQuery={(q) => setFilters((prev) => ({ ...prev, searchQuery: q }))}
        freshCount={freshCount}
        totalCount={jobs.length}
        savedCount={savedJobIds.length}
        companiesCount={companies.length}
        isDark={isDark}
        toggleDarkMode={toggleDarkMode}
        onOpenFetchModal={() => setIsFetchModalOpen(true)}
        onOpenSavedModal={() => setIsSavedModalOpen(true)}
        onOpenAddModal={() => setIsFetchModalOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center gap-3 text-xs">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-bold">Catalog Notice</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {currentTab === "companies" ? (
          <CompaniesPage
            companies={companies}
            onSelectCompany={handleSelectCompanyFromDirectory}
            onOpenAddModal={() => setIsFetchModalOpen(true)}
          />
        ) : (
          <>
            {/* Mobile Search Bar */}
            <div className="mb-4 md:hidden">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                <input
                  type="text"
                  placeholder="Search by title, company, or skills..."
                  value={filters.searchQuery}
                  onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-brand-surface border border-brand-border rounded-xl focus:outline-none focus:border-brand-primary shadow-sm text-brand-text placeholder:text-brand-muted"
                />
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-start">
              <FilterSidebar
                filters={filters}
                setFilters={setFilters}
                roleCounts={roleCounts}
                cityCounts={cityCounts}
                onReset={resetFilters}
              />

              <section className="flex-1 w-full min-w-0">
                {/* Results Header Bar */}
                <div className="bg-brand-surface p-4 rounded-2xl border border-brand-border mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm transition-colors">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm sm:text-base font-bold text-brand-text">
                      {filteredJobs.length.toLocaleString()} Openings Verified
                    </span>
                    {filters.freshOnly && (
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-accent text-brand-text border border-brand-primary/40">
                        <Zap className="w-3 h-3 text-brand-primary fill-brand-primary" />
                        <span>24h Ultra-Fresh</span>
                      </span>
                    )}
                    {filters.searchQuery && (
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-brand-elevated text-brand-text border border-brand-border">
                        &ldquo;{filters.searchQuery}&rdquo;
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <button
                      onClick={() => setFilters((prev) => ({ ...prev, freshOnly: !prev.freshOnly }))}
                      className={`px-3 py-1.5 rounded-xl border font-semibold transition-all ${
                        filters.freshOnly
                          ? "bg-brand-primary text-white border-brand-primary shadow-sm"
                          : "bg-brand-elevated text-brand-secondary border-brand-border hover:text-brand-text hover:border-brand-primary/40"
                      }`}
                    >
                      ⚡ Last 24 Hours ({freshCount})
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="bg-brand-surface p-6 rounded-2xl border border-brand-border animate-pulse h-48" />
                    ))}
                  </div>
                ) : filteredJobs.length === 0 ? (
                  <div className="bg-brand-surface rounded-3xl border border-brand-border p-12 text-center shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-brand-elevated mx-auto flex items-center justify-center text-brand-muted mb-3">
                      <Filter className="w-6 h-6" />
                    </div>
                    <h3 className="font-serif text-lg font-bold text-brand-text">No matching positions found</h3>
                    <p className="text-xs text-brand-secondary mt-1.5 max-w-sm mx-auto">
                      Try clearing some filters or searching for broader skills like &ldquo;Python&rdquo;, &ldquo;Go&rdquo;, &ldquo;React&rdquo;, or &ldquo;Kubernetes&rdquo;.
                    </p>
                    <button
                      onClick={resetFilters}
                      className="mt-4 px-4 py-2 bg-brand-primary hover:bg-brand-hover text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
                    >
                      Reset All Filters
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {paginatedJobs.map((job) => (
                        <JobCard
                          key={job.id}
                          job={job}
                          isSaved={savedJobIds.includes(job.id)}
                          onToggleSave={toggleSaveJob}
                          onSelect={(j) => setSelectedJob(j)}
                          searchQuery={filters.searchQuery}
                          selectedSkills={filters.selectedSkills}
                          selectedRole={filters.roleCategory}
                        />
                      ))}
                    </div>

                    {totalPages > 1 && (
                      <div className="mt-8 flex items-center justify-center gap-2">
                        <button
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="p-2 rounded-xl border border-brand-border bg-brand-surface hover:bg-brand-elevated text-brand-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          aria-label="Previous page"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-mono font-medium text-brand-secondary px-3">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="p-2 rounded-xl border border-brand-border bg-brand-surface hover:bg-brand-elevated text-brand-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          aria-label="Next page"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </section>
            </div>
          </>
        )}
      </main>

      <JobDetailModal
        job={selectedJob}
        isOpen={selectedJob !== null}
        onClose={() => setSelectedJob(null)}
        isSaved={selectedJob ? savedJobIds.includes(selectedJob.id) : false}
        onToggleSave={toggleSaveJob}
      />

      <FetchTriggerModal
        isOpen={isFetchModalOpen}
        onClose={() => setIsFetchModalOpen(false)}
        onTriggerRefresh={triggerLiveRefresh}
        isFetching={isFetching}
      />

      <SavedJobsModal
        isOpen={isSavedModalOpen}
        onClose={() => setIsSavedModalOpen(false)}
        savedJobs={savedJobs}
        onRemove={(id) => setSavedJobIds((prev) => prev.filter((item) => item !== id))}
      />
    </div>
  );
};

export default App;
