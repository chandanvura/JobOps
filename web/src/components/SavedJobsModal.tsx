import React, { useState, useEffect, useRef } from "react";
import { Job } from "../types/job";
import { X, Bookmark, ExternalLink, Trash2, Download, Upload, FileText, Calendar, Clock, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";
import { sanitizeExternalUrl, normalizeJobUrl, formatLocation, cleanJobText, sanitizeCsvField, validateJobImportData, ValidatedJobImport } from "../utils/jobUtils";

export type PipelineStage =
  | "Saved"
  | "Interested"
  | "Applied"
  | "Assessment"
  | "Interview"
  | "Offer"
  | "Rejected"
  | "Withdrawn"
  | "Follow-up";

export interface JobTrackingInfo {
  stage: PipelineStage;
  notes: string;
  savedAt: string;
  appliedAt?: string;
  followUpDate?: string;
}

interface SavedJobsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedJobs: Job[];
  onRemove: (jobId: string) => void;
  onImportBackup?: (importedJobs: Job[]) => void;
}

const STAGES: PipelineStage[] = [
  "Saved",
  "Interested",
  "Applied",
  "Assessment",
  "Interview",
  "Offer",
  "Rejected",
  "Withdrawn",
  "Follow-up",
];

const getStageBadge = (stage: PipelineStage) => {
  switch (stage) {
    case "Saved":
      return "bg-brand-elevated text-brand-secondary border-brand-border";
    case "Interested":
      return "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800";
    case "Applied":
      return "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    case "Assessment":
      return "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
    case "Interview":
      return "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800";
    case "Offer":
      return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
    case "Rejected":
      return "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800";
    case "Withdrawn":
      return "bg-brand-elevated text-brand-muted border-brand-border";
    case "Follow-up":
      return "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
    default:
      return "bg-brand-elevated text-brand-secondary border-brand-border";
  }
};

