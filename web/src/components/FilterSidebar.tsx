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
    <aside className="w-full lg:w-72 flex-shrink-0 space-y-6 bg-white dark:bg-espresso-900 p-5 rounded-2xl border border-sage-200 dark:border-sage-800 shadow-sm transition-colors">
      {/* Header & Reset */}
      <div className="flex items-center justify-between pb-3 border-b border-sage-100 dark:border-sage-800">
        <h2 className="font-serif font-bold text-lg text-espresso-900 dark:text-ivory-200 flex items-center gap-2">
          <span>Refine Radar</span>
        </h2>
        <button
          onClick={onReset}
          className="text-xs text-crimson-700 dark:text-ivory-400 hover:text-crimson-800 dark:hover:text-white font-semibold flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset All</span>
        </button>
      </div>

      {/* Freshness Gate Toggle (Strict 24h) */}
      <div className="bg-ivory-200/90 dark:bg-espresso-800/90 border border-ivory-400/60 dark:border-sage-700 rounded-xl p-3.5">
        <label className="flex items-center justify-between cursor-pointer">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-crimson-700 flex items-center justify-center text-ivory-300">
              <Zap className="w-4 h-4 fill-ivory-300 text-ivory-300" />
            </div>
            <div>
              <span className="text-xs font-bold text-espresso-900 dark:text-ivory-200 block">Last 24 Hours Only</span>
              <span className="text-[11px] text-sage-600 dark:text-sage-400 font-mono">Strict 24h Freshness</span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={filters.freshOnly}
            onChange={(e) => setFilters((prev) => ({ ...prev, freshOnly: e.target.checked }))}
            className="w-4 h-4 accent-crimson-700 rounded border-sage-300 dark:border-sage-600 focus:ring-crimson-700"
          />
        </label>
      </div>

      {/* Role Family */}
      <div>
        <label className="text-xs font-serif font-semibold text-espresso-900 dark:text-ivory-300 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5 text-sage-500" />
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
                    ? "bg-crimson-50 dark:bg-crimson-950/70 text-crimson-800 dark:text-ivory-300 font-bold border border-crimson-200 dark:border-crimson-900"
                    : "text-espresso-800 dark:text-sage-300 hover:bg-ivory-100 dark:hover:bg-espresso-800 font-medium"
                }`}
              >
                <span className="truncate">{role.label}</span>
                {count !== undefined && count > 0 && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                      isSelected
                        ? "bg-crimson-200 dark:bg-crimson-900 text-crimson-900 dark:text-ivory-200"
                        : "bg-ivory-200 dark:bg-espresso-800 text-sage-700 dark:text-sage-400"
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
        <label className="text-xs font-serif font-semibold text-espresso-900 dark:text-ivory-300 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-sage-500" />
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
                    ? "bg-crimson-700 text-ivory-100 border-crimson-700 font-semibold shadow-sm"
                    : "bg-white dark:bg-espresso-800 text-espresso-800 dark:text-sage-300 border-sage-200 dark:border-sage-700 hover:border-crimson-300 dark:hover:border-sage-500 hover:bg-ivory-50 dark:hover:bg-espresso-700"
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
        <label className="text-xs font-serif font-semibold text-espresso-900 dark:text-ivory-300 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-sage-500" />
          <span>Indian Tech Hub</span>
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
                    ? "bg-ivory-300 dark:bg-crimson-950/80 border-crimson-300 dark:border-crimson-800 text-crimson-800 dark:text-ivory-200 font-bold"
                    : "bg-white dark:bg-espresso-800 border-sage-200 dark:border-sage-700 text-espresso-800 dark:text-sage-300 hover:bg-ivory-50 dark:hover:bg-espresso-700"
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
        <label className="text-xs font-serif font-semibold text-espresso-900 dark:text-ivory-300 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
          <Laptop className="w-3.5 h-3.5 text-sage-500" />
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
                    ? "bg-crimson-700 text-ivory-100 border-crimson-700 font-semibold"
                    : "bg-white dark:bg-espresso-800 text-espresso-800 dark:text-sage-300 border-sage-200 dark:border-sage-700 hover:bg-ivory-50 dark:hover:bg-espresso-700"
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
        <label className="text-xs font-serif font-semibold text-espresso-900 dark:text-ivory-300 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-sage-500" />
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
                    ? "bg-ivory-300 dark:bg-crimson-950 text-crimson-800 dark:text-ivory-200 border-ivory-400 dark:border-crimson-800 font-bold"
                    : "bg-ivory-100 dark:bg-espresso-800 text-sage-700 dark:text-sage-300 border-sage-200 dark:border-sage-700 hover:bg-ivory-200 dark:hover:bg-espresso-700"
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
