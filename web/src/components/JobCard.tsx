import React, { useState } from "react";
import { Job } from "../types/job";
import { ExternalLink, Bookmark, Zap, MapPin, Clock, Laptop, Info } from "lucide-react";
import {
  cleanJobText,
  formatPostingTime,
  formatLocation,
  formatWorkMode,
  calculateRelevanceScore,
  normalizeJobUrl,
} from "../utils/jobUtils";

interface JobCardProps {
  job: Job;
  isSaved: boolean;
  onToggleSave: (job: Job) => void;
  onSelect: (job: Job) => void;
  searchQuery?: string;
  selectedSkills?: string[];
  selectedRole?: string;
  density?: "comfortable" | "compact";
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  isSaved,
  onToggleSave,
  onSelect,
  searchQuery = "",
  selectedSkills = [],
  selectedRole = "all",
  density = "comfortable",
}) => {
  const [showScoreInfo, setShowScoreInfo] = useState(false);

  // Compute transparent relevance score
  const relevance = calculateRelevanceScore(job, searchQuery, selectedSkills, selectedRole);

  // Deterministic clean monogram with warm/tactical tones (NO blues or purples)
  const getCompanyColor = (name: string) => {
    const tints = [
      "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800",
      "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
      "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700",
      "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
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
        return "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60";
      case "ashby":
        return "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/60";
      case "workday":
        return "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700";
      case "smartrecruiters":
        return "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800/60";
      default:
        return "bg-brand-elevated text-brand-secondary border-brand-border";
    }
  };

  const initial = job.company_name ? job.company_name.charAt(0).toUpperCase() : "C";
  const cleanSummary = cleanJobText(job.summary || `${job.title} at ${job.company_name}`);
  const cleanTitle = cleanJobText(job.title);
  const locationDisplay = formatLocation(job.city, job.location_raw);
  const workModeDisplay = formatWorkMode(job.work_mode);
  const timeDisplay = formatPostingTime(job.posted_at, job.age_hours);
  const safeApplyUrl = normalizeJobUrl(job.job_url);

  const isCompact = density === "compact";

  return (
    <article className={`bg-brand-surface rounded-2xl border border-brand-border hover:border-amber-500/40 job-card-interactive flex flex-col justify-between group h-full relative ${
      isCompact ? "p-3.5 sm:p-4" : "p-4 sm:p-5"
    }`}>
      <div>
        {/* Top Header: Company Identity & Actions */}
        <div className={`flex items-start justify-between gap-3 ${isCompact ? "mb-2" : "mb-3"}`}>
          <div className="flex items-center gap-3 min-w-0">
            {/* Deterministic monogram fallback with tactical palette */}
            <div
              className={`rounded-xl border flex items-center justify-center font-bold text-sm flex-shrink-0 transition-colors ${getCompanyColor(job.company_name || "")} ${
                isCompact ? "w-8 h-8 text-xs" : "w-10 h-10"
              }`}
              aria-label={`${job.company_name} initial`}
            >
              {initial}
            </div>

            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-brand-text truncate leading-tight group-hover:text-brand-primary transition-colors">
                {job.company_name}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className={`text-[10px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${getAtsBadgeColor(job.ats_provider || "")}`}>
                  {job.ats_provider || "DIRECT"}
                </span>
                <span className="text-[11px] text-brand-muted">•</span>
                <span className="text-[11px] text-brand-secondary truncate max-w-[140px]">
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
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md border border-brand-border bg-brand-elevated text-[11px] font-mono font-medium text-brand-text hover:border-brand-primary/40 active:scale-[0.98] transition-colors"
                title="Job relevance score and breakdown"
              >
                <span className="font-bold tabular-nums text-amber-600 dark:text-amber-400">{relevance.score}%</span>
                <Info className="w-3 h-3 text-brand-muted" />
              </button>

              {/* Score Breakdown Popover */}
              {showScoreInfo && (
                <div className="absolute right-0 top-full mt-1.5 w-64 p-3 bg-brand-surface border border-brand-border rounded-xl shadow-xl z-30 text-xs text-brand-text animate-in fade-in zoom-in-95 duration-150">
                  <div className="font-semibold text-brand-primary mb-1.5 flex items-center justify-between">
                    <span>Relevance breakdown</span>
                    <span className="font-mono text-[11px] tabular-nums">{relevance.score}/100</span>
                  </div>
                  <ul className="space-y-1 text-[11px] text-brand-secondary">
                    {relevance.breakdown.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-brand-primary">•</span>
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
              className={`p-1.5 rounded-xl border active:scale-[0.98] transition-all ${
                isSaved
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-500"
                  : "border-transparent text-brand-muted hover:text-brand-text hover:bg-brand-elevated"
              }`}
              title={isSaved ? "Remove from pipeline" : "Save to my pipeline"}
              aria-label={isSaved ? "Unsave job" : "Save job"}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? "fill-amber-500 text-amber-500" : ""}`} />
            </button>
          </div>
        </div>

        {/* Job Title */}
        <h2
          onClick={() => onSelect(job)}
          className={`font-semibold text-brand-text group-hover:text-brand-primary transition-colors cursor-pointer leading-snug ${
            isCompact
              ? "text-sm line-clamp-1 min-h-0 mb-1.5"
              : "text-base line-clamp-2 min-h-[2.75rem] mb-2.5"
          }`}
          title={cleanTitle}
        >
          {cleanTitle}
        </h2>

        {/* Standardized Metadata Badges Row */}
        <div className={`flex flex-wrap items-center gap-1.5 ${isCompact ? "mb-2" : "mb-3"}`}>
          {job.is_fresh_24h && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
              <Zap className="w-3 h-3 text-emerald-500 fill-emerald-500" />
              <span>Fresh 24h</span>
            </span>
          )}

          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-brand-elevated text-brand-secondary border border-brand-border">
            <Clock className="w-3 h-3 text-brand-muted" />
            <span>{job.experience_level || "Any experience"}</span>
          </span>

          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-brand-elevated text-brand-secondary border border-brand-border">
            <MapPin className="w-3 h-3 text-brand-muted" />
            <span>{locationDisplay}</span>
          </span>

          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-brand-elevated text-brand-secondary border border-brand-border">
            <Laptop className="w-3 h-3 text-brand-muted" />
            <span>{workModeDisplay}</span>
          </span>
        </div>

        {/* Clean Job Summary */}
        {!isCompact && (
          <p className="text-xs text-brand-secondary line-clamp-2 min-h-[2.5rem] leading-relaxed mb-3">
            {cleanSummary}
          </p>
        )}

        {/* Skill Tags */}
        {job.skills && job.skills.length > 0 && (
          <div className={`flex flex-wrap gap-1 ${isCompact ? "mb-2.5" : "mb-4"}`}>
            {job.skills.slice(0, isCompact ? 3 : 4).map((skill) => (
              <span
                key={skill}
                className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-brand-elevated text-brand-secondary border border-brand-border"
              >
                {skill}
              </span>
            ))}
            {job.skills.length > (isCompact ? 3 : 4) && (
              <span className="text-[10px] font-mono text-brand-muted px-1.5 py-0.5 rounded-md bg-brand-elevated border border-brand-border">
                +{job.skills.length - (isCompact ? 3 : 4)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Aligned Card Footer */}
      <div className="pt-3 border-t border-brand-border flex items-center justify-between text-xs mt-auto">
        <span className="text-brand-muted font-mono text-[11px] tabular-nums">{timeDisplay}</span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelect(job)}
            className="text-brand-secondary hover:text-brand-text font-medium px-3 py-2 rounded-xl bg-brand-surface hover:bg-brand-elevated transition-colors text-xs border border-brand-border active:scale-[0.98] btn-tactile"
          >
            Details
          </button>
          <a
            href={safeApplyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-primary hover:bg-brand-hover text-white dark:text-zinc-950 font-bold text-xs active:scale-[0.98] transition-all shadow-sm shadow-amber-500/20 btn-tactile"
          >
            <span>Apply</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </article>
  );
};
