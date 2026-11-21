import React, { useState } from "react";
import { Job } from "../types/job";
import { ExternalLink, Bookmark, Zap, MapPin, Clock, Laptop, Info } from "lucide-react";
import {
  cleanJobText,
  formatPostingTime,
  formatLocation,
  formatWorkMode,
  calculateRelevanceScore,
  sanitizeExternalUrl,
} from "../utils/jobUtils";

interface JobCardProps {
  job: Job;
  isSaved: boolean;
  onToggleSave: (job: Job) => void;
  onSelect: (job: Job) => void;
  searchQuery?: string;
  selectedSkills?: string[];
  selectedRole?: string;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  isSaved,
  onToggleSave,
  onSelect,
  searchQuery = "",
  selectedSkills = [],
  selectedRole = "all",
}) => {
  const [showScoreInfo, setShowScoreInfo] = useState(false);

  // Compute transparent relevance score
  const relevance = calculateRelevanceScore(job, searchQuery, selectedSkills, selectedRole);

  // Deterministic clean pastel monogram
  const getCompanyColor = (name: string) => {
    const tints = [
      "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
      "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800",
      "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800",
      "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    ];
    let hash = 0;
    for (let i = 0; i < (name || "").length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
      hash |= 0;
    }
    return tints[Math.abs(hash) % tints.length];
  };

  const getAtsBadgeColor = (ats: string) => {
    switch (ats?.toLowerCase()) {
      case "greenhouse":
        return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60";
      case "lever":
        return "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800/60";
      case "ashby":
        return "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/60";
      case "workday":
        return "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60";
      case "smartrecruiters":
        return "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    }
  };

  const initial = job.company_name ? job.company_name.charAt(0).toUpperCase() : "C";
  const cleanSummary = cleanJobText(job.summary || `${job.title} at ${job.company_name}`);
  const cleanTitle = cleanJobText(job.title);
  const locationDisplay = formatLocation(job.city, job.location_raw);
  const workModeDisplay = formatWorkMode(job.work_mode);
  const timeDisplay = formatPostingTime(job.posted_at, job.age_hours);
  const safeApplyUrl = sanitizeExternalUrl(job.job_url);

  return (
    <article className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/90 p-4 sm:p-5 hover:border-blue-400 dark:hover:border-blue-500/60 hover:shadow-md transition-all duration-200 flex flex-col justify-between group h-full relative">
      <div>
        {/* Top Header: Company Identity & Actions */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Deterministic monogram fallback */}
            <div
              className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-sm flex-shrink-0 transition-colors ${getCompanyColor(
                job.company_name
              )}`}
              aria-label={`${job.company_name} initial`}
            >
              {initial}
            </div>

            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {job.company_name}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span
                  className={`text-[10px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${getAtsBadgeColor(
                    job.ats_provider
                  )}`}
                >
                  {job.ats_provider || "DIRECT"}
                </span>
                <span className="text-[11px] text-slate-400">•</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                  {job.role_label || "Engineering"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Relevance Score Pill with Explainability Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowScoreInfo(!showScoreInfo)}
                onMouseEnter={() => setShowScoreInfo(true)}
                onMouseLeave={() => setShowScoreInfo(false)}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800/80 bg-blue-50/80 dark:bg-blue-950/50 text-[11px] font-mono font-medium text-blue-700 dark:text-blue-300 hover:border-blue-400 dark:hover:border-blue-500 transition-colors shadow-sm"
                title="Job Relevance Score & Breakdown"
              >
                <span className="text-blue-700 dark:text-blue-300 font-bold">{relevance.score}%</span>
                <Info className="w-3 h-3 text-blue-500 dark:text-blue-400" />
              </button>

              {/* Score Breakdown Popover */}
              {showScoreInfo && (
                <div className="absolute right-0 top-full mt-1.5 w-64 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 text-xs text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150">
                  <div className="font-semibold text-blue-600 dark:text-blue-400 mb-1.5 flex items-center justify-between">
                    <span>Relevance Breakdown</span>
                    <span className="font-mono text-[11px]">{relevance.score}/100</span>
                  </div>
                  <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                    {relevance.breakdown.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-blue-500">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Bookmark Button */}
            <button
              onClick={() => onToggleSave(job)}
              className={`p-1.5 rounded-xl border transition-all ${
                isSaved
                  ? "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "border-transparent text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              title={isSaved ? "Remove from pipeline" : "Save to my pipeline"}
              aria-label={isSaved ? "Unsave job" : "Save job"}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? "fill-blue-600 dark:fill-blue-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Job Title: Clamped to 2 lines with consistent min-height to prevent grid jitter */}
        <h2
          onClick={() => onSelect(job)}
          className="text-base font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors cursor-pointer line-clamp-2 min-h-[2.75rem] leading-snug mb-2.5"
          title={cleanTitle}
        >
          {cleanTitle}
        </h2>

        {/* Standardized Metadata Badges Row */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {job.is_fresh_24h && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 shadow-sm">
              <Zap className="w-3 h-3 text-sky-500 fill-sky-500" />
              <span>Fresh 24h</span>
            </span>
          )}

          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{job.experience_level || "Any Experience"}</span>
          </span>

          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60">
            <MapPin className="w-3 h-3 text-slate-400" />
            <span>{locationDisplay}</span>
          </span>

          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60">
            <Laptop className="w-3 h-3 text-slate-400" />
            <span>{workModeDisplay}</span>
          </span>
        </div>

        {/* Clean Job Summary (strictly entity-free and HTML-stripped) */}
        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 min-h-[2.5rem] leading-relaxed mb-3">
          {cleanSummary}
        </p>

        {/* Skill Tags (max 4 visible with overflow pill) */}
        {job.skills && job.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {job.skills.slice(0, 4).map((skill) => (
              <span
                key={skill}
                className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60"
              >
                {skill}
              </span>
            ))}
            {job.skills.length > 4 && (
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/40">
                +{job.skills.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Aligned Card Footer */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs mt-auto">
        <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px]">{timeDisplay}</span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelect(job)}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
          >
            Details
          </button>
          <a
            href={safeApplyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm shadow-blue-500/20 hover:shadow transition-all duration-200"
          >
            <span>Apply</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </article>
  );
};
