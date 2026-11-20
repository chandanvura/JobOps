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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-espresso-950/70 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-espresso-900 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-sage-200 dark:border-sage-800 animate-in fade-in zoom-in-95 duration-150 transition-colors">
        {/* Header */}
        <div className="p-6 border-b border-sage-100 dark:border-sage-800 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-ivory-300 dark:bg-espresso-800 border border-ivory-400/60 dark:border-sage-700 flex items-center justify-center font-serif font-bold text-crimson-800 dark:text-ivory-300 text-xl flex-shrink-0">
              {job.company_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-espresso-900 dark:text-ivory-200 text-sm">{job.company_name}</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-ivory-200 dark:bg-espresso-800 text-sage-800 dark:text-sage-300 font-semibold border border-sage-200/60 dark:border-sage-700">
                  {job.ats_provider}
                </span>
              </div>
              <h1 className="font-serif text-xl sm:text-2xl font-bold text-espresso-950 dark:text-ivory-100 leading-snug">
                {job.title}
              </h1>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-sage-400 hover:text-crimson-800 dark:hover:text-white hover:bg-ivory-100 dark:hover:bg-espresso-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-espresso-800 dark:text-ivory-200">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-ivory-50 dark:bg-espresso-800/60 p-3 rounded-xl border border-sage-200/60 dark:border-sage-800">
              <span className="text-[11px] font-mono font-semibold text-sage-600 dark:text-sage-400 block mb-1">Experience</span>
              <span className="text-xs font-bold text-espresso-900 dark:text-ivory-200">{job.experience_level}</span>
            </div>
            <div className="bg-ivory-50 dark:bg-espresso-800/60 p-3 rounded-xl border border-sage-200/60 dark:border-sage-800">
              <span className="text-[11px] font-mono font-semibold text-sage-600 dark:text-sage-400 block mb-1">Location</span>
              <span className="text-xs font-bold text-espresso-900 dark:text-ivory-200">{job.city || "All India"}</span>
            </div>
            <div className="bg-ivory-50 dark:bg-espresso-800/60 p-3 rounded-xl border border-sage-200/60 dark:border-sage-800">
              <span className="text-[11px] font-mono font-semibold text-sage-600 dark:text-sage-400 block mb-1">Work Mode</span>
              <span className="text-xs font-bold text-espresso-900 dark:text-ivory-200 capitalize">{job.work_mode || "Onsite"}</span>
            </div>
            <div className="bg-ivory-50 dark:bg-espresso-800/60 p-3 rounded-xl border border-sage-200/60 dark:border-sage-800">
              <span className="text-[11px] font-mono font-semibold text-sage-600 dark:text-sage-400 block mb-1">Freshness</span>
              <span className="text-xs font-bold text-crimson-700 dark:text-ivory-400 flex items-center gap-1 font-mono">
                {job.is_fresh_24h ? "⚡ Last 24 Hours" : "Active Listing"}
              </span>
            </div>
          </div>

          {/* Technical Skills */}
          {job.skills && job.skills.length > 0 && (
            <div>
              <h3 className="text-xs font-serif font-bold uppercase tracking-wider text-sage-600 dark:text-sage-400 mb-2 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-crimson-700 dark:text-ivory-400" />
                <span>Extracted Tech Stack</span>
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {job.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2.5 py-1 text-xs font-mono font-semibold rounded-lg bg-ivory-200 dark:bg-espresso-800 text-espresso-900 dark:text-ivory-200 border border-sage-200 dark:border-sage-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Verification Evidence */}
          <div className="bg-ivory-200/60 dark:bg-espresso-800/60 border border-ivory-300 dark:border-sage-700 rounded-2xl p-4">
            <h4 className="text-xs font-serif font-bold text-crimson-900 dark:text-ivory-300 mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-crimson-700 dark:text-ivory-400" />
              <span>Direct ATS Verified Ingestion</span>
            </h4>
            <p className="text-xs text-sage-700 dark:text-sage-300 leading-relaxed">
              This job was collected directly from {job.company_name}&apos;s official {job.ats_provider} feed. 
              Zero intermediaries, aggregators, or expired listings. You apply directly on their portal.
            </p>
          </div>

          {/* Job Overview / Snippet */}
          <div>
            <h3 className="text-xs font-serif font-bold uppercase tracking-wider text-sage-600 dark:text-sage-400 mb-2">
              Job Description Preview
            </h3>
            <div className="bg-ivory-50 dark:bg-espresso-800/50 p-4 rounded-2xl border border-sage-200/60 dark:border-sage-800 text-xs text-espresso-800 dark:text-sage-200 leading-relaxed whitespace-pre-line font-sans">
              {job.summary}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-sage-100 dark:border-sage-800 bg-ivory-50/50 dark:bg-espresso-800/40 rounded-b-3xl flex items-center justify-between gap-3">
          <button
            onClick={() => onToggleSave(job)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border transition-colors ${
              isSaved
                ? "bg-crimson-50 dark:bg-crimson-950/80 border-crimson-200 dark:border-crimson-800 text-crimson-700 dark:text-ivory-300"
                : "bg-white dark:bg-espresso-800 border-sage-200 dark:border-sage-700 text-espresso-800 dark:text-ivory-300 hover:bg-ivory-100 dark:hover:bg-espresso-700"
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? "fill-crimson-700 text-crimson-700 dark:fill-ivory-300 dark:text-ivory-300" : ""}`} />
            <span>{isSaved ? "Saved" : "Save for Later"}</span>
          </button>

          <a
            href={job.job_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-crimson-700 hover:bg-crimson-800 text-ivory-100 font-bold text-xs shadow-md shadow-crimson-900/10 transition-all"
          >
            <span>Apply on Official ATS</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
