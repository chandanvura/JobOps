import React, { useState, useEffect, useMemo } from "react";
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

export const App: React.FC = () => {
  const { isDark, toggleDarkMode } = useDarkMode();
  const [currentTab, setCurrentTab] = useState<"jobs" | "companies">("jobs");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    searchQuery: "",
    roleCategory: "all",
    experienceLevel: "All",
    city: "All",
    workMode: "all",
    freshOnly: false,
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

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 24;

  // Resilient multi-source data fetcher for GitHub Pages and local setups
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      // Candidates for jobs.json and companies.json
      const candidatePaths = [
        "./", // Relative path (works for subpath like /JobOps/)
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
      } else {
        setError("Could not load jobs catalog. Check connection or reload.");
      }

      if (loadedCompanies) {
        setCompanies(loadedCompanies);
      }

      setLoading(false);
    };

    loadData();
  }, []);

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
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
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
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 flex items-center gap-3 text-xs">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-bold">Catalog loading notice</p>
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
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by title, company, or skills..."
                  value={filters.searchQuery}
                  onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 shadow-sm"
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
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {filteredJobs.length.toLocaleString()} Jobs Found
                    </span>
                    {filters.freshOnly && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <Zap className="w-3 h-3 fill-emerald-600 text-emerald-600 dark:text-emerald-400" />
                        <span>24h Ultra-Fresh</span>
                      </span>
                    )}
                    {filters.searchQuery && (
                      <span className="text-xs px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800">
                        &ldquo;{filters.searchQuery}&rdquo;
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <button
                      onClick={() => setFilters((prev) => ({ ...prev, freshOnly: !prev.freshOnly }))}
                      className={`px-3 py-1.5 rounded-lg border font-semibold transition-all ${
                        filters.freshOnly
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      ⚡ Last 24 Hours ({freshCount})
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 animate-pulse h-48" />
                    ))}
                  </div>
                ) : filteredJobs.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center text-slate-400 mb-3">
                      <Filter className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">No matching jobs found</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                      Try clearing some filters or searching for broader terms like &ldquo;Python&rdquo; or &ldquo;Software&rdquo;.
                    </p>
                    <button
                      onClick={resetFilters}
                      className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors"
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
                        />
                      ))}
                    </div>

                    {totalPages > 1 && (
                      <div className="mt-8 flex items-center justify-center gap-2">
                        <button
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 px-3">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
