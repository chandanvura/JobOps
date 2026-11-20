import React, { useState } from "react";
import { Job } from "../types/job";
import { X, Bookmark, ExternalLink, Trash2 } from "lucide-react";

interface SavedJobsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedJobs: Job[];
  onRemove: (jobId: string) => void;
}

export const SavedJobsModal: React.FC<SavedJobsModalProps> = ({
  isOpen,
  onClose,
  savedJobs,
  onRemove,
}) => {
  const [stages, setStages] = useState<Record<string, "saved" | "applied" | "interviewing" | "offer">>({});

  if (!isOpen) return null;

  const handleStageChange = (jobId: string, stage: "saved" | "applied" | "interviewing" | "offer") => {
    setStages((prev) => ({ ...prev, [jobId]: stage }));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-espresso-950/70 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-espresso-900 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-sage-200 dark:border-sage-800 animate-in fade-in zoom-in-95 duration-150 transition-colors">
        <div className="p-6 border-b border-sage-100 dark:border-sage-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-crimson-50 dark:bg-crimson-950 border border-crimson-200 dark:border-crimson-800 flex items-center justify-center text-crimson-700 dark:text-ivory-300">
              <Bookmark className="w-5 h-5 fill-crimson-700 dark:fill-ivory-300" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-espresso-950 dark:text-ivory-100">Application Pipeline</h2>
              <p className="text-xs text-sage-600 dark:text-sage-400">
                {savedJobs.length} tracked jobs stored locally in your browser
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-sage-400 hover:text-crimson-800 dark:hover:text-white hover:bg-ivory-100 dark:hover:bg-espresso-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {savedJobs.length === 0 ? (
            <div className="text-center py-12 text-sage-500 dark:text-sage-400 text-xs">
              <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="font-serif font-bold text-sm text-espresso-900 dark:text-ivory-200">No saved jobs yet.</p>
              <p className="mt-1 text-sage-600 dark:text-sage-400">Bookmark jobs from the main feed to track them across your pipeline.</p>
            </div>
          ) : (
            savedJobs.map((job) => {
              const currentStage = stages[job.id] || "saved";
              return (
                <div
                  key={job.id}
                  className="bg-ivory-50 dark:bg-espresso-800/60 p-4 rounded-2xl border border-sage-200/80 dark:border-sage-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-espresso-900 dark:text-ivory-200">{job.company_name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-ivory-200 dark:bg-espresso-700 text-sage-800 dark:text-sage-300 font-medium">
                        {job.ats_provider}
                      </span>
                    </div>
                    <h3 className="font-serif text-sm font-bold text-espresso-950 dark:text-ivory-100 truncate">{job.title}</h3>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-sage-600 dark:text-sage-400">
                      <span>{job.city || "India"}</span>
                      <span>•</span>
                      <span>{job.experience_level}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select
                      value={currentStage}
                      onChange={(e) => handleStageChange(job.id, e.target.value as any)}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-sage-200 dark:border-sage-700 bg-white dark:bg-espresso-800 text-espresso-900 dark:text-ivory-200 focus:outline-none focus:border-crimson-600"
                    >
                      <option value="saved">Saved</option>
                      <option value="applied">Applied</option>
                      <option value="interviewing">Interviewing</option>
                      <option value="offer">Offer Received</option>
                    </select>

                    <a
                      href={job.job_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-crimson-700 dark:text-ivory-300 hover:bg-crimson-50 dark:hover:bg-crimson-950 transition-colors"
                      title="Open job posting"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>

                    <button
                      onClick={() => onRemove(job.id)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
