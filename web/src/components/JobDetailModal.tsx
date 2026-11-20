import React, { useState } from "react";
import { Job } from "../types/job";
import { X, ExternalLink, Bookmark, Cpu, CheckCircle2, Copy, Check, ShieldCheck, MapPin, Clock, Laptop } from "lucide-react";
import {
  cleanJobText,
  formatPostingTime,
  formatLocation,
  formatWorkMode,
  sanitizeExternalUrl,
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

  // Handle Escape key to close modal
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !job) return null;

  const cleanSummary = cleanJobText(job.summary || `${job.title} at ${job.company_name}`);
  const cleanTitle = cleanJobText(job.title);
  const safeApplyUrl = sanitizeExternalUrl(job.job_url);
  const locationDisplay = formatLocation(job.city, job.location_raw);
  const workModeDisplay = formatWorkMode(job.work_mode);
  const timeDisplay = formatPostingTime(job.posted_at, job.age_hours);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(safeApplyUrl !== "#" ? safeApplyUrl : window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Job Details"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
    >
      <div className="bg-brand-surface rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-brand-border animate-in fade-in zoom-in-95 duration-150 transition-colors">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-brand-border flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 sm:gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-brand-elevated border border-brand-border flex items-center justify-center font-bold text-brand-text text-xl flex-shrink-0">
              {job.company_name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-semibold text-brand-text text-sm">{job.company_name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-elevated text-brand-secondary font-semibold border border-brand-border uppercase">
                  {job.ats_provider}
                </span>
                <span className="text-[11px] text-brand-muted">•</span>
                <span className="text-[11px] text-brand-secondary">{job.role_label}</span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-brand-text leading-snug">
                {cleanTitle}
              </h1>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-brand-muted hover:text-brand-text hover:bg-brand-elevated transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-brand-text">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-brand-elevated p-3 rounded-xl border border-brand-border">
              <span className="text-[10px] font-mono font-medium text-brand-muted block mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Experience</span>
              </span>
              <span className="text-xs font-semibold text-brand-text">{job.experience_level || "Any Experience"}</span>
            </div>
            <div className="bg-brand-elevated p-3 rounded-xl border border-brand-border">
              <span className="text-[10px] font-mono font-medium text-brand-muted block mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>Location</span>
              </span>
              <span className="text-xs font-semibold text-brand-text">{locationDisplay}</span>
            </div>
            <div className="bg-brand-elevated p-3 rounded-xl border border-brand-border">
              <span className="text-[10px] font-mono font-medium text-brand-muted block mb-1 flex items-center gap-1">
                <Laptop className="w-3 h-3" />
                <span>Work Mode</span>
              </span>
              <span className="text-xs font-semibold text-brand-text">{workModeDisplay}</span>
            </div>
            <div className="bg-brand-elevated p-3 rounded-xl border border-brand-border">
              <span className="text-[10px] font-mono font-medium text-brand-muted block mb-1">Freshness</span>
              <span className="text-xs font-semibold text-brand-primary flex items-center gap-1 font-mono">
                {timeDisplay}
              </span>
            </div>
          </div>

          {/* Technical Skills */}
          {job.skills && job.skills.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-secondary mb-2 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-brand-muted" />
                <span>Extracted Tech Stack & Skills</span>
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {job.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2.5 py-1 text-xs font-mono font-medium rounded-lg bg-brand-elevated text-brand-secondary border border-brand-border"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Verification Evidence */}
          <div className="bg-brand-elevated/70 border border-brand-border rounded-2xl p-4">
            <h4 className="text-xs font-semibold text-brand-text mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-brand-primary" />
              <span>Direct ATS Ingestion Telemetry</span>
            </h4>
            <p className="text-xs text-brand-secondary leading-relaxed">
              This opportunity was ingested directly from {job.company_name}&apos;s official {job.ats_provider} board. 
              Zero recruiter middlemen, no third-party reposts, and no expired listings. All candidates apply directly on the employer&apos;s verified careers endpoint.
            </p>
          </div>

          {/* Job Overview / Clean Snippet */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-secondary mb-2">
              Role Summary & Requirements
            </h3>
            <div className="bg-brand-elevated/50 p-4 rounded-2xl border border-brand-border text-xs text-brand-secondary leading-relaxed whitespace-pre-line font-sans">
              {cleanSummary}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-brand-border bg-brand-elevated/40 rounded-b-3xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleSave(job)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-semibold rounded-xl border transition-colors ${
                isSaved
                  ? "bg-brand-primary/10 border-brand-primary text-brand-primary"
                  : "bg-brand-surface border-brand-border text-brand-secondary hover:text-brand-text hover:bg-brand-elevated"
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? "fill-brand-primary text-brand-primary" : ""}`} />
              <span>{isSaved ? "Saved" : "Save Job"}</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-brand-border bg-brand-surface text-brand-secondary hover:text-brand-text transition-colors"
              title="Copy direct application URL"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? "Copied!" : "Copy Link"}</span>
            </button>
          </div>

          <a
            href={safeApplyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-hover text-[#FFF0DC] font-semibold text-xs shadow-md shadow-brand-primary/25 hover:shadow-lg transition-all duration-200"
          >
            <span>Apply Directly</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
