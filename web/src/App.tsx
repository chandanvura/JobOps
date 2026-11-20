import React, { useState, useEffect, useMemo } from "react";
import { Job, FilterState } from "./types/job";
import { Navbar } from "./components/Navbar";
import { FilterSidebar } from "./components/FilterSidebar";
import { JobCard } from "./components/JobCard";
import { JobDetailModal } from "./components/JobDetailModal";
import { FetchTriggerModal } from "./components/FetchTriggerModal";
import { SavedJobsModal } from "./components/SavedJobsModal";
import { Search, Sparkles, Filter, ChevronLeft, ChevronRight, Zap } from "lucide-react";

export const App: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
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

  useEffect(() => {
    fetch("/jobs.json")
      .then((res) => {
        if (!res.ok) throw new Error("Could not load jobs catalogue.");
        return res.json();
      })
      .then((data: Job[]) => {
        setJobs(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
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
      // 1. Freshness
      if (filters.freshOnly && !job.is_fresh_24h) return false;

      // 2. Role Category
      if (filters.roleCategory !== "all" && job.role_category !== filters.roleCategory) {
        return false;
      }

      // 3. Experience Level
      if (filters.experienceLevel !== "All" && job.experience_level !== filters.experienceLevel) {
        return false;
      }

      // 4. City Hub
      if (filters.city !== "All" && job.city !== filters.city) {
        return false;
      }

      // 5. Work Mode
      if (filters.workMode !== "all" && job.work_mode !== filters.workMode) {
        return false;
      }

      // 6. Selected Skills
      if (filters.selectedSkills.length > 0) {
        const hasAll = filters.selectedSkills.every((sk) =>
          job.skills?.some((js) => js.toLowerCase() === sk.toLowerCase())
        );
        if (!hasAll) return false;
      }

      // 7. Search Query
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

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Paginated Slices
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
    // Simulate real-time client poll
    setTimeout(() => {
      setIsFetching(false);
      setIsFetchModalOpen(false);
    }, 1800);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar
        searchQuery={filters.searchQuery}
        setSearchQuery={(q) => setFilters((prev) => ({ ...prev, searchQuery: q }))}
        freshCount={freshCount}
        totalCount={jobs.length}
        savedCount={savedJobIds.length}
        onOpenFetchModal={() => setIsFetchModalOpen(true)}
        onOpenSavedModal={() => setIsSavedModalOpen(true)}
        onOpenAddModal={() => setIsFetchModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
        {/* Mobile Search Bar */}
        <div className="mb-4 md:hidden">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, company, or skills..."
              value={filters.searchQuery}
              onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 shadow-sm"
            />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Sidebar */}
          <FilterSidebar
            filters={filters}
            setFilters={setFilters}
            roleCounts={roleCounts}
            cityCounts={cityCounts}
            onReset={resetFilters}
          />

          {/* Job Feed Grid */}
          <section className="flex-1 w-full min-w-0">
            {/* Top Bar: Results Count & Active Tags */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">
                  {filteredJobs.length.toLocaleString()} Jobs Found
                </span>
                {filters.freshOnly && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Zap className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                    <span>24h Ultra-Fresh</span>
                  </span>
                )}
              </div>

              {/* Quick Freshness Switch Pill */}
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, freshOnly: !prev.freshOnly }))}
                  className={`px-3 py-1.5 rounded-lg border font-semibold transition-all ${
                    filters.freshOnly
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  ⚡ Last 24 Hours ({freshCount})
                </button>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 animate-pulse h-48" />
                ))}
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center text-slate-400 mb-3">
                  <Filter className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">No matching jobs found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
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

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-600" />
                    </button>
                    <span className="text-xs font-bold text-slate-700 px-3">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>

      {/* Modals */}
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
