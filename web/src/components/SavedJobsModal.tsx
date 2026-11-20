import React, { useState } from "react";
import { Job } from "../types/job";
import { X, Bookmark, ExternalLink, Trash2, CheckCircle2 } from "lucide-react";

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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Bookmark className="w-5 h-5 fill-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Application Pipeline</h2>
              <p className="text-xs text-slate-500">
                {savedJobs.length} tracked jobs saved privately in your browser
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {savedJobs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No saved jobs yet.</p>
              <p className="mt-1 text-slate-500">Bookmark jobs from the main feed to track them here!</p>
            </div>
          ) : (
            savedJobs.map((job) => {
              const currentStage = stages[job.id] || "saved";
              return (
                <div
                  key={job.id}
                  className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-800">{job.company_name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/60 text-slate-600 font-medium">
                        {job.ats_provider}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 truncate">{job.title}</h3>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                      <span>{job.city || "India"}</span>
                      <span>•</span>
                      <span>{job.experience_level}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select
                      value={currentStage}
                      onChange={(e) => handleStageChange(job.id, e.target.value as any)}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-indigo-500"
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
                      className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="Open job posting"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>

                    <button
                      onClick={() => onRemove(job.id)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
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
