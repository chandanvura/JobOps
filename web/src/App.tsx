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
import { runViewTransition } from "./utils/viewTransition";
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

  // Parse Initial URL State supporting multi-select and legacy params
  const initialUrlParams = useMemo(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const q = (sp.get("q") || "").slice(0, 100).replace(/[<>]/g, "");

      // Multi-roles or legacy singular role
      const rawRoles = sp.get("roles") || sp.get("role") || "";
      const roles = rawRoles
        .split(",")
        .map((r) => r.trim())
        .filter((r) => ALLOWED_ROLES.includes(r) && r !== "all");

      // Multi-experience or legacy singular exp
      const rawExp = sp.get("exp") || sp.get("experience") || "";
      const expList = rawExp
        .split(",")
        .map((e) => e.trim())
        .filter((e) => ALLOWED_EXPERIENCES.includes(e) && e !== "All");

      // Multi-cities or legacy singular city
      const rawCities = sp.get("cities") || sp.get("city") || "";
      const cities = rawCities
        .split(",")
        .map((c) => c.trim().slice(0, 40).replace(/[<>]/g, ""))
        .filter((c) => c && c !== "All");

      // Multi-modes or legacy singular mode
      const rawModes = sp.get("modes") || sp.get("mode") || "";
      const modes = rawModes
        .split(",")
        .map((m) => m.trim().toLowerCase())
        .filter((m) => ALLOWED_MODES.includes(m) && m !== "all");

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
      return { q, roles, expList, cities, modes, fresh, tab, page, jobId, sort, skills };
    } catch {
      return {
        q: "",
        roles: [],
        expList: [],
        cities: [],
        modes: [],
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
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    searchQuery: initialUrlParams.q,
    roles: initialUrlParams.roles,
    experienceLevels: initialUrlParams.expList,
    cities: initialUrlParams.cities,
    workModes: initialUrlParams.modes,
    freshOnly: initialUrlParams.fresh,
    selectedSkills: initialUrlParams.skills,
    // backwards-compatibility scalar fallbacks
    roleCategory: initialUrlParams.roles.length === 1 ? initialUrlParams.roles[0] : "all",
    experienceLevel: initialUrlParams.expList.length === 1 ? initialUrlParams.expList[0] : "All",
    city: initialUrlParams.cities.length === 1 ? initialUrlParams.cities[0] : "All",
    workMode: initialUrlParams.modes.length === 1 ? initialUrlParams.modes[0] : "all",
  });

  const [sortBy, setSortBy] = useState<string>(initialUrlParams.sort);
  const [searchInput, setSearchInput] = useState<string>(initialUrlParams.q);

  // Debounce search input to filter state and URL synchronization (150ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setFilters((prev) => {
        if (prev.searchQuery === searchInput) return prev;
        return { ...prev, searchQuery: searchInput };
      });
    }, 150);
    return () => clearTimeout(handler);
  }, [searchInput]);

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
      if (filters.roles && filters.roles.length > 0) {
        params.set("roles", filters.roles.join(","));
      } else if (filters.roleCategory && filters.roleCategory !== "all") {
        params.set("roles", filters.roleCategory);
      }

      if (filters.experienceLevels && filters.experienceLevels.length > 0) {
        params.set("exp", filters.experienceLevels.join(","));
      } else if (filters.experienceLevel && filters.experienceLevel !== "All") {
        params.set("exp", filters.experienceLevel);
      }

      if (filters.cities && filters.cities.length > 0) {
        params.set("cities", filters.cities.join(","));
      } else if (filters.city && filters.city !== "All") {
        params.set("cities", filters.city);
      }

      if (filters.workModes && filters.workModes.length > 0) {
        params.set("modes", filters.workModes.join(","));
      } else if (filters.workMode && filters.workMode !== "all") {
        params.set("modes", filters.workMode);
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

        const rawRoles = sp.get("roles") || sp.get("role") || "";
        const roles = rawRoles
          .split(",")
          .map((r) => r.trim())
          .filter((r) => ALLOWED_ROLES.includes(r) && r !== "all");

        const rawExp = sp.get("exp") || sp.get("experience") || "";
        const expList = rawExp
          .split(",")
          .map((e) => e.trim())
          .filter((e) => ALLOWED_EXPERIENCES.includes(e) && e !== "All");

        const rawCities = sp.get("cities") || sp.get("city") || "";
        const cities = rawCities
          .split(",")
          .map((c) => c.trim().slice(0, 40).replace(/[<>]/g, ""))
          .filter((c) => c && c !== "All");

        const rawModes = sp.get("modes") || sp.get("mode") || "";
        const modes = rawModes
          .split(",")
          .map((m) => m.trim().toLowerCase())
          .filter((m) => ALLOWED_MODES.includes(m) && m !== "all");

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
        setSearchInput(q);
        setFilters({
          searchQuery: q,
          roles,
          experienceLevels: expList,
          cities,
          workModes: modes,
          freshOnly: fresh,
          selectedSkills: skills,
          roleCategory: roles.length === 1 ? roles[0] : "all",
          experienceLevel: expList.length === 1 ? expList[0] : "All",
          city: cities.length === 1 ? cities[0] : "All",
          workMode: modes.length === 1 ? modes[0] : "all",
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
      let loadedTelemetryAt: string | null = null;

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

          if (!loadedTelemetryAt) {
            const res = await fetch(`${cleanBase}telemetry.json?v=${Date.now()}`, { cache: "no-cache" });
            if (res.ok) {
              const tData = await res.json();
              const ts = tData?.last_run?.finished_at || tData?.generated_at;
              if (typeof ts === "string") loadedTelemetryAt = ts;
            }
          }

          if (loadedJobs && loadedCompanies) break;
        } catch {
          continue;
        }
      }

      if (loadedTelemetryAt) {
        setLastSyncedAt(loadedTelemetryAt);
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
    setSearchInput("");
    setFilters({
      searchQuery: "",
      roles: [],
      experienceLevels: [],
      cities: [],
      workModes: [],
      freshOnly: false,
      selectedSkills: [],
      roleCategory: "all",
      experienceLevel: "All",
      city: "All",
      workMode: "all",
    });
    setCurrentPage(1);
  };

  const handleSelectCompanyFromDirectory = (companyName: string) => {
    setSearchInput(companyName);
    setFilters({
      searchQuery: companyName,
      roles: [],
      experienceLevels: [],
      cities: [],
      workModes: [],
      freshOnly: false,
      selectedSkills: [],
      roleCategory: "all",
      experienceLevel: "All",
      city: "All",
      workMode: "all",
    });
    setCurrentTab("jobs");
    setCurrentPage(1);
  };

  // Dynamic Category & Option Counts Aggregations
  // Dynamically computes available active jobs per category based on active jobs in the dataset
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
  // Combines intra-category multi-selections with OR, and inter-category filters with AND
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // 1. Freshness filter
      if (filters.freshOnly && !job.is_fresh_24h) return false;

      // 2. Roles / Disciplines (OR within category)
      const activeRoles = filters.roles && filters.roles.length > 0
        ? filters.roles
        : filters.roleCategory && filters.roleCategory !== "all"
        ? [filters.roleCategory]
        : [];
      if (activeRoles.length > 0 && !activeRoles.includes(job.role_category)) {
        return false;
      }

      // 3. Experience Levels (OR within category)
      const activeExp = filters.experienceLevels && filters.experienceLevels.length > 0
        ? filters.experienceLevels
        : filters.experienceLevel && filters.experienceLevel !== "All"
        ? [filters.experienceLevel]
        : [];
      if (activeExp.length > 0) {
        const matchesAnyExp = activeExp.some((lvl) => matchJobExperience(job, lvl));
        if (!matchesAnyExp) return false;
      }

      // 4. Cities / Hubs (OR within category)
      const activeCities = filters.cities && filters.cities.length > 0
        ? filters.cities
        : filters.city && filters.city !== "All"
        ? [filters.city]
        : [];
      if (activeCities.length > 0) {
        const matchesAnyCity = activeCities.some((c) => matchJobCity(job, c));
        if (!matchesAnyCity) return false;
      }

      // 5. Work Modes (OR within category)
      const activeModes = filters.workModes && filters.workModes.length > 0
        ? filters.workModes
        : filters.workMode && filters.workMode !== "all"
        ? [filters.workMode]
        : [];
      if (activeModes.length > 0 && !activeModes.includes(job.work_mode)) {
        return false;
      }

      // 6. Skills (OR within category: matches any of selected skills)
      if (filters.selectedSkills && filters.selectedSkills.length > 0) {
        const hasAnySkill = filters.selectedSkills.some((sk) =>
          job.skills?.some((js) => js.toLowerCase() === sk.toLowerCase())
        );
        if (!hasAnySkill) return false;
      }

      // 7. Search query matching across title, company, skills, summary, city
      if (!matchJobSearch(job, filters.searchQuery)) return false;

      return true;
    });
  }, [jobs, filters]);

  // Main Sorting Logic
  const sortedJobs = useMemo(() => {
    const list = [...filteredJobs];
    if (sortBy === "relevance") {
      const scoreMap = new Map<string, number>();
      for (const j of list) {
        scoreMap.set(j.id, calculateRelevanceScore(j, filters.searchQuery, filters.selectedSkills, filters.roleCategory).score);
      }
      return list.sort((a, b) => (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0));
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

  const savedJobIdSet = useMemo(() => new Set(savedJobIds), [savedJobIds]);

  const savedJobs = useMemo(() => {
    return jobs.filter((j) => savedJobIdSet.has(j.id));
  }, [jobs, savedJobIdSet]);

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

  const handleTabChange = useCallback((tab: "jobs" | "companies") => {
    if (tab === currentTab) return;
    runViewTransition(() => setCurrentTab(tab));
  }, [currentTab]);

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col bg-brand-bg text-brand-text transition-colors">
      {/* Scroll-Driven Reading Progress Hairline */}
      <div className="scroll-progress-bar" aria-hidden="true" />

      {/* Apple Silk Ambient Shader Effect */}
      <div className="apple-silk-shader" aria-hidden="true" />

      {/* Accessible Skip-to-Content Link for Keyboard Users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 px-4 py-2 bg-brand-primary text-white rounded-[12px] text-xs font-bold shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
      >
        Skip to main content
      </a>

      <Navbar
        currentTab={currentTab}
        setCurrentTab={handleTabChange}
        searchQuery={searchInput}
        setSearchQuery={setSearchInput}
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
            {/* Compact Architectural Masthead — opens directly into live workspace above the fold */}
            <div className="mb-5 sm:mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-brand-borderSubtle">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-brand-text leading-tight">
                  Direct ATS engineering radar
                </h1>
                <p className="text-xs sm:text-sm text-brand-secondary mt-1 max-w-2xl">
                  Verified engineering roles synced directly from {companies.length} employer career portals. Zero third-party recruiter spam.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 text-xs font-mono text-brand-secondary flex-shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 radar-beacon flex-shrink-0" aria-hidden="true" />
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Strict 24h cycle</span>
                {lastSyncedAt && (() => {
                  const diffMins = Math.max(0, Math.round((Date.now() - new Date(lastSyncedAt).getTime()) / 60000));
                  const label = diffMins < 60 ? `${diffMins}m ago` : `${Math.round(diffMins / 60)}h ago`;
                  return (
                    <>
                      <span className="text-brand-muted" aria-hidden="true">·</span>
                      <span className="text-brand-muted tabular-nums">synced {label}</span>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Mobile Search & Filter Action Bar */}
            <div className="mb-4 lg:hidden flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                <input
                  type="text"
                  placeholder="Search title, company, skills..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
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
                <div className="bg-brand-surface p-4 rounded-[20px] border border-brand-border mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm transition-colors">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm sm:text-base font-bold text-brand-text tabular-nums">
                      {filteredJobs.length.toLocaleString()} openings verified
                    </span>
                    {filters.freshOnly && (
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                        <Zap className="w-3 h-3 text-emerald-500 fill-emerald-500" />
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
                      className={`px-3 py-1.5 rounded-[12px] border font-semibold btn-tactile min-h-[36px] ${
                        filters.freshOnly
                          ? "bg-brand-primary text-white font-bold border-brand-hover shadow-sm"
                          : "bg-brand-elevated text-brand-secondary border-brand-border hover:text-brand-text hover:border-brand-primary/40"
                      }`}
                    >
                      ⚡ 24h ({freshCount})
                    </button>

                    {/* Density Toggle */}
                    <button
                      onClick={() => runViewTransition(() => setDensity((d) => (d === "comfortable" ? "compact" : "comfortable")))}
                      className="p-2 rounded-xl border border-brand-border bg-brand-elevated hover:bg-brand-surface text-brand-secondary hover:text-brand-text btn-tactile min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title={density === "comfortable" ? "Switch to compact density (D)" : "Switch to comfortable density (D)"}
                      aria-label={density === "comfortable" ? "Switch to compact density" : "Switch to comfortable density"}
                    >
                      {density === "comfortable" ? <Rows3 className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
                    </button>

                    {/* Shortcuts Modal Trigger */}
                    <button
                      onClick={() => setIsShortcutsModalOpen(true)}
                      className="p-2 rounded-xl border border-brand-border bg-brand-elevated hover:bg-brand-surface text-brand-secondary hover:text-brand-text btn-tactile min-h-[36px] min-w-[36px] hidden sm:flex items-center justify-center"
                      title="Keyboard shortcuts (?)"
                      aria-label="Keyboard shortcuts"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Active Filter Chips / Clear Bar */}
                {((filters.roles && filters.roles.length > 0) ||
                  (filters.experienceLevels && filters.experienceLevels.length > 0) ||
                  (filters.cities && filters.cities.length > 0) ||
                  (filters.workModes && filters.workModes.length > 0) ||
                  (filters.selectedSkills && filters.selectedSkills.length > 0) ||
                  filters.freshOnly ||
                  filters.searchQuery) && (
                  <div className="flex items-center gap-1.5 flex-wrap mb-4 px-1">
                    <span className="text-[11px] font-medium text-brand-muted mr-1">Active filters:</span>
                    {filters.roles?.map((r) => (
                      <span
                        key={r}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-brand-elevated text-brand-text border border-brand-border"
                      >
                        <span className="capitalize">{r.replace("_", " ")}</span>
                        <button
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              roles: prev.roles?.filter((item) => item !== r) || [],
                            }))
                          }
                          className="hover:text-brand-primary p-0.5 rounded-full ml-0.5"
                          aria-label={`Remove filter ${r}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {filters.experienceLevels?.map((exp) => (
                      <span
                        key={exp}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-brand-elevated text-brand-text border border-brand-border"
                      >
                        <span>{exp}</span>
                        <button
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              experienceLevels: prev.experienceLevels?.filter((item) => item !== exp) || [],
                            }))
                          }
                          className="hover:text-brand-primary p-0.5 rounded-full ml-0.5"
                          aria-label={`Remove filter ${exp}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {filters.cities?.map((city) => (
                      <span
                        key={city}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-brand-elevated text-brand-text border border-brand-border"
                      >
                        <span>{city}</span>
                        <button
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              cities: prev.cities?.filter((item) => item !== city) || [],
                            }))
                          }
                          className="hover:text-brand-primary p-0.5 rounded-full ml-0.5"
                          aria-label={`Remove filter ${city}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {filters.workModes?.map((mode) => (
                      <span
                        key={mode}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-brand-elevated text-brand-text border border-brand-border"
                      >
                        <span className="capitalize">{mode}</span>
                        <button
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              workModes: prev.workModes?.filter((item) => item !== mode) || [],
                            }))
                          }
                          className="hover:text-brand-primary p-0.5 rounded-full ml-0.5"
                          aria-label={`Remove filter ${mode}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {filters.selectedSkills?.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-brand-elevated text-brand-primary font-mono border border-brand-primary/30"
                      >
                        <span>{skill}</span>
                        <button
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              selectedSkills: prev.selectedSkills?.filter((item) => item !== skill) || [],
                            }))
                          }
                          className="hover:text-red-400 p-0.5 rounded-full ml-0.5"
                          aria-label={`Remove filter ${skill}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <button
                      onClick={resetFilters}
                      className="text-xs text-brand-primary hover:text-brand-hover font-medium underline underline-offset-2 ml-1"
                    >
                      Clear all
                    </button>
                  </div>
                )}

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
                      className="mt-4 px-4 py-2 bg-brand-primary hover:bg-brand-hover text-white rounded-[12px] text-xs font-bold btn-tactile shadow-sm"
                    >
                      Reset all filters
                    </button>
                  </div>
                ) : (
                  <>
                    <div className={`grid grid-cols-1 ${density === "compact" ? "md:grid-cols-2 lg:grid-cols-3 gap-3" : "md:grid-cols-2 gap-4"}`}>
                      {paginatedJobs.map((job, idx) => (
                        <JobCard
                          key={job.id}
                          job={job}
                          isSaved={savedJobIdSet.has(job.id)}
                          onToggleSave={toggleSaveJob}
                          onSelect={(j) => setSelectedJob(j)}
                          searchQuery={filters.searchQuery}
                          selectedSkills={filters.selectedSkills}
                          selectedRole={filters.roleCategory}
                          density={density}
                          index={idx}
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
