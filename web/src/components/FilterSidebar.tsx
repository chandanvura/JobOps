import React from "react";
import { FilterState } from "../types/job";
import { Zap, Clock, Briefcase, MapPin, Laptop, Cpu, RotateCcw } from "lucide-react";

interface FilterSidebarProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  roleCounts: Record<string, number>;
  cityCounts: Record<string, number>;
  onReset: () => void;
}

const ROLES = [
  { id: "all", label: "All Engineering Roles" },
  { id: "backend", label: "Backend Engineering" },
  { id: "frontend", label: "Frontend Engineering" },
  { id: "fullstack", label: "Full Stack Engineering" },
  { id: "devops_sre", label: "DevOps / SRE / Cloud" },
  { id: "ai_ml", label: "AI / Machine Learning" },
  { id: "data_engineering", label: "Data Engineering" },
  { id: "mobile", label: "Mobile Engineering" },
  { id: "qa_sdet", label: "QA / SDET Automation" },
  { id: "security", label: "Security Engineering" },
  { id: "systems_embedded", label: "Systems / Embedded" },
];

const EXPERIENCE_LEVELS = [
  "All",
  "Fresher / 0-1 yr",
  "1-3 yrs",
  "3-5 yrs",
  "5+ yrs",
  "Any Experience",
];

const CITIES = [
  "All",
  "Bengaluru",
  "Hyderabad",
  "Pune",
  "Delhi NCR",
  "Mumbai",
  "Chennai",
  "Remote India",
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

  return (
    <aside className="w-full lg:w-72 flex-shrink-0 space-y-6 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
      {/* Header & Reset */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span>Filters</span>
        </h2>
        <button
          onClick={onReset}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset All</span>
        </button>
      </div>

      {/* Freshness Gate Toggle (Strict 24h) */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/60 dark:to-teal-950/60 border border-emerald-200/80 dark:border-emerald-800 rounded-xl p-3.5">
        <label className="flex items-center justify-between cursor-pointer">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400 fill-emerald-600 dark:fill-emerald-400" />
            <div>
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block">Last 24 Hours Only</span>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400">Strict freshness window</span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={filters.freshOnly}
            onChange={(e) => setFilters((prev) => ({ ...prev, freshOnly: e.target.checked }))}
            className="w-4 h-4 text-emerald-600 rounded border-emerald-300 dark:border-emerald-700 focus:ring-emerald-500 bg-white dark:bg-slate-800"
          />
        </label>
      </div>

      {/* Role Family (LinkedIn style) */}
      <div>
        <label className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5 text-slate-400" />
          <span>Engineering Discipline</span>
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
                    ? "bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-100 dark:border-indigo-800"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
                }`}
              >
                <span className="truncate">{role.label}</span>
                {count !== undefined && count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSelected ? "bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Experience Level (Naukri style) */}
      <div>
        <label className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
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
                    ? "bg-indigo-600 text-white border-indigo-600 font-semibold shadow-sm"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                {level}
              </button>
            );
          })}
        </div>
      </div>

      {/* Location (Indian Tech Hubs) */}
      <div>
        <label className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          <span>Location</span>
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {CITIES.map((city) => {
            const isSelected = filters.city === city;
            return (
              <button
                key={city}
                onClick={() => setFilters((prev) => ({ ...prev, city }))}
                className={`px-2 py-1.5 text-xs text-left truncate rounded-lg border transition-all ${
                  isSelected
                    ? "bg-indigo-50 dark:bg-indigo-950/80 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-bold"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                {city}
              </button>
            );
          })}
        </div>
      </div>

      {/* Work Mode */}
      <div>
        <label className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
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
                    ? "bg-indigo-600 text-white border-indigo-600 font-semibold"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tech Skills Cloud */}
      <div>
        <label className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-slate-400" />
          <span>Top Tech Skills</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {TOP_SKILLS.map((skill) => {
            const isSelected = filters.selectedSkills.includes(skill);
            return (
              <button
                key={skill}
                onClick={() => toggleSkill(skill)}
                className={`px-2 py-0.5 text-[11px] rounded border transition-all ${
                  isSelected
                    ? "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700 font-bold"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {skill}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
