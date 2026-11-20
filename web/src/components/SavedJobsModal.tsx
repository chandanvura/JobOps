import React, { useState, useEffect } from "react";
import { Job } from "../types/job";
import { X, Bookmark, ExternalLink, Trash2, Download, FileText, ChevronDown, Calendar } from "lucide-react";
import { sanitizeExternalUrl, formatLocation, cleanJobText } from "../utils/jobUtils";

export type PipelineStage =
  | "Interested"
  | "Saved"
  | "Applied"
  | "Interviewing"
  | "Offer"
  | "Rejected"
  | "Archived";

export interface JobTrackingInfo {
  stage: PipelineStage;
  notes: string;
  savedAt: string;
  appliedAt?: string;
}

interface SavedJobsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedJobs: Job[];
  onRemove: (jobId: string) => void;
}

const STAGES: PipelineStage[] = [
  "Interested",
  "Saved",
  "Applied",
  "Interviewing",
  "Offer",
  "Rejected",
  "Archived",
];

export const SavedJobsModal: React.FC<SavedJobsModalProps> = ({
  isOpen,
  onClose,
  savedJobs,
  onRemove,
}) => {
  const [trackingData, setTrackingData] = useState<Record<string, JobTrackingInfo>>(() => {
    try {
      const stored = localStorage.getItem("jobops_tracking_data");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [activeStageFilter, setActiveStageFilter] = useState<string>("All");
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("jobops_tracking_data", JSON.stringify(trackingData));
    } catch {}
  }, [trackingData]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const updateStage = (jobId: string, stage: PipelineStage) => {
    setTrackingData((prev) => {
      const current = prev[jobId] || {
        stage: "Saved",
        notes: "",
        savedAt: new Date().toISOString(),
      };
      return {
        ...prev,
        [jobId]: {
          ...current,
          stage,
          appliedAt: stage === "Applied" && !current.appliedAt ? new Date().toISOString() : current.appliedAt,
        },
      };
    });
  };

  const updateNotes = (jobId: string, notes: string) => {
    setTrackingData((prev) => {
      const current = prev[jobId] || {
        stage: "Saved",
        notes: "",
        savedAt: new Date().toISOString(),
      };
      return {
        ...prev,
        [jobId]: {
          ...current,
          notes,
        },
      };
    });
  };

  const getStageColor = (stage: PipelineStage) => {
    switch (stage) {
      case "Interested":
        return "bg-sky-500/10 text-sky-500 border-sky-500/30";
      case "Saved":
        return "bg-brand-elevated text-brand-secondary border-brand-border";
      case "Applied":
        return "bg-amber-500/10 text-amber-500 border-amber-500/30";
      case "Interviewing":
        return "bg-purple-500/10 text-purple-500 border-purple-500/30";
      case "Offer":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 font-bold";
      case "Rejected":
        return "bg-rose-500/10 text-rose-500 border-rose-500/30";
      case "Archived":
        return "bg-brand-elevated/40 text-brand-muted border-brand-border/40";
    }
  };

  // Export to CSV
  const exportCSV = () => {
    if (savedJobs.length === 0) return;
    const headers = ["Company", "Title", "Discipline", "Location", "Stage", "Notes", "Job URL", "Saved Date", "Applied Date"];
    const rows = savedJobs.map((j) => {
      const track = trackingData[j.id] || { stage: "Saved", notes: "", savedAt: "" };
      return [
        `"${(j.company_name || "").replace(/"/g, '""')}"`,
        `"${(j.title || "").replace(/"/g, '""')}"`,
        `"${(j.role_label || "").replace(/"/g, '""')}"`,
        `"${(formatLocation(j.city, j.location_raw) || "").replace(/"/g, '""')}"`,
        `"${track.stage}"`,
        `"${(track.notes || "").replace(/"/g, '""')}"`,
        `"${j.job_url || ""}"`,
        `"${track.savedAt || ""}"`,
        `"${track.appliedAt || ""}"`,
      ].join(",");
    });
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `jobops_pipeline_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to JSON
  const exportJSON = () => {
    if (savedJobs.length === 0) return;
    const payload = savedJobs.map((j) => ({
      ...j,
      pipeline: trackingData[j.id] || { stage: "Saved", notes: "", savedAt: new Date().toISOString() },
    }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `jobops_pipeline_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredJobs = savedJobs.filter((j) => {
    if (activeStageFilter === "All") return true;
    const track = trackingData[j.id] || { stage: "Saved" };
    return track.stage === activeStageFilter;
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Application Pipeline"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
    >
      <div className="bg-brand-surface rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-brand-border animate-in fade-in zoom-in-95 duration-150 transition-colors">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-brand-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-accent border border-brand-primary/40 flex items-center justify-center text-brand-primary">
              <Bookmark className="w-5 h-5 fill-brand-primary" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-brand-text">Personal Pipeline Workspace</h2>
              <p className="text-xs text-brand-secondary">
                {savedJobs.length} tracked engineering jobs stored privately in your browser
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {savedJobs.length > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={exportCSV}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-brand-border bg-brand-elevated text-xs font-medium text-brand-secondary hover:text-brand-text hover:border-brand-primary/40 transition-colors"
                  title="Export pipeline to CSV spreadsheet"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
                <button
                  onClick={exportJSON}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-brand-border bg-brand-elevated text-xs font-medium text-brand-secondary hover:text-brand-text hover:border-brand-primary/40 transition-colors"
                  title="Export pipeline to JSON"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">JSON</span>
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-brand-muted hover:text-brand-text hover:bg-brand-elevated transition-colors"
              aria-label="Close pipeline modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stage Filter Chips */}
        {savedJobs.length > 0 && (
          <div className="px-5 sm:px-6 py-2.5 border-b border-brand-border bg-brand-elevated/40 flex items-center gap-1.5 overflow-x-auto text-xs">
            <button
              onClick={() => setActiveStageFilter("All")}
              className={`px-2.5 py-1 rounded-full border transition-all ${
                activeStageFilter === "All"
                  ? "bg-brand-primary text-white border-brand-primary font-semibold"
                  : "bg-brand-surface text-brand-secondary border-brand-border hover:text-brand-text"
              }`}
            >
              All ({savedJobs.length})
            </button>
            {STAGES.map((stg) => {
              const count = savedJobs.filter((j) => (trackingData[j.id]?.stage || "Saved") === stg).length;
              if (count === 0) return null;
              return (
                <button
                  key={stg}
                  onClick={() => setActiveStageFilter(stg)}
                  className={`px-2.5 py-1 rounded-full border transition-all ${
                    activeStageFilter === stg
                      ? "bg-brand-primary text-white border-brand-primary font-semibold"
                      : "bg-brand-surface text-brand-secondary border-brand-border hover:text-brand-text"
                  }`}
                >
                  {stg} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Saved Jobs List */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-3">
          {savedJobs.length === 0 ? (
            <div className="text-center py-16 text-brand-muted text-xs">
              <Bookmark className="w-10 h-10 mx-auto mb-3 opacity-30 text-brand-primary" />
              <p className="font-serif font-bold text-base text-brand-text">Your Pipeline is Empty</p>
              <p className="mt-1.5 text-brand-secondary max-w-sm mx-auto">
                Bookmark verified engineering roles from the main radar to track application stages, add personal notes, and export your job hunt data.
              </p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-12 text-brand-muted text-xs">
              <p className="text-brand-text font-semibold">No jobs in stage &ldquo;{activeStageFilter}&rdquo;</p>
              <button
                onClick={() => setActiveStageFilter("All")}
                className="mt-2 text-brand-primary hover:underline"
              >
                View all saved jobs
              </button>
            </div>
          ) : (
            filteredJobs.map((job) => {
              const tracking = trackingData[job.id] || {
                stage: "Saved",
                notes: "",
                savedAt: new Date().toISOString(),
              };
              const safeUrl = sanitizeExternalUrl(job.job_url);
              const isNotesOpen = editingNotesId === job.id;

              return (
                <div
                  key={job.id}
                  className="bg-brand-elevated/70 p-4 rounded-2xl border border-brand-border flex flex-col gap-3 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-brand-text">{job.company_name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-surface text-brand-secondary border border-brand-border">
                          {job.ats_provider}
                        </span>
                        <span className="text-xs text-brand-muted">•</span>
                        <span className="text-[11px] text-brand-secondary truncate">{job.role_label}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-brand-text truncate">{cleanJobText(job.title)}</h3>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-brand-muted">
                        <span>{formatLocation(job.city, job.location_raw)}</span>
                        <span>•</span>
                        <span>{job.experience_level || "Any Exp"}</span>
                        {tracking.appliedAt && (
                          <>
                            <span>•</span>
                            <span className="text-amber-500 font-mono flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Applied {new Date(tracking.appliedAt).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap sm:flex-nowrap">
                      {/* Pipeline Stage Select */}
                      <div className="relative">
                        <select
                          value={tracking.stage}
                          onChange={(e) => updateStage(job.id, e.target.value as PipelineStage)}
                          className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border appearance-none pr-7 focus:outline-none focus:border-brand-primary ${getStageColor(
                            tracking.stage
                          )} bg-brand-surface`}
                        >
                          {STAGES.map((stg) => (
                            <option key={stg} value={stg} className="bg-brand-surface text-brand-text">
                              {stg}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                      </div>

                      {/* Notes Toggle Button */}
                      <button
                        onClick={() => setEditingNotesId(isNotesOpen ? null : job.id)}
                        className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
                          tracking.notes
                            ? "bg-brand-accent border-brand-primary/40 text-brand-text font-medium"
                            : "bg-brand-surface border-brand-border text-brand-muted hover:text-brand-text"
                        }`}
                        title="Add/edit personal private notes"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span className="text-[11px] hidden sm:inline">
                          {tracking.notes ? "Notes" : "+ Note"}
                        </span>
                      </button>

                      {/* Apply Link */}
                      <a
                        href={safeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-brand-text hover:text-brand-primary hover:bg-brand-surface border border-brand-border transition-colors"
                        title="Open direct job application"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>

                      {/* Remove Button */}
                      <button
                        onClick={() => onRemove(job.id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-colors"
                        title="Remove from pipeline"
                        aria-label="Remove job"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Private Notes Expandable Section */}
                  {isNotesOpen && (
                    <div className="pt-2 border-t border-brand-border animate-in fade-in duration-100">
                      <label className="text-[11px] font-semibold text-brand-secondary block mb-1">
                        Private Candidate Notes (Saved automatically)
                      </label>
                      <textarea
                        value={tracking.notes || ""}
                        onChange={(e) => updateNotes(job.id, e.target.value)}
                        placeholder="e.g. Referred by Priya on LinkedIn. Prepared questions for round 2 system design. Salary range discuss..."
                        className="w-full text-xs p-2.5 rounded-xl border border-brand-border bg-brand-surface text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-primary resize-y min-h-[64px]"
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
