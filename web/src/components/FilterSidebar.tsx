import React from "react";
import { FilterState } from "../types/job";
import { Zap, Clock, Briefcase, MapPin, Laptop, Cpu, RotateCcw, X } from "lucide-react";

interface FilterSidebarProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  roleCounts: Record<string, number>;
  cityCounts: Record<string, number>;
  onReset: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const ROLES = [
  { id: "all", label: "All Disciplines" },
  { id: "backend", label: "Backend & Systems" },
  { id: "frontend", label: "Frontend & Web" },
  { id: "fullstack", label: "Full Stack Engineering" },
  { id: "devops_sre", label: "DevOps / SRE / Cloud" },
  { id: "ai_ml", label: "AI / ML / Data Science" },
  { id: "data_engineering", label: "Data Engineering" },
  { id: "mobile", label: "Mobile (iOS / Android)" },
  { id: "qa_sdet", label: "QA / SDET Automation" },
  { id: "security", label: "Security & SecOps" },
  { id: "systems_embedded", label: "Systems & Embedded" },
  { id: "software_general", label: "Core Software & Platform" },
];

const EXPERIENCE_LEVELS = [
  "All",
  "Fresher / 0-1 yr",
  "1-3 yrs",
  "3-5 yrs",
  "5+ yrs",
];

const TECH_HUBS = [
  "All",
  "Bengaluru",
  "Hyderabad",
  "Pune",
  "Delhi NCR",
  "Mumbai",
  "Chennai",
  "Remote",
];

const WORK_MODES = [
  { id: "all", label: "All Modes" },
  { id: "remote", label: "Remote Only" },
  { id: "hybrid", label: "Hybrid" },
  { id: "onsite", label: "In-Office / Onsite" },
];

