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
  const toggleSkill = (skill: string) => {
    setFilters((prev) => {
      const exists = prev.selectedSkills.includes(skill);
      return {
        ...prev,
        selectedSkills: exists
          ? prev.selectedSkills.filter((s) => s !== skill)
          : [...prev.selectedSkills, skill],
      };
    });
  };

  const filterContent = (
    <div className="space-y-5">
      {/* Header & Reset */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <h2 className="font-semibold text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span>Refine Radar</span>
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1 transition-colors px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Reset all filters to defaults"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset All</span>
          </button>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Close filters"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Freshness Gate Toggle (Strict 24h) */}
      <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 rounded-xl p-3.5 transition-colors">
        <label className="flex items-center justify-between cursor-pointer select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 dark:bg-blue-600 flex items-center justify-center text-white flex-shrink-0 shadow-sm shadow-blue-500/20">
              <Zap className="w-4 h-4 fill-white text-white" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                Last 24 Hours Only
              </span>
              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-mono">
                Strict 24h Freshness
              </span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={filters.freshOnly}
            onChange={(e) => setFilters((prev) => ({ ...prev, freshOnly: e.target.checked }))}
            className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
          />
        </label>
      </div>

      {/* Role Family (Engineering Disciplines) */}
      <div>
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5 text-slate-400" />
          <span>Discipline</span>
        </label>
        <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
          {ROLES.map((role) => {
            const count = role.id === "all" ? undefined : roleCounts[role.id];
            const isSelected = filters.roleCategory === role.id;
            return (
              <button
                key={role.id}
                onClick={() => setFilters((prev) => ({ ...prev, roleCategory: role.id }))}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                  isSelected
                    ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800/80 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100 font-normal"
                }`}
              >
                <span className="truncate">{role.label}</span>
                {count !== undefined && count > 0 && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                      isSelected
                        ? "bg-blue-600 text-white font-semibold"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
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
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Experience Level</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {EXPERIENCE_LEVELS.map((level) => {
            const isSelected = filters.experienceLevel === level;
            return (
              <button
                key={level}
                onClick={() => setFilters((prev) => ({ ...prev, experienceLevel: level }))}
                className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                  isSelected
                    ? "bg-blue-600 text-white border-blue-600 font-semibold shadow-sm"
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:text-slate-900 dark:hover:text-slate-100"
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
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          <span>Indian Tech Hub</span>
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {TECH_HUBS.map((city) => {
            const isSelected = filters.city === city;
            const count = city === "All" ? undefined : cityCounts[city];
            return (
              <button
                key={city}
                onClick={() => setFilters((prev) => ({ ...prev, city }))}
                className={`px-2 py-1.5 text-xs text-left truncate rounded-lg border transition-all flex items-center justify-between ${
                  isSelected
                    ? "bg-blue-600 border-blue-600 text-white font-semibold shadow-sm"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:border-blue-400 dark:hover:border-blue-500"
                }`}
              >
                <span className="truncate">{city}</span>
                {count !== undefined && count > 0 && (
                  <span className={`text-[10px] font-mono ml-1 ${isSelected ? "text-blue-100" : "text-slate-400"}`}>
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
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
          <Laptop className="w-3.5 h-3.5 text-slate-400" />
          <span>Work Mode</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {WORK_MODES.map((mode) => {
            const isSelected = filters.workMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setFilters((prev) => ({ ...prev, workMode: mode.id }))}
                className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                  isSelected
                    ? "bg-blue-600 text-white border-blue-600 font-semibold shadow-sm"
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-100 hover:border-blue-400 dark:hover:border-blue-500"
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
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-slate-400" />
          <span>Core Tech Stack</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {TOP_SKILLS.map((skill) => {
            const isSelected = filters.selectedSkills.includes(skill);
            return (
              <button
                key={skill}
                onClick={() => toggleSkill(skill)}
                className={`px-2 py-0.5 text-[11px] font-mono rounded border transition-all ${
                  isSelected
                    ? "bg-blue-600 text-white border-blue-600 font-semibold shadow-sm"
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 hover:border-blue-400 dark:hover:border-blue-500"
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
      <aside className="hidden lg:block w-72 flex-shrink-0 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-150">
        {filterContent}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {isMobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filter Jobs"
          className="fixed inset-0 z-50 lg:hidden flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="w-full max-w-xs sm:max-w-sm bg-white dark:bg-slate-900 h-full p-5 overflow-y-auto shadow-2xl border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">
            {filterContent}
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={onCloseMobile}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-sm"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
