import React, { useState, useEffect, useRef } from "react";
import { Job } from "../types/job";
import { X, ExternalLink, Bookmark, Cpu, Copy, Check, ShieldCheck, MapPin, Clock, Laptop } from "lucide-react";
import {
  cleanJobText,
  formatPostingTime,
  formatLocation,
  formatWorkMode,
  normalizeJobUrl,
} from "../utils/jobUtils";

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
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Sync React isOpen state with native <dialog> showModal() / close()
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && job) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen, job]);

  // Progressive enhancement fallback for light-dismiss where `closedby="any"` is unsupported (e.g., Safari)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || "closedBy" in HTMLDialogElement.prototype) return;

    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };

    let pressedOutside = false;
    const onPointerDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e)) {
        dialog.close();
      }
    };

    dialog.addEventListener("pointerdown", onPointerDown);
    dialog.addEventListener("pointerup", onPointerUp);
    return () => {
      dialog.removeEventListener("pointerdown", onPointerDown);
      dialog.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  const handleNativeClose = () => {
    const dialog = dialogRef.current;
    if (dialog) dialog.returnValue = "";
    onClose();
  };

  const cleanSummary = job ? cleanJobText(job.summary || `${job.title} at ${job.company_name}`) : "";
  const cleanTitle = job ? cleanJobText(job.title) : "";
  const safeApplyUrl = job ? normalizeJobUrl(job.job_url) : "#";
  const locationDisplay = job ? formatLocation(job.city, job.location_raw) : "";
  const workModeDisplay = job ? formatWorkMode(job.work_mode) : "";
  const timeDisplay = job ? formatPostingTime(job.posted_at, job.age_hours) : "";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(safeApplyUrl !== "#" ? safeApplyUrl : window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={handleNativeClose}
      aria-labelledby="job-detail-modal-title"
      {...({ closedby: "any" } as Record<string, string>)}
    >
      {job && (
        <div className="bg-brand-surface rounded-[20px] w-full max-h-[90dvh] flex flex-col shadow-2xl border border-brand-border overflow-hidden">
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-brand-border flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5 sm:gap-4 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-brand-elevated border border-brand-border flex items-center justify-center font-bold text-brand-text text-xl flex-shrink-0">
                {job.company_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap text-xs">
                  <span className="font-semibold text-brand-text text-sm">{job.company_name}</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-brand-elevated text-brand-secondary font-medium uppercase">
                    {job.ats_provider}
                  </span>
                  <span className="text-brand-muted" aria-hidden="true">·</span>
                  <span className="text-brand-secondary">{job.role_label}</span>
                </div>
                <h1 id="job-detail-modal-title" className="text-lg sm:text-xl font-bold text-brand-text leading-snug">
                  {cleanTitle}
                </h1>
              </div>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="p-2 rounded-xl text-brand-muted hover:text-brand-text hover:bg-brand-elevated btn-tactile"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Body */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-brand-text">
            {/* Metadata Strip (Material 3 tonal cells) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-brand-secondarySurface dark:bg-brand-elevated p-3 rounded-xl">
                <span className="text-[11px] font-medium text-brand-muted block mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Experience</span>
                </span>
                <span className="text-xs font-semibold text-brand-text">{job.experience_level || "Any experience"}</span>
              </div>
              <div className="bg-brand-secondarySurface dark:bg-brand-elevated p-3 rounded-xl">
                <span className="text-[11px] font-medium text-brand-muted block mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>Location</span>
                </span>
                <span className="text-xs font-semibold text-brand-text">{locationDisplay}</span>
              </div>
              <div className="bg-brand-secondarySurface dark:bg-brand-elevated p-3 rounded-xl">
                <span className="text-[11px] font-medium text-brand-muted block mb-1 flex items-center gap-1">
                  <Laptop className="w-3 h-3" />
                  <span>Work mode</span>
                </span>
                <span className="text-xs font-semibold text-brand-text">{workModeDisplay}</span>
              </div>
              <div className="bg-brand-secondarySurface dark:bg-brand-elevated p-3 rounded-xl">
                <span className="text-[11px] font-medium text-brand-muted block mb-1">Freshness</span>
                <span className="text-xs font-semibold text-brand-primary flex items-center gap-1 font-mono tabular-nums">
                  {timeDisplay}
                </span>
              </div>
            </div>

            {/* Technical Skills */}
            {job.skills && job.skills.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-brand-secondary mb-2 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-brand-muted" />
                  <span>Extracted tech stack & skills</span>
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {job.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 text-xs font-mono font-medium rounded-lg bg-brand-secondarySurface dark:bg-brand-elevated text-brand-secondary"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Verification Evidence */}
            <div className="bg-brand-secondarySurface dark:bg-brand-elevated/70 border border-brand-borderSubtle rounded-2xl p-4">
              <h2 className="text-xs font-semibold text-brand-text mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-brand-primary" />
                <span>Direct ATS ingestion telemetry</span>
              </h2>
              <p className="text-xs text-brand-secondary leading-relaxed">
                This opportunity was ingested directly from {job.company_name}&apos;s official {job.ats_provider} board.
                Zero recruiter middlemen, no third-party reposts, and no expired listings. All candidates apply directly on the employer&apos;s verified careers endpoint.
              </p>
            </div>

            {/* Job Overview / Clean Snippet */}
            <div>
              <h2 className="text-xs font-semibold text-brand-secondary mb-2">
                Role summary & requirements
              </h2>
              <div className="bg-brand-secondarySurface/60 dark:bg-brand-elevated/50 p-4 rounded-2xl border border-brand-borderSubtle text-xs text-brand-secondary leading-relaxed whitespace-pre-line font-sans">
                {cleanSummary}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-brand-border bg-brand-elevated/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onToggleSave(job)}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-semibold rounded-xl border btn-tactile ${
                  isSaved
                    ? "bg-brand-primary/10 border-brand-primary text-brand-primary"
                    : "bg-brand-surface border-brand-border text-brand-secondary hover:text-brand-text hover:bg-brand-elevated"
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? "fill-brand-primary text-brand-primary" : ""}`} />
                <span>{isSaved ? "Saved" : "Save job"}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-brand-border bg-brand-surface text-brand-secondary hover:text-brand-text btn-tactile"
                title="Copy direct application URL"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copied ? "Copied" : "Copy link"}</span>
              </button>
            </div>

            <a
              href={safeApplyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-[12px] bg-brand-primary hover:bg-brand-hover text-white font-semibold text-xs shadow-sm shadow-[#0071E3]/20 btn-tactile"
              autoFocus
            >
              <span>Apply direct</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </dialog>
  );
};
