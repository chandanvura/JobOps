import React from "react";
import { Job } from "../types/job";
import { X, ExternalLink, Bookmark, Cpu, CheckCircle2 } from "lucide-react";

interface JobDetailModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  isSaved: boolean;
  onToggleSave: (job: Job) => void;
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({
  job,
  isOpen,
  onClose,
  isSaved,
  onToggleSave,
}) => {
  if (!isOpen || !job) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150 transition-colors">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center font-bold text-indigo-700 dark:text-indigo-300 text-lg flex-shrink-0">
              {job.company_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{job.company_name}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                  {job.ats_provider}
                </span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white leading-snug">
                {job.title}
              </h1>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 dark:text-slate-300">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 block mb-1">Experience</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{job.experience_level}</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 block mb-1">Location</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{job.city || "All India"}</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 block mb-1">Work Mode</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 capitalize">{job.work_mode || "Onsite"}</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 block mb-1">Freshness</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                {job.is_fresh_24h ? "⚡ Last 24 Hours" : "Active Listing"}
              </span>
            </div>
          </div>

          {/* Technical Skills */}
          {job.skills && job.skills.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-indigo-500" />
                <span>Extracted Tech Stack</span>
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {job.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Verification Evidence */}
          <div className="bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/60 rounded-2xl p-4">
            <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Direct ATS Verified Ingestion</span>
            </h4>
            <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
              This job was collected directly from {job.company_name}&apos;s official {job.ats_provider} feed. 
              No intermediaries, recruiters, or scraped HTML scrapings. You apply directly on their portal.
            </p>
          </div>

          {/* Job Overview / Snippet */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Job Description Preview
            </h3>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {job.summary}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 rounded-b-3xl flex items-center justify-between gap-3">
          <button
            onClick={() => onToggleSave(job)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border transition-colors ${
              isSaved
                ? "bg-indigo-50 dark:bg-indigo-950/80 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? "fill-indigo-600 text-indigo-600 dark:fill-indigo-400 dark:text-indigo-400" : ""}`} />
            <span>{isSaved ? "Saved" : "Save for Later"}</span>
          </button>

          <a
            href={job.job_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 dark:shadow-none transition-all"
          >
            <span>Apply on Official ATS</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
