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
        return "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "lever":
        return "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800";
      case "ashby":
        return "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      case "smartrecruiters":
        return "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "workday":
        return "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      default:
        return "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    }
  };

  const getInitial = (name: string) => (name ? name.charAt(0).toUpperCase() : "C");

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
      <div>
        {/* Top bar: Company & ATS & Save */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 text-sm flex-shrink-0 group-hover:from-indigo-50 group-hover:to-indigo-100 dark:group-hover:from-indigo-950 dark:group-hover:to-indigo-900 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
              {getInitial(job.company_name)}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">
                {job.company_name}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${getAtsBadgeColor(job.ats_provider)}`}>
                  {job.ats_provider}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">•</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[140px]">
                  {job.role_label}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onToggleSave(job)}
            className={`p-2 rounded-lg transition-colors ${
              isSaved
                ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 dark:hover:bg-indigo-900"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
            title={isSaved ? "Remove from saved" : "Save job"}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? "fill-indigo-600 dark:fill-indigo-400" : ""}`} />
          </button>
        </div>

        {/* Job Title */}
        <h2
          onClick={() => onSelect(job)}
          className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors cursor-pointer line-clamp-2 mb-2"
        >
          {job.title}
        </h2>

        {/* Metadata Badges */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {job.is_fresh_24h && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <Zap className="w-3 h-3 fill-emerald-600 dark:fill-emerald-400 text-emerald-600 dark:text-emerald-400" />
              <span>Fresh (24h)</span>
            </span>
          )}

          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{job.experience_level}</span>
          </span>

          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <MapPin className="w-3 h-3 text-slate-400" />
            <span>{job.city || job.location_raw || "India"}</span>
          </span>

          {job.work_mode && job.work_mode !== "unknown" && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 capitalize">
              {job.work_mode}
            </span>
          )}
        </div>

        {/* Description snippet */}
        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">
          {job.summary}
        </p>

        {/* Skills Tags */}
        {job.skills && job.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {job.skills.slice(0, 4).map((skill) => (
              <span
                key={skill}
                className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              >
                {skill}
              </span>
            ))}
            {job.skills.length > 4 && (
              <span className="text-[10px] text-slate-400 px-1 py-0.5">
                +{job.skills.length - 4} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Card Footer: Age & Actions */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs mt-auto">
        <span className="text-slate-400 dark:text-slate-500 font-medium">
          {job.posted_at ? `${Math.round(job.age_hours)}h ago` : "Recently detected"}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelect(job)}
            className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium px-2 py-1 rounded transition-colors"
          >
            Details
          </button>
          <a
            href={job.job_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors shadow-sm"
          >
            <span>Apply</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