export const SavedJobsModal: React.FC<SavedJobsModalProps> = ({
  isOpen,
  onClose,
  savedJobs,
  onRemove,
  onImportBackup,
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<ValidatedJobImport | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus(null);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rawJson = JSON.parse(event.target?.result as string);
        const validation = validateJobImportData(rawJson);

        if (!validation.valid) {
          setImportError(
            `Import failed: ${validation.errors.join("; ") || "No valid job records found in JSON."}`
          );
          setPendingImport(null);
          return;
        }

        // Show preview dialog for user confirmation before overwriting or merging
        setPendingImport(validation);
      } catch (err) {
        setImportError("Import failed: File is not a valid JSON document.");
        setPendingImport(null);
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = "";
  };

  const handleConfirmImport = () => {
    if (!pendingImport) return;

    try {
      const newTracking: Record<string, JobTrackingInfo> = { ...trackingData, ...pendingImport.trackingMap };
      setTrackingData(newTracking);

      const importedJobIds = pendingImport.validJobs.map((j) => j.id);
      const currentSaved = JSON.parse(localStorage.getItem("jobops_saved_ids") || "[]");
      const merged = Array.from(new Set([...currentSaved, ...importedJobIds]));
      localStorage.setItem("jobops_saved_ids", JSON.stringify(merged));

      if (onImportBackup) {
        onImportBackup(pendingImport.validJobs);
      }

      setImportStatus(
        `Successfully imported ${pendingImport.validJobs.length} application records (${pendingImport.duplicateCount} duplicate records skipped).`
      );
      setPendingImport(null);
      setImportError(null);
      setTimeout(() => setImportStatus(null), 5000);
    } catch (e) {
      setImportError("Failed to persist imported applications into storage.");
    }
  };

  const handleCancelImport = () => {
    setPendingImport(null);
    setImportError(null);
  };

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

  const updateFollowUpDate = (jobId: string, followUpDate: string) => {
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
          followUpDate,
        },
      };
    });
  };

  const filteredSavedJobs = savedJobs.filter((job) => {
    if (activeStageFilter === "All") return true;
    const info = trackingData[job.id];
    const stage = info ? info.stage : "Saved";
    return stage === activeStageFilter;
  });

  // Calculate Pipeline Metrics
  const metrics = {
    total: savedJobs.length,
    applied: savedJobs.filter((j) => (trackingData[j.id]?.stage || "Saved") === "Applied").length,
    inProgress: savedJobs.filter((j) => {
      const s = trackingData[j.id]?.stage;
      return s === "Assessment" || s === "Interview" || s === "Follow-up";
    }).length,
    offers: savedJobs.filter((j) => (trackingData[j.id]?.stage || "Saved") === "Offer").length,
  };

  // Export Pipeline as CSV with formula injection protection (CWE-1236)
  const exportToCSV = () => {
    if (savedJobs.length === 0) return;
    const headers = ["Company", "Title", "Location", "ATS Provider", "Stage", "Applied Date", "Notes", "Job URL"];
    const rows = savedJobs.map((job) => {
      const tracking = trackingData[job.id] || { stage: "Saved", notes: "", appliedAt: "" };
      return [
        sanitizeCsvField(job.company_name),
        sanitizeCsvField(job.title),
        sanitizeCsvField(formatLocation(job.city, job.location_raw)),
        sanitizeCsvField(job.ats_provider),
        sanitizeCsvField(tracking.stage),
        sanitizeCsvField(tracking.appliedAt || ""),
        sanitizeCsvField(tracking.notes || ""),
        sanitizeCsvField(job.job_url),
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `jobops-pipeline-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export Pipeline as JSON
  const exportToJSON = () => {
    if (savedJobs.length === 0) return;
    const exportData = savedJobs.map((job) => ({
      ...job,
      pipelineTracking: trackingData[job.id] || { stage: "Saved", notes: "" },
    }));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `jobops-pipeline-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Personal Pipeline & Application Workspace"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
    >
      <div className="bg-brand-surface rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-brand-border animate-in fade-in zoom-in-95 duration-150 transition-colors">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-brand-border flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-elevated text-brand-primary border border-brand-border flex items-center justify-center">
              <Bookmark className="w-5 h-5 fill-brand-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-brand-text flex items-center gap-2">
                <span>Personal pipeline & workspace</span>
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-brand-elevated text-brand-secondary border border-brand-border tabular-nums">
                  {savedJobs.length} active
                </span>
              </h2>
              <p className="text-xs text-brand-secondary">
                Track interview stages, private candidate notes, and export your application history.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileImport}
              accept=".json"
              className="hidden"
            />
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-brand-surface hover:bg-brand-elevated text-brand-text border border-brand-border active:scale-[0.98] transition-colors shadow-sm"
                title="Restore applications from a previously exported JSON backup"
              >
                <Upload className="w-3.5 h-3.5 text-brand-primary" />
                <span>Import JSON</span>
              </button>
              {savedJobs.length > 0 && (
                <>
                  <button
                    onClick={exportToCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-brand-surface hover:bg-brand-elevated text-brand-text border border-brand-border active:scale-[0.98] transition-colors shadow-sm"
                    title="Export pipeline to CSV spreadsheet"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                  <button
                    onClick={exportToJSON}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-brand-surface hover:bg-brand-elevated text-brand-text border border-brand-border active:scale-[0.98] transition-colors shadow-sm"
                    title="Export pipeline as JSON backup"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>JSON</span>
                  </button>
                </>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-brand-muted hover:text-brand-text hover:bg-brand-elevated active:scale-[0.98] transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Import Notification Banner */}
        {importStatus && (
          <div className="px-5 py-2.5 bg-blue-500/10 border-b border-blue-500/20 text-xs text-brand-primary flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-brand-primary flex-shrink-0" />
            <span>{importStatus}</span>
          </div>
        )}

        {importError && (
          <div className="px-5 py-2.5 bg-rose-500/10 border-b border-rose-500/20 text-xs text-rose-500 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span>{importError}</span>
            </div>
            <button
              onClick={() => setImportError(null)}
              className="text-xs underline hover:no-underline font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Pending Import Preview & Confirmation */}
        {pendingImport && (
          <div className="px-5 py-3 bg-amber-500/10 border-b border-amber-500/20 text-xs text-brand-text">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span className="font-semibold text-brand-text">
                  Confirm Application Import Preview:
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancelImport}
                  className="px-2.5 py-1 rounded-lg border border-brand-border bg-brand-surface hover:bg-brand-elevated text-brand-secondary text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmImport}
                  className="px-3 py-1 rounded-lg bg-brand-primary hover:bg-brand-hover text-white font-semibold text-xs transition-colors shadow-sm"
                >
                  Import {pendingImport.validJobs.length} Records
                </button>
              </div>
            </div>
            <p className="text-brand-secondary text-[11px]">
              Found <strong>{pendingImport.validJobs.length} valid jobs</strong> ready to restore.{" "}
              {pendingImport.duplicateCount > 0 && (
                <span className="text-amber-500">
                  ({pendingImport.duplicateCount} duplicate entries will be skipped).
                </span>
              )}
            </p>
          </div>
        )}

        {/* Compact Pipeline Metrics Cards */}
        {savedJobs.length > 0 && (
          <div className="px-5 sm:px-6 py-3 border-b border-brand-border bg-brand-elevated/40 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-brand-surface p-2.5 rounded-xl border border-brand-border flex items-center justify-between">
              <span className="text-xs text-brand-secondary font-medium">Saved</span>
              <span className="text-base font-bold text-brand-text font-mono tabular-nums">{metrics.total}</span>
            </div>
            <div className="bg-brand-surface p-2.5 rounded-xl border border-brand-border flex items-center justify-between">
              <span className="text-xs text-brand-primary font-medium">Applied</span>
              <span className="text-base font-bold text-brand-primary font-mono tabular-nums">{metrics.applied}</span>
            </div>
            <div className="bg-brand-surface p-2.5 rounded-xl border border-brand-border flex items-center justify-between">
              <span className="text-xs text-violet-500 font-medium">Interviewing</span>
              <span className="text-base font-bold text-violet-500 font-mono tabular-nums">{metrics.inProgress}</span>
            </div>
            <div className="bg-brand-surface p-2.5 rounded-xl border border-brand-border flex items-center justify-between">
              <span className="text-xs text-emerald-500 font-medium">Offers</span>
              <span className="text-base font-bold text-emerald-500 font-mono tabular-nums">{metrics.offers}</span>
            </div>
          </div>
        )}

        {/* Stage Filter Tabs */}
        {savedJobs.length > 0 && (
          <div className="px-5 sm:px-6 py-2.5 border-b border-brand-border bg-brand-surface flex items-center gap-1.5 overflow-x-auto text-xs">
            <button
              onClick={() => setActiveStageFilter("All")}
              className={`px-3 py-1 rounded-full border active:scale-[0.98] transition-all ${
                activeStageFilter === "All"
                  ? "bg-brand-primary text-white border-brand-primary font-semibold shadow-sm"
                  : "bg-brand-elevated text-brand-secondary border-brand-border hover:text-brand-text"
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
                  className={`px-3 py-1 rounded-full border active:scale-[0.98] transition-all ${
                    activeStageFilter === stg
                      ? "bg-brand-primary text-white border-brand-primary font-semibold shadow-sm"
                      : "bg-brand-elevated text-brand-secondary border-brand-border hover:text-brand-text"
                  }`}
                >
                  {stg} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Saved Jobs List */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-3.5 flex-1">
          {savedJobs.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-elevated text-brand-primary border border-brand-border mx-auto flex items-center justify-center mb-3">
                <Bookmark className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-brand-text">No saved jobs in your pipeline</h3>
              <p className="text-xs text-brand-secondary mt-1 max-w-sm mx-auto">
                Bookmark verified engineering roles from the jobs radar to track your applications and private interview notes here.
              </p>
            </div>
          ) : filteredSavedJobs.length === 0 ? (
            <div className="text-center py-12 text-brand-muted text-xs">
              No jobs currently in the &ldquo;{activeStageFilter}&rdquo; stage.
            </div>
          ) : (
            filteredSavedJobs.map((job) => {
              const tracking = trackingData[job.id] || {
                stage: "Saved",
                notes: "",
                savedAt: new Date().toISOString(),
              };
              const isNotesOpen = editingNotesId === job.id;

              return (
                <div
                  key={job.id}
                  className="bg-brand-surface p-4 rounded-xl border border-brand-border flex flex-col gap-3 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-bold text-brand-text">{job.company_name}</span>
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-brand-elevated text-brand-secondary border border-brand-border uppercase">
                          {job.ats_provider}
                        </span>
                        <span className="text-xs text-brand-muted">•</span>
                        <span className="text-xs text-brand-secondary truncate">{job.role_label}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-brand-text truncate">
                        {cleanJobText(job.title)}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-brand-secondary flex-wrap">
                        <span>{formatLocation(job.city, job.location_raw)}</span>
                        <span>•</span>
                        <span>{job.experience_level || "Any exp"}</span>
                        {tracking.appliedAt && (
                          <>
                            <span>•</span>
                            <span className="text-brand-primary font-mono flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Applied {new Date(tracking.appliedAt).toLocaleDateString()}
                            </span>
                          </>
                        )}
                        {tracking.followUpDate && (
                          <>
                            <span>•</span>
                            <span className="text-amber-500 font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Target {new Date(tracking.followUpDate).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Pipeline Stage Dropdown & Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      {/* Stage Selector */}
                      <div className="relative">
                        <select
                          value={tracking.stage || "Saved"}
                          onChange={(e) => updateStage(job.id, e.target.value as PipelineStage)}
                          className={`text-xs font-semibold py-1.5 pl-3 pr-8 rounded-xl border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary/20 ${getStageBadge(
                            tracking.stage || "Saved"
                          )}`}
                        >
                          {STAGES.map((stg) => (
                            <option key={stg} value={stg} className="bg-brand-surface text-brand-text">
                              {stg}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Notes Toggle Button */}
                      <button
                        onClick={() => setEditingNotesId(isNotesOpen ? null : job.id)}
                        className={`p-2 rounded-xl border text-xs flex items-center gap-1 active:scale-[0.98] transition-colors ${
                          tracking.notes?.trim() || tracking.followUpDate
                            ? "bg-brand-elevated text-brand-primary border-brand-primary/40"
                            : "bg-brand-surface text-brand-secondary border-brand-border hover:text-brand-text"
                        }`}
                        title="Candidate private notes"
                      >
                        <FileText className="w-4 h-4" />
                        <span className="hidden sm:inline">{tracking.notes?.trim() ? "Notes" : "+ Note"}</span>
                      </button>

                      {/* Direct Apply Button */}
                      <a
                        href={normalizeJobUrl(job.job_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-brand-primary hover:bg-brand-hover text-white active:scale-[0.98] transition-colors"
                        title="Open direct job application"
                        aria-label="Open job application"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>

                      {/* Remove Button with Confirmation Guard */}
                      {confirmDeleteId === job.id ? (
                        <div className="flex items-center gap-1.5 bg-rose-500/10 p-1 rounded-xl border border-rose-500/30 animate-in fade-in duration-100">
                          <span className="text-xs font-semibold text-rose-500 pl-1">Remove?</span>
                          <button
                            onClick={() => {
                              onRemove(job.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2 py-1 rounded-lg bg-rose-600 text-white font-semibold text-xs hover:bg-rose-700 active:scale-[0.98] transition-colors shadow-sm"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 rounded-lg bg-brand-elevated text-brand-text font-medium text-xs hover:bg-brand-surface active:scale-[0.98] transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(job.id)}
                          className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 active:scale-[0.98] transition-colors"
                          title="Remove from pipeline"
                          aria-label="Remove job"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Private Notes Expandable Section */}
                  {isNotesOpen && (
                    <div className="pt-2.5 border-t border-brand-border space-y-2.5 animate-in fade-in duration-100">
                      <div>
                        <label className="text-xs font-semibold text-brand-secondary block mb-1">
                          Private candidate notes (Saved automatically)
                        </label>
                        <textarea
                          value={tracking.notes || ""}
                          onChange={(e) => updateNotes(job.id, e.target.value)}
                          placeholder="e.g. Referred by Priya on LinkedIn. Prepared questions for round 2 system design. Salary range discuss..."
                          className="w-full text-xs p-2.5 rounded-xl border border-brand-border bg-brand-elevated text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 resize-y min-h-[64px]"
                        />
                      </div>

                      <div className="flex items-center gap-2 max-w-xs">
                        <label className="text-xs font-semibold text-brand-secondary flex items-center gap-1 flex-shrink-0">
                          <Calendar className="w-3.5 h-3.5 text-brand-primary" />
                          <span>Interview / target date:</span>
                        </label>
                        <input
                          type="date"
                          value={tracking.followUpDate || ""}
                          onChange={(e) => updateFollowUpDate(job.id, e.target.value)}
                          className="px-2 py-1 text-xs rounded-xl border border-brand-border bg-brand-elevated text-brand-text focus:outline-none focus:border-brand-primary"
                        />
                      </div>
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
