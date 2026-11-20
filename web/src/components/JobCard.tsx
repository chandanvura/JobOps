import React from "react";
import { Job } from "../types/job";
import { ExternalLink, Bookmark, Zap, MapPin, Clock } from "lucide-react";

interface JobCardProps {
  job: Job;
  isSaved: boolean;
  onToggleSave: (job: Job) => void;
  onSelect: (job: Job) => void;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  isSaved,
  onToggleSave,
  onSelect,
}) => {
  const getAtsBadgeColor = (ats: string) => {
    switch (ats.toLowerCase()) {
      case "greenhouse":
        return "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "lever":
        return "bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800";
      case "ashby":
        return "bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      case "smartrecruiters":
        return "bg-ivory-300 dark:bg-espresso-800 text-amber-900 dark:text-ivory-200 border-ivory-400 dark:border-sage-700";
      case "workday":
        return "bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      default:
        return "bg-ivory-100 dark:bg-espresso-800 text-sage-800 dark:text-sage-300 border-sage-200 dark:border-sage-700";
    }
  };

  const getInitial = (name: string) => (name ? name.charAt(0).toUpperCase() : "C");

  return (
    <div className="bg-white dark:bg-espresso-900 rounded-2xl border border-sage-200 dark:border-sage-800 p-5 hover:border-crimson-400 dark:hover:border-crimson-600 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
      <div>
        {/* Top bar: Company & ATS & Save */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ivory-300 dark:bg-espresso-800 border border-ivory-400/60 dark:border-sage-700 flex items-center justify-center font-serif font-bold text-crimson-800 dark:text-ivory-300 text-base flex-shrink-0 group-hover:bg-crimson-700 group-hover:text-ivory-200 transition-colors">
              {getInitial(job.company_name)}
            </div>
            <div>
              <h3 className="text-sm font-bold text-espresso-900 dark:text-ivory-200 leading-tight">
                {job.company_name}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[10px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${getAtsBadgeColor(job.ats_provider)}`}>
                  {job.ats_provider}
                </span>
                <span className="text-[11px] text-sage-400 dark:text-sage-500">•</span>
                <span className="text-[11px] text-sage-600 dark:text-sage-400 font-medium truncate max-w-[140px]">
                  {job.role_label}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onToggleSave(job)}
            className={`p-2 rounded-lg transition-colors ${
              isSaved
                ? "text-crimson-700 dark:text-ivory-300 bg-crimson-50 dark:bg-crimson-950 hover:bg-crimson-100 dark:hover:bg-crimson-900"
                : "text-sage-400 hover:text-crimson-700 dark:hover:text-ivory-300 hover:bg-ivory-100 dark:hover:bg-espresso-800"
            }`}
            title={isSaved ? "Remove from saved" : "Save job"}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? "fill-crimson-700 dark:fill-ivory-300" : ""}`} />
          </button>
        </div>

        {/* Job Title */}
        <h2
          onClick={() => onSelect(job)}
          className="font-serif text-lg font-semibold text-espresso-950 dark:text-ivory-100 group-hover:text-crimson-700 dark:group-hover:text-ivory-400 transition-colors cursor-pointer line-clamp-2 mb-2.5 leading-snug"
        >
          {job.title}
        </h2>

        {/* Metadata Badges */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {job.is_fresh_24h && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-crimson-50 dark:bg-crimson-950/80 text-crimson-700 dark:text-ivory-300 border border-crimson-200 dark:border-crimson-800">
              <Zap className="w-3 h-3 fill-crimson-700 dark:fill-ivory-300 text-crimson-700 dark:text-ivory-300" />
              <span>Fresh 24h</span>
            </span>
          )}

          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-ivory-100 dark:bg-espresso-800 text-espresso-800 dark:text-sage-300 border border-sage-200/60 dark:border-sage-700">
            <Clock className="w-3 h-3 text-sage-400" />
            <span>{job.experience_level}</span>
          </span>

          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-ivory-100 dark:bg-espresso-800 text-espresso-800 dark:text-sage-300 border border-sage-200/60 dark:border-sage-700">
            <MapPin className="w-3 h-3 text-sage-400" />
            <span>{job.city || job.location_raw || "India"}</span>
          </span>

          {job.work_mode && job.work_mode !== "unknown" && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-ivory-200 dark:bg-espresso-800 text-espresso-800 dark:text-ivory-300 border border-sage-200/60 dark:border-sage-700 capitalize">
              {job.work_mode}
            </span>
          )}
        </div>

        {/* Description snippet */}
        <p className="text-xs text-sage-700 dark:text-sage-300 line-clamp-2 mb-3 leading-relaxed">
          {job.summary}
        </p>

        {/* Skills Tags */}
        {job.skills && job.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {job.skills.slice(0, 4).map((skill) => (
              <span
                key={skill}
                className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-ivory-100 dark:bg-espresso-800 text-espresso-800 dark:text-ivory-300 border border-sage-200 dark:border-sage-700"
              >
                {skill}
              </span>
            ))}
            {job.skills.length > 4 && (
              <span className="text-[10px] font-mono text-sage-500 dark:text-sage-400 px-1 py-0.5">
                +{job.skills.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Card Footer: Age & Actions */}
      <div className="pt-3 border-t border-sage-100 dark:border-sage-800 flex items-center justify-between text-xs mt-auto">
        <span className="text-sage-500 dark:text-sage-400 font-mono text-[11px]">
          {job.posted_at ? `${Math.round(job.age_hours)}h ago` : "Live detection"}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelect(job)}
            className="text-sage-700 dark:text-sage-300 hover:text-crimson-700 dark:hover:text-ivory-300 font-semibold px-2 py-1 rounded transition-colors"
          >
            Details
          </button>
          <a
            href={job.job_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-crimson-700 hover:bg-crimson-800 text-ivory-100 font-semibold transition-colors shadow-sm"
          >
            <span>Apply</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
