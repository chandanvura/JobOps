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

  // Deterministic pastel tint for company monogram
  const getCompanyColor = (name: string) => {
    const tints = [
      "bg-amber-950/20 text-amber-500 border-amber-800/40",
      "bg-rose-950/20 text-rose-500 border-rose-800/40",
      "bg-emerald-950/20 text-emerald-500 border-emerald-800/40",
      "bg-sky-950/20 text-sky-500 border-sky-800/40",
      "bg-purple-950/20 text-purple-500 border-purple-800/40",
      "bg-orange-950/20 text-orange-500 border-orange-800/40",
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
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "lever":
        return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20";
      case "ashby":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "workday":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
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
  const safeApplyUrl = sanitizeExternalUrl(job.job_url);

  return (
    <article className="bg-brand-surface rounded-2xl border border-brand-border p-4 sm:p-5 hover:border-brand-primary transition-all duration-200 flex flex-col justify-between group shadow-sm hover:shadow-md h-full relative">
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
              <h3 className="text-sm font-semibold text-brand-text truncate leading-tight group-hover:text-brand-primary transition-colors">
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
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-brand-border bg-brand-elevated text-[11px] font-mono font-medium text-brand-secondary hover:text-brand-gold hover:border-brand-gold/40 transition-colors"
                title="Job Relevance Score & Breakdown"
              >
                <span className="text-brand-gold font-semibold">{relevance.score}%</span>
                <Info className="w-3 h-3 text-brand-muted" />
              </button>

              {/* Score Breakdown Popover */}
              {showScoreInfo && (
                <div className="absolute right-0 top-full mt-1.5 w-64 p-3 bg-brand-elevated border border-brand-border rounded-xl shadow-xl z-30 text-xs text-brand-text animate-in fade-in zoom-in-95 duration-150">
                  <div className="font-semibold text-brand-gold mb-1.5 flex items-center justify-between">
                    <span>Relevance Breakdown</span>
                    <span className="font-mono text-[11px]">{relevance.score}/100</span>
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
              className={`p-2 rounded-xl border transition-all ${
                isSaved
                  ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                  : "border-transparent text-brand-muted hover:text-brand-primary hover:bg-brand-elevated"
              }`}
              title={isSaved ? "Remove from saved pipeline" : "Save to my pipeline"}
              aria-label={isSaved ? "Unsave job" : "Save job"}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? "fill-brand-primary" : ""}`} />
            </button>
          </div>
        </div>

        {/* Job Title: Clamped to 2 lines with consistent min-height to prevent grid jitter */}
        <h2
          onClick={() => onSelect(job)}
          className="text-base font-semibold text-brand-text group-hover:text-brand-primary transition-colors cursor-pointer line-clamp-2 min-h-[2.75rem] leading-snug mb-2.5"
          title={cleanTitle}
        >
          {cleanTitle}
        </h2>

        {/* Standardized Metadata Badges Row */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {job.is_fresh_24h && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-brand-accent text-brand-text border border-brand-primary/40">
              <Zap className="w-3 h-3 text-brand-primary fill-brand-primary" />
              <span>Fresh 24h</span>
            </span>
          )}

          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-brand-elevated text-brand-secondary border border-brand-border">
            <Clock className="w-3 h-3 text-brand-muted" />
            <span>{job.experience_level || "Any Experience"}</span>
          </span>

          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-brand-elevated text-brand-secondary border border-brand-border">
            <MapPin className="w-3 h-3 text-brand-muted" />
            <span>{locationDisplay}</span>
          </span>

          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-brand-elevated text-brand-secondary border border-brand-border">
            <Laptop className="w-3 h-3 text-brand-muted" />
            <span>{workModeDisplay}</span>
          </span>
        </div>

        {/* Clean Job Summary (strictly entity-free and HTML-stripped) */}
        <p className="text-xs text-brand-secondary line-clamp-2 min-h-[2.5rem] leading-relaxed mb-3">
          {cleanSummary}
        </p>

        {/* Skill Tags (max 4 visible with overflow pill) */}
        {job.skills && job.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {job.skills.slice(0, 4).map((skill) => (
              <span
                key={skill}
                className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-brand-elevated text-brand-secondary border border-brand-border"
              >
                {skill}
              </span>
            ))}
            {job.skills.length > 4 && (
              <span className="text-[10px] font-mono text-brand-muted px-1.5 py-0.5 rounded bg-brand-elevated/50 border border-brand-border/60">
                +{job.skills.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Aligned Card Footer */}
      <div className="pt-3 border-t border-brand-border flex items-center justify-between text-xs mt-auto">
        <span className="text-brand-muted font-mono text-[11px]">{timeDisplay}</span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelect(job)}
            className="text-brand-secondary hover:text-brand-text font-medium px-2.5 py-1.5 rounded-lg hover:bg-brand-elevated transition-colors text-xs"
          >
            Details
          </button>
          <a
            href={safeApplyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-hover text-white font-semibold transition-colors shadow-sm text-xs"
          >
            <span>Apply</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </article>
  );
};
