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
  index?: number;
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
  index = 0,
}) => {
  const [showScoreInfo, setShowScoreInfo] = useState(false);

  // Compute transparent relevance score
  const relevance = calculateRelevanceScore(job, searchQuery, selectedSkills, selectedRole);

  // Deterministic clean monogram with crisp Apple Precision neutral & accent tones
  const getCompanyColor = (name: string) => {
    const tints = [
      "bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#409CFF] border-[#0071E3]/20 dark:border-[#0A84FF]/25",
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
      "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
      "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20",
      "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20",
      "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
    ];
    let hash = 0;
    for (let i = 0; i < (name || "").length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
      hash |= 0;
    }
    return tints[Math.abs(hash) % tints.length];
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
    <article
      style={{ "--stagger-index": index } as React.CSSProperties}
      className={`card-enter bg-brand-surface rounded-[20px] border border-brand-border hover:border-brand-primary/40 job-card-interactive flex flex-col justify-between group h-full relative ${
        isCompact ? "p-3.5 sm:p-4" : "p-4 sm:p-5"
      }`}
    >
      <div>
        {/* Top Header: Company Identity & Actions */}
        <div className={`flex items-start justify-between gap-3 ${isCompact ? "mb-2" : "mb-3"}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`rounded-xl border flex items-center justify-center font-bold text-sm flex-shrink-0 transition-colors ${getCompanyColor(job.company_name || "")} ${
                isCompact ? "w-8 h-8 text-xs" : "w-10 h-10"
              }`}
              aria-label={`${job.company_name} initial`}
            >
              {initial}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-sm font-semibold text-brand-text truncate leading-tight group-hover:text-brand-primary transition-colors">
                  {job.company_name}
                </h3>
                {job.is_fresh_24h && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                    <Zap className="w-3 h-3 text-emerald-500 fill-emerald-500" />
                    <span>24h</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-brand-secondary truncate">
                <span className="font-mono text-[11px] text-brand-muted uppercase tracking-wide">
                  {job.ats_provider || "Direct"}
                </span>
                <span className="text-brand-muted" aria-hidden="true">·</span>
                <span className="truncate">{job.role_label || "Engineering"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Relevance Score Interactive Pill with Explainability Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowScoreInfo(!showScoreInfo)}
                onMouseEnter={() => setShowScoreInfo(true)}
                onMouseLeave={() => setShowScoreInfo(false)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-elevated/80 border border-brand-borderSubtle text-xs font-mono font-medium text-brand-text hover:border-brand-primary/40 btn-tactile"
                title="Job relevance score and breakdown"
                aria-expanded={showScoreInfo}
              >
                <span className="font-bold tabular-nums text-brand-primary">{relevance.score}%</span>
                <Info className="w-3 h-3 text-brand-muted" />
              </button>

              {showScoreInfo && (
                <div className="absolute right-0 top-full mt-1.5 w-64 p-3.5 bg-brand-surface border border-brand-border rounded-2xl shadow-xl z-30 text-xs text-brand-text">
                  <div className="font-semibold text-brand-primary mb-1.5 flex items-center justify-between">
                    <span>Relevance breakdown</span>
                    <span className="font-mono text-xs tabular-nums">{relevance.score}/100</span>
                  </div>
                  <ul className="space-y-1 text-xs text-brand-secondary">
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
              className={`p-2 rounded-[12px] border btn-tactile ${
                isSaved
                  ? "border-brand-primary/40 bg-brand-accentSoft text-brand-primary"
                  : "border-transparent text-brand-muted hover:text-brand-text hover:bg-brand-elevated"
              }`}
              title={isSaved ? "Remove from pipeline" : "Save to my pipeline"}
              aria-label={isSaved ? "Unsave job" : "Save job"}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? "fill-brand-primary text-brand-primary" : ""}`} />
            </button>
          </div>
        </div>

        {/* Job Title */}
        <h2
          onClick={() => onSelect(job)}
          className={`font-semibold text-brand-text group-hover:text-brand-primary transition-colors cursor-pointer leading-snug ${
            isCompact
              ? "text-sm line-clamp-1 min-h-0 mb-1.5"
              : "text-base line-clamp-2 min-h-[2.75rem] mb-2"
          }`}
          title={cleanTitle}
        >
          {cleanTitle}
        </h2>

        {/* Clean Typographic Metadata Line (Zero box clutter) */}
        <div className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-brand-secondary ${isCompact ? "mb-2" : "mb-3"}`}>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-brand-muted flex-shrink-0" />
            <span>{job.experience_level || "Any experience"}</span>
          </span>
          <span className="text-brand-muted" aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-brand-muted flex-shrink-0" />
            <span>{locationDisplay}</span>
          </span>
          <span className="text-brand-muted" aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <Laptop className="w-3.5 h-3.5 text-brand-muted flex-shrink-0" />
            <span>{workModeDisplay}</span>
          </span>
        </div>

        {/* Clean Job Summary */}
        {!isCompact && (
          <p className="text-xs text-brand-secondary line-clamp-2 min-h-[2.5rem] leading-relaxed mb-3">
            {cleanSummary}
          </p>
        )}

        {/* Tonal Skill Tags (Material 3 tonal chips, zero heavy border cages) */}
        {job.skills && job.skills.length > 0 && (
          <div className={`flex flex-wrap gap-1.5 ${isCompact ? "mb-2.5" : "mb-4"}`}>
            {job.skills.slice(0, isCompact ? 3 : 4).map((skill) => (
              <span
                key={skill}
                className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-brand-secondarySurface dark:bg-brand-elevated text-brand-secondary"
              >
                {skill}
              </span>
            ))}
            {job.skills.length > (isCompact ? 3 : 4) && (
              <span className="text-[11px] font-mono text-brand-muted px-1.5 py-0.5">
                +{job.skills.length - (isCompact ? 3 : 4)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Aligned Card Footer */}
      <div className="pt-3 border-t border-brand-borderSubtle flex items-center justify-between text-xs mt-auto">
        <span className="text-brand-muted font-mono text-xs tabular-nums">{timeDisplay}</span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelect(job)}
            className="text-brand-secondary hover:text-brand-text font-medium px-3 py-2 rounded-[12px] bg-brand-surface hover:bg-brand-elevated text-xs border border-brand-border btn-tactile"
          >
            Details
          </button>
          <a
            href={safeApplyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[12px] bg-brand-primary hover:bg-brand-hover text-white font-semibold text-xs shadow-sm shadow-[#0071E3]/20 btn-tactile"
          >
            <span>Apply</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
};