const TOP_SKILLS = [
  "Python", "React", "Go", "Java", "TypeScript", "AWS", "Docker", "Kubernetes", "Node.js", "SQL", "Kafka", "PyTorch"
];

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  setFilters,
  roleCounts,
  cityCounts,
  onReset,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  // Lock background body scrolling when mobile filter drawer is open
  React.useEffect(() => {
    if (!isMobileOpen) return;
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isMobileOpen]);

  // Handle Escape key to dismiss mobile drawer
  React.useEffect(() => {
    if (!isMobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onCloseMobile) {
        onCloseMobile();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileOpen, onCloseMobile]);

  const toggleRole = (roleId: string) => {
    setFilters((prev) => {
      const currentRoles = prev.roles || (prev.roleCategory && prev.roleCategory !== "all" ? [prev.roleCategory] : []);
      if (roleId === "all") {
        return {
          ...prev,
          roles: [],
          roleCategory: "all",
        };
      }
      const exists = currentRoles.includes(roleId);
      const nextRoles = exists ? currentRoles.filter((r) => r !== roleId) : [...currentRoles, roleId];
      return {
        ...prev,
        roles: nextRoles,
        roleCategory: nextRoles.length === 1 ? nextRoles[0] : nextRoles.length === 0 ? "all" : nextRoles[0],
      };
    });
  };

  const toggleExperience = (level: string) => {
    setFilters((prev) => {
      const currentLevels = prev.experienceLevels || (prev.experienceLevel && prev.experienceLevel !== "All" ? [prev.experienceLevel] : []);
      if (level === "All") {
        return {
          ...prev,
          experienceLevels: [],
          experienceLevel: "All",
        };
      }
      const exists = currentLevels.includes(level);
      const nextLevels = exists ? currentLevels.filter((l) => l !== level) : [...currentLevels, level];
      return {
        ...prev,
        experienceLevels: nextLevels,
        experienceLevel: nextLevels.length === 1 ? nextLevels[0] : nextLevels.length === 0 ? "All" : nextLevels[0],
      };
    });
  };

  const toggleCity = (city: string) => {
    setFilters((prev) => {
      const currentCities = prev.cities || (prev.city && prev.city !== "All" ? [prev.city] : []);
      if (city === "All") {
        return {
          ...prev,
          cities: [],
          city: "All",
        };
      }
      const exists = currentCities.includes(city);
      const nextCities = exists ? currentCities.filter((c) => c !== city) : [...currentCities, city];
      return {
        ...prev,
        cities: nextCities,
        city: nextCities.length === 1 ? nextCities[0] : nextCities.length === 0 ? "All" : nextCities[0],
      };
    });
  };

  const toggleWorkMode = (modeId: string) => {
    setFilters((prev) => {
      const currentModes = prev.workModes || (prev.workMode && prev.workMode !== "all" ? [prev.workMode] : []);
      if (modeId === "all") {
        return {
          ...prev,
          workModes: [],
          workMode: "all",
        };
      }
      const exists = currentModes.includes(modeId);
      const nextModes = exists ? currentModes.filter((m) => m !== modeId) : [...currentModes, modeId];
      return {
        ...prev,
        workModes: nextModes,
        workMode: nextModes.length === 1 ? nextModes[0] : nextModes.length === 0 ? "all" : nextModes[0],
      };
    });
  };

  const toggleSkill = (skill: string) => {
    setFilters((prev) => {
      const currentSkills = prev.selectedSkills || [];
      const exists = currentSkills.includes(skill);
      return {
        ...prev,
        selectedSkills: exists
          ? currentSkills.filter((s) => s !== skill)
          : [...currentSkills, skill],
      };
    });
  };

  const filterContent = (
    <div className="space-y-5">
      {/* Header & Reset */}
      <div className="flex items-center justify-between pb-3 border-b border-brand-border">
        <h2 className="font-semibold text-xs uppercase tracking-wider text-brand-text flex items-center gap-2">
          <span>Refine radar</span>
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="text-xs text-brand-primary hover:text-brand-hover font-medium flex items-center gap-1 active:scale-[0.98] transition-colors px-2 py-1 rounded-md hover:bg-brand-elevated"
            title="Reset all filters to defaults"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset all</span>
          </button>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1 rounded-lg text-brand-muted hover:text-brand-text hover:bg-brand-elevated active:scale-[0.98]"
              aria-label="Close filters"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Freshness Gate Toggle (Strict 24h) */}
      <div className="bg-brand-elevated border border-brand-border rounded-xl p-3.5 transition-colors">
        <label className="flex items-center justify-between cursor-pointer select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand-primary flex items-center justify-center text-white flex-shrink-0 shadow-sm">
              <Zap className="w-4 h-4 fill-white text-white" />
            </div>
            <div>
              <span className="text-xs font-semibold text-brand-text block">
                Last 24 hours only
              </span>
              <span className="text-[11px] text-brand-primary font-mono">
                Strict 24h freshness
              </span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={filters.freshOnly}
            onChange={(e) => setFilters((prev) => ({ ...prev, freshOnly: e.target.checked }))}
            className="w-4 h-4 accent-brand-primary rounded cursor-pointer"
          />
        </label>
      </div>

      {/* Role Family (Engineering Disciplines) */}
      <div>
        <label className="text-xs font-semibold text-brand-secondary uppercase tracking-wider block mb-2 flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5 text-brand-muted" />
          <span>Discipline</span>
        </label>
        <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
          {ROLES.map((role) => {
            const count = role.id === "all" ? undefined : roleCounts[role.id];
            const isSelected =
              role.id === "all"
                ? !filters.roles || filters.roles.length === 0 || (filters.roles.length === 1 && filters.roles[0] === "all")
                : (filters.roles && filters.roles.includes(role.id)) || filters.roleCategory === role.id;
            return (
              <button
                key={role.id}
                onClick={() => toggleRole(role.id)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between active:scale-[0.98] transition-colors ${
                  isSelected
                    ? "bg-brand-elevated text-brand-primary font-semibold border border-brand-primary/40 shadow-sm"
                    : "text-brand-secondary hover:bg-brand-elevated hover:text-brand-text font-normal"
                }`}
              >
                <span className="truncate">{role.label}</span>
                {count !== undefined && count > 0 && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full tabular-nums ${
                      isSelected
                        ? "bg-brand-primary text-white font-semibold"
                        : "bg-brand-elevated text-brand-muted border border-brand-border"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Experience Level */}
      <div>
        <label className="text-xs font-semibold text-brand-secondary uppercase tracking-wider block mb-2 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-brand-muted" />
          <span>Experience level</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {EXPERIENCE_LEVELS.map((level) => {
            const isSelected =
              level === "All"
                ? !filters.experienceLevels || filters.experienceLevels.length === 0 || (filters.experienceLevels.length === 1 && filters.experienceLevels[0] === "All")
                : (filters.experienceLevels && filters.experienceLevels.includes(level)) || filters.experienceLevel === level;
            return (
              <button
                key={level}
                onClick={() => toggleExperience(level)}
                className={`px-2.5 py-1 text-xs rounded-full border active:scale-[0.98] transition-all ${
                  isSelected
                    ? "bg-brand-primary text-white border-brand-primary font-semibold shadow-sm"
                    : "bg-brand-surface text-brand-secondary border-brand-border hover:border-brand-primary/50 hover:text-brand-text"
                }`}
              >
                {level}
              </button>
            );
          })}
        </div>
      </div>

      {/* Indian Tech Hubs */}
      <div>
        <label className="text-xs font-semibold text-brand-secondary uppercase tracking-wider block mb-2 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-brand-muted" />
          <span>Locations & hubs</span>
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {TECH_HUBS.map((city) => {
            const isSelected =
              city === "All"
                ? !filters.cities || filters.cities.length === 0 || (filters.cities.length === 1 && filters.cities[0] === "All")
                : (filters.cities && filters.cities.includes(city)) || filters.city === city;
            const count = city === "All" ? undefined : cityCounts[city];
            return (
              <button
                key={city}
                onClick={() => toggleCity(city)}
                className={`px-2 py-1.5 text-xs text-left truncate rounded-lg border active:scale-[0.98] transition-all flex items-center justify-between ${
                  isSelected
                    ? "bg-brand-primary border-brand-primary text-white font-semibold shadow-sm"
                    : "bg-brand-surface border-brand-border text-brand-secondary hover:text-brand-text hover:border-brand-primary/50"
                }`}
              >
                <span className="truncate">{city}</span>
                {count !== undefined && count > 0 && (
                  <span className={`text-[10px] font-mono ml-1 tabular-nums ${isSelected ? "text-amber-100 dark:text-zinc-900" : "text-brand-muted"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Work Mode */}
      <div>
        <label className="text-xs font-semibold text-brand-secondary uppercase tracking-wider block mb-2 flex items-center gap-1.5">
          <Laptop className="w-3.5 h-3.5 text-brand-muted" />
          <span>Work mode</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {WORK_MODES.map((mode) => {
            const isSelected =
              mode.id === "all"
                ? !filters.workModes || filters.workModes.length === 0 || (filters.workModes.length === 1 && filters.workModes[0] === "all")
                : (filters.workModes && filters.workModes.includes(mode.id)) || filters.workMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => toggleWorkMode(mode.id)}
                className={`px-2.5 py-1 text-xs rounded-full border active:scale-[0.98] transition-all ${
                  isSelected
                    ? "bg-brand-primary text-white border-brand-primary font-semibold shadow-sm"
                    : "bg-brand-surface text-brand-secondary border-brand-border hover:text-brand-text hover:border-brand-primary/50"
                }`}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Core Tech Stack */}
      <div>
        <label className="text-xs font-semibold text-brand-secondary uppercase tracking-wider block mb-2 flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-brand-muted" />
          <span>Core tech stack</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {TOP_SKILLS.map((skill) => {
            const isSelected = filters.selectedSkills.includes(skill);
            return (
              <button
                key={skill}
                onClick={() => toggleSkill(skill)}
                className={`px-2 py-0.5 text-[11px] font-mono rounded border active:scale-[0.98] transition-all ${
                  isSelected
                    ? "bg-brand-primary text-white border-brand-primary font-semibold shadow-sm"
                    : "bg-brand-surface text-brand-secondary border-brand-border hover:bg-brand-elevated hover:text-brand-text hover:border-brand-primary/50"
                }`}
              >
                {skill}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-72 flex-shrink-0 bg-brand-surface p-5 rounded-2xl border border-brand-border shadow-sm transition-colors duration-300">
        {filterContent}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {isMobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filter jobs"
          onClick={(e) => {
            if (e.target === e.currentTarget && onCloseMobile) {
              onCloseMobile();
            }
          }}
          className="fixed inset-0 z-50 lg:hidden flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs sm:max-w-sm bg-brand-surface min-h-[100dvh] h-full p-5 overflow-y-auto shadow-2xl border-l border-brand-border animate-in slide-in-from-right duration-200 cursor-default"
          >
            {filterContent}
            <div className="mt-6 pt-4 border-t border-brand-border">
              <button
                onClick={onCloseMobile}
                className="w-full py-2.5 rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-semibold text-xs active:scale-[0.98] transition-colors shadow-sm"
              >
                Apply filters
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
