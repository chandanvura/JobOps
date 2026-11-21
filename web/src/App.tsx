import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Job, FilterState } from "./types/job";
import { Navbar } from "./components/Navbar";
import { FilterSidebar } from "./components/FilterSidebar";
import { JobCard } from "./components/JobCard";
import { JobDetailModal } from "./components/JobDetailModal";
import { FetchTriggerModal } from "./components/FetchTriggerModal";
import { SavedJobsModal } from "./components/SavedJobsModal";
import { CompaniesPage, CompanyItem } from "./components/CompaniesPage";
import { KeyboardShortcutsModal } from "./components/KeyboardShortcutsModal";
import { ToastContainer, ToastMessage } from "./components/Toast";
import { useTheme } from "./hooks/useDarkMode";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Zap,
  AlertCircle,
  SlidersHorizontal,
  LayoutGrid,
  Rows3,
  ArrowUpDown,
  HelpCircle,
} from "lucide-react";
import { matchJobSearch, matchJobExperience, matchJobCity, calculateRelevanceScore, cleanJobText } from "./utils/jobUtils";

const ALLOWED_SORTS = [
  "newest",
  "relevance",
  "experience_asc",
  "experience_desc",
  "company_asc",
];

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
  const { themeMode, setThemeMode, isDark } = useTheme();
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

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
      const sort = ALLOWED_SORTS.includes(sp.get("sort") || "") ? sp.get("sort")! : "newest";
      const skillsParam = sp.get("skills");
      const skills = skillsParam
        ? skillsParam
            .split(",")
            .map((s) => s.trim().slice(0, 40).replace(/[<>]/g, ""))
            .filter(Boolean)
        : [];
      return { q, role, exp, city, mode, fresh, tab, page, jobId, sort, skills };
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
        sort: "newest",
        skills: [],
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
    selectedSkills: initialUrlParams.skills,
  });

  const [sortBy, setSortBy] = useState<string>(initialUrlParams.sort);
  const [density, setDensity] = useState<"comfortable" | "compact">(() => {
    try {
      return (localStorage.getItem("jobops_density") as "comfortable" | "compact") || "comfortable";
    } catch {
      return "comfortable";
    }
  });

  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((
    type: ToastMessage["type"],
    message: string,
    title?: string,
    action?: ToastMessage["action"]
  ) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, type, message, title, action }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Persist density preference
  useEffect(() => {
    try {
      localStorage.setItem("jobops_density", density);
    } catch {}
  }, [density]);

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

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      const isEditing =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      if (e.key === "Escape") {
        setIsFetchModalOpen(false);
        setIsSavedModalOpen(false);
        setSelectedJob(null);
        setIsMobileFilterOpen(false);
        setIsShortcutsModalOpen(false);
        return;
      }

      if (isEditing) return;

      if (e.key === "/") {
        e.preventDefault();
        if (currentTab !== "jobs") {
          setCurrentTab("jobs");
        }
        setTimeout(() => {
          document.getElementById("global-search-input")?.focus();
        }, 50);
      } else if (e.key === "?") {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
      } else if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        const nextTheme = themeMode === "light" ? "dark" : themeMode === "dark" ? "system" : "light";
        setThemeMode(nextTheme);
        addToast("info", `Theme switched to ${nextTheme.charAt(0).toUpperCase() + nextTheme.slice(1)} Mode`);
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        setIsSavedModalOpen(true);
      } else if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        setDensity((prev) => {
          const next = prev === "comfortable" ? "compact" : "comfortable";
          addToast("info", `Display density set to ${next}`);
          return next;
        });
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        setFilters((prev) => {
          const next = !prev.freshOnly;
          addToast("info", next ? "Filtered to Last 24 Hours only" : "All active positions displayed");
          return { ...prev, freshOnly: next };
        });
      } else if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        setIsFetchModalOpen(true);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [themeMode, setThemeMode, addToast, currentTab]);

  // Sync state back to URL parameters safely with complete dependency array
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
      if (filters.selectedSkills && filters.selectedSkills.length > 0) {
        params.set("skills", filters.selectedSkills.join(","));
      }
      if (sortBy !== "newest") {
        params.set("sort", sortBy);
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
  }, [currentTab, filters, sortBy, currentPage, selectedJob]);

  useEffect(() => {
    updateUrlState();
  }, [updateUrlState]);

  // Handle Browser Back & Forward Popstate Navigation
  useEffect(() => {
    const handlePopState = () => {
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
        const sort = ALLOWED_SORTS.includes(sp.get("sort") || "") ? sp.get("sort")! : "newest";
        const skillsParam = sp.get("skills");
        const skills = skillsParam
          ? skillsParam
              .split(",")
              .map((s) => s.trim().slice(0, 40).replace(/[<>]/g, ""))
              .filter(Boolean)
          : [];

        setCurrentTab(tab);
        setFilters({
          searchQuery: q,
          roleCategory: role,
          experienceLevel: exp,
          city,
          workMode: mode,
          freshOnly: fresh,
          selectedSkills: skills,
        });
        setSortBy(sort);
        setCurrentPage(page);
        if (jobId) {
          const matched = jobs.find((j) => j.id === jobId);
          if (matched) setSelectedJob(matched);
        } else {
          setSelectedJob(null);
        }
      } catch {}
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [jobs]);

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
            const res = await fetch(`${cleanBase}jobs.json?v=${Date.now()}`, { cache: "no-cache" });
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data) && data.length > 0) {
                loadedJobs = data;
              }
            }
          }

          if (!loadedCompanies) {
            const res = await fetch(`${cleanBase}companies.json?v=${Date.now()}`, { cache: "no-cache" });
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

      if (exists) {
        addToast("info", `Removed "${cleanJobText(job.title)}" from pipeline.`, undefined, {
          label: "Undo",
          onClick: () => {
            setSavedJobIds((current) => {
              const restored = [...current, job.id];
              try {
                localStorage.setItem("jobops_saved_ids", JSON.stringify(restored));
              } catch {}
              return restored;
            });
            addToast("success", `Restored "${cleanJobText(job.title)}" to pipeline.`);
          },
        });
      } else {
        addToast("success", `Saved "${cleanJobText(job.title)}" at ${job.company_name} to your pipeline.`, "Job Saved");
      }

      return next;
    });
  };

  const handleImportBackup = (importedJobs: Job[]) => {
    const newIds = importedJobs.map((j) => j.id);
    setSavedJobIds((prev) => {
      const merged = Array.from(new Set([...prev, ...newIds]));
      try {
        localStorage.setItem("jobops_saved_ids", JSON.stringify(merged));
      } catch {}
      return merged;
    });
    setJobs((prevJobs) => {
      const existingIds = new Set(prevJobs.map((j) => j.id));
      const missing = importedJobs.filter((j) => !existingIds.has(j.id));
      if (missing.length > 0) {
        return [...prevJobs, ...missing];
      }
      return prevJobs;
    });
    addToast("success", `Successfully imported ${importedJobs.length} jobs into your pipeline.`, "Backup Restored");
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
      if (!matchJobExperience(job, filters.experienceLevel)) return false;
      if (!matchJobCity(job, filters.city)) return false;
      if (filters.workMode !== "all" && job.work_mode !== filters.workMode) return false;

      if (filters.selectedSkills.length > 0) {
        const hasAll = filters.selectedSkills.every((sk) =>
          job.skills?.some((js) => js.toLowerCase() === sk.toLowerCase())
        );
        if (!hasAll) return false;
      }

      if (!matchJobSearch(job, filters.searchQuery)) return false;

      return true;
    });
  }, [jobs, filters]);

  // Main Sorting Logic
  const sortedJobs = useMemo(() => {
    const list = [...filteredJobs];
    if (sortBy === "relevance") {
      return list.sort((a, b) => {
        const scoreA = calculateRelevanceScore(a, filters.searchQuery, filters.selectedSkills, filters.roleCategory).score;
        const scoreB = calculateRelevanceScore(b, filters.searchQuery, filters.selectedSkills, filters.roleCategory).score;
        return scoreB - scoreA;
      });
    }
    if (sortBy === "company_asc") {
      return list.sort((a, b) => a.company_name.localeCompare(b.company_name));
    }
    if (sortBy === "experience_asc" || sortBy === "experience_desc") {
      const expWeight = (exp?: string) => {
        if (!exp || exp.includes("Fresher") || exp.includes("0-1")) return 1;
        if (exp.includes("1-3")) return 2;
        if (exp.includes("3-5")) return 3;
        if (exp.includes("5+")) return 4;
        return 2;
      };
      return list.sort((a, b) =>
        sortBy === "experience_asc"
          ? expWeight(a.experience_level) - expWeight(b.experience_level)
          : expWeight(b.experience_level) - expWeight(a.experience_level)
      );
    }
    // Default: newest first
    return list.sort((a, b) => {
      if (a.is_fresh_24h && !b.is_fresh_24h) return -1;
      if (!a.is_fresh_24h && b.is_fresh_24h) return 1;
      return (a.age_hours ?? 9999) - (b.age_hours ?? 9999);
    });
  }, [filteredJobs, sortBy, filters.searchQuery, filters.selectedSkills, filters.roleCategory]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortBy]);

  const totalPages = Math.ceil(sortedJobs.length / pageSize) || 1;
  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedJobs.slice(start, start + pageSize);
  }, [sortedJobs, currentPage]);

  const savedJobs = useMemo(() => {
    return jobs.filter((j) => savedJobIds.includes(j.id));
  }, [jobs, savedJobIds]);

  // Genuine network refresh of the active jobs dataset from GitHub Pages edge cache
  const triggerLiveRefresh = async () => {
    setIsFetching(true);
    try {
      const candidatePaths = [
        import.meta.env.BASE_URL || "./",
        "./",
        "/JobOps/",
        "/",
      ];
      let refreshed = false;
      for (const basePath of candidatePaths) {
        const cleanBase = basePath.endsWith("/") ? basePath : `${basePath}/`;
        try {
          const res = await fetch(`${cleanBase}jobs.json?t=${Date.now()}`, {
            cache: "no-store",
            headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              setJobs(data);
              try {
                sessionStorage.setItem("jobops_cached_jobs", JSON.stringify(data));
              } catch {}
              addToast("success", `Catalog synchronized! Loaded ${data.length.toLocaleString()} active positions.`);
              refreshed = true;
              break;
            }
          }
        } catch {
          continue;
        }
      }
      if (!refreshed) {
        addToast("error", "Could not synchronize catalog from edge cache. Please reload the page.");
      }
    } catch (err: any) {
      addToast("error", "Failed to fetch updated catalog from edge cache.");
    } finally {
      setIsFetching(false);
      setIsFetchModalOpen(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-brand-bg text-brand-text transition-colors">
      {/* Accessible Skip-to-Content Link for Keyboard Users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 px-4 py-2 bg-brand-primary text-white rounded-xl text-xs font-semibold shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to main content
      </a>

      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        searchQuery={filters.searchQuery}
        setSearchQuery={(q) => setFilters((prev) => ({ ...prev, searchQuery: q }))}
        freshCount={freshCount}
        totalCount={jobs.length}
        savedCount={savedJobIds.length}
        companiesCount={companies.length}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        onOpenFetchModal={() => setIsFetchModalOpen(true)}
        onOpenSavedModal={() => setIsSavedModalOpen(true)}
        onOpenAddModal={() => setIsFetchModalOpen(true)}
        onToggleMobileFilter={() => setIsMobileFilterOpen(true)}
      />

      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
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
            {/* Hero Heading Banner (Capped at 680px, Left-to-Right Hero Text Gradient) */}
            <div className="mb-6 max-w-[680px]">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-black to-[#666666] dark:from-white dark:to-[#9B9B9B] bg-clip-text text-transparent leading-[1.18] mb-2">
                Direct ATS engineering intelligence radar
              </h1>
              <p className="text-xs sm:text-sm text-brand-secondary leading-relaxed">
                Ingests verified engineering positions directly from employer career portals with a strict 24-hour freshness cycle. Zero third-party recruiter spam.
              </p>
            </div>

            {/* Mobile Search & Filter Action Bar */}
            <div className="mb-4 lg:hidden flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                <input
                  type="text"
                  placeholder="Search title, company, skills..."
                  value={filters.searchQuery}
                  onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-brand-surface border border-brand-border rounded-xl focus:outline-none focus:border-brand-primary shadow-sm text-brand-text placeholder:text-brand-muted min-h-[44px]"
                />
              </div>
              <button
                onClick={() => setIsMobileFilterOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-brand-surface border border-brand-border text-brand-text hover:bg-brand-elevated active:scale-[0.98] transition-colors text-xs font-semibold shadow-sm min-h-[44px] min-w-[44px] justify-center"
                aria-label="Open filter drawer"
              >
                <SlidersHorizontal className="w-4 h-4 text-brand-primary" />
                <span className="hidden sm:inline">Filters</span>
              </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-start">
              <FilterSidebar
                filters={filters}
                setFilters={setFilters}
                roleCounts={roleCounts}
                cityCounts={cityCounts}
                onReset={resetFilters}
                isMobileOpen={isMobileFilterOpen}
                onCloseMobile={() => setIsMobileFilterOpen(false)}
              />

              <section className="flex-1 w-full min-w-0">
                {/* Results Header Bar */}
                <div className="bg-brand-surface p-4 rounded-2xl border border-brand-border mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm transition-colors">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm sm:text-base font-bold text-brand-text tabular-nums">
                      {filteredJobs.length.toLocaleString()} openings verified
                    </span>
                    {filters.freshOnly && (
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-brand-primary border border-blue-500/20">
                        <Zap className="w-3 h-3 text-brand-primary fill-brand-primary" />
                        <span>24h fresh</span>
                      </span>
                    )}
                    {filters.searchQuery && (
                      <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-brand-elevated text-brand-text border border-brand-border">
                        &ldquo;{filters.searchQuery}&rdquo;
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    {/* Sort Dropdown */}
                    <div className="flex items-center gap-1.5 bg-brand-elevated border border-brand-border rounded-xl px-2.5 py-1 text-brand-text">
                      <ArrowUpDown className="w-3.5 h-3.5 text-brand-secondary" />
                      <label htmlFor="sort-select" className="sr-only">Sort jobs by</label>
                      <select
                        id="sort-select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-transparent border-none text-brand-text font-medium text-xs focus:outline-none cursor-pointer pr-1"
                      >
                        <option value="newest" className="bg-brand-surface text-brand-text">Newest verified</option>
                        <option value="relevance" className="bg-brand-surface text-brand-text">Most relevant</option>
                        <option value="experience_asc" className="bg-brand-surface text-brand-text">Experience (low to high)</option>
                        <option value="experience_desc" className="bg-brand-surface text-brand-text">Experience (high to low)</option>
                        <option value="company_asc" className="bg-brand-surface text-brand-text">Company (A to Z)</option>
                      </select>
                    </div>

                    {/* Freshness Toggle */}
                    <button
                      onClick={() => setFilters((prev) => ({ ...prev, freshOnly: !prev.freshOnly }))}
                      className={`px-3 py-1.5 rounded-xl border font-semibold transition-all min-h-[36px] active:scale-[0.98] ${
                        filters.freshOnly
                          ? "bg-brand-primary text-white border-brand-hover shadow-sm"
                          : "bg-brand-elevated text-brand-secondary border-brand-border hover:text-brand-text hover:border-brand-primary/40"
                      }`}
                    >
                      ⚡ 24h ({freshCount})
                    </button>

                    {/* Density Toggle */}
                    <button
                      onClick={() => setDensity((d) => (d === "comfortable" ? "compact" : "comfortable"))}
                      className="p-2 rounded-xl border border-brand-border bg-brand-elevated hover:bg-brand-surface text-brand-secondary hover:text-brand-text active:scale-[0.98] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title={density === "comfortable" ? "Switch to compact density (D)" : "Switch to comfortable density (D)"}
                      aria-label={density === "comfortable" ? "Switch to compact density" : "Switch to comfortable density"}
                    >
                      {density === "comfortable" ? <Rows3 className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
                    </button>

                    {/* Shortcuts Modal Trigger */}
                    <button
                      onClick={() => setIsShortcutsModalOpen(true)}
                      className="p-2 rounded-xl border border-brand-border bg-brand-elevated hover:bg-brand-surface text-brand-secondary hover:text-brand-text active:scale-[0.98] transition-colors min-h-[36px] min-w-[36px] hidden sm:flex items-center justify-center"
                      title="Keyboard shortcuts (?)"
                      aria-label="Keyboard shortcuts"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className={`grid grid-cols-1 ${density === "compact" ? "md:grid-cols-2 lg:grid-cols-3 gap-3" : "md:grid-cols-2 gap-4"}`}>
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="bg-brand-surface p-5 rounded-2xl border border-brand-border animate-pulse flex flex-col justify-between h-52">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-brand-elevated" />
                            <div className="space-y-1.5 flex-1">
                              <div className="h-3.5 bg-brand-elevated rounded w-1/3" />
                              <div className="h-2.5 bg-brand-elevated rounded w-1/4" />
                            </div>
                          </div>
                          <div className="h-4 bg-brand-elevated rounded w-3/4" />
                          <div className="flex gap-2">
                            <div className="h-5 bg-brand-elevated rounded-md w-16" />
                            <div className="h-5 bg-brand-elevated rounded-md w-20" />
                          </div>
                        </div>
                        <div className="pt-3 border-t border-brand-border flex justify-between items-center">
                          <div className="h-3 bg-brand-elevated rounded w-16" />
                          <div className="h-7 bg-brand-elevated rounded-xl w-24" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredJobs.length === 0 ? (
                  <div className="bg-brand-surface rounded-2xl border border-brand-border p-12 text-center shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-brand-elevated mx-auto flex items-center justify-center text-brand-muted mb-3">
                      <Filter className="w-5 h-5 text-brand-primary" />
                    </div>
                    <h3 className="text-base font-semibold text-brand-text">No matching positions found</h3>
                    <p className="text-xs text-brand-secondary mt-1.5 max-w-sm mx-auto leading-relaxed">
                      Try clearing some filters or searching for broader skills like Python, Go, React, or Kubernetes.
                    </p>
                    <button
                      onClick={resetFilters}
                      className="mt-4 px-4 py-2 bg-brand-primary hover:bg-brand-hover text-white rounded-xl text-xs font-semibold active:scale-[0.98] transition-colors shadow-sm"
                    >
                      Reset all filters
                    </button>
                  </div>
                ) : (
                  <>
                    <div className={`grid grid-cols-1 ${density === "compact" ? "md:grid-cols-2 lg:grid-cols-3 gap-3" : "md:grid-cols-2 gap-4"}`}>
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
                          density={density}
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

      {/* Precision Engineered Footer */}
      <footer className="mt-auto border-t border-brand-border bg-brand-surface/60 backdrop-blur-sm transition-colors py-8 text-xs text-brand-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-bold tracking-tight text-brand-text">
              Job<span className="text-brand-primary">Ops</span>
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-brand-elevated border border-brand-border text-brand-secondary tabular-nums">
              v1.4.0
            </span>
            <span className="text-brand-muted">•</span>
            <span className="text-brand-secondary">
              Direct ATS engineering radar
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <button
              onClick={() => setIsShortcutsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-elevated border border-brand-border hover:text-brand-text active:scale-[0.98] transition-colors font-mono text-xs"
            >
              <span>Press</span>
              <kbd className="px-1.5 py-0.5 rounded bg-brand-surface border border-brand-border font-bold">?</kbd>
              <span>for shortcuts</span>
            </button>
            <a
              href="https://github.com/chandanvura/JobOps"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand-text transition-colors"
            >
              Source code
            </a>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="hover:text-brand-text transition-colors"
            >
              Back to top ↑
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-3 pt-3 border-t border-brand-border/40 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-brand-muted">
          <span>Zero third-party trackers • 100% client-side pipeline storage • Direct career portals only</span>
          <span>MIT Licensed & Open Source</span>
        </div>
      </footer>

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
        onRemove={(id) => {
          const removedJob = jobs.find((j) => j.id === id);
          setSavedJobIds((prev) => {
            const next = prev.filter((item) => item !== id);
            try {
              localStorage.setItem("jobops_saved_ids", JSON.stringify(next));
            } catch {}
            return next;
          });
          if (removedJob) {
            addToast("info", `Removed "${cleanJobText(removedJob.title)}" from pipeline.`, undefined, {
              label: "Undo",
              onClick: () => {
                setSavedJobIds((current) => {
                  const restored = [...current, id];
                  try {
                    localStorage.setItem("jobops_saved_ids", JSON.stringify(restored));
                  } catch {}
                  return restored;
                });
                addToast("success", `Restored "${cleanJobText(removedJob.title)}".`);
              },
            });
          }
        }}
        onImportBackup={handleImportBackup}
      />

      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default App;
