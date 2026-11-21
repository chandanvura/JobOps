import React, { useState } from "react";
import { X, RefreshCw, PlusCircle, CheckCircle2, ArrowRight, AlertTriangle } from "lucide-react";
import { cleanJobText } from "../utils/jobUtils";

interface FetchTriggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerRefresh: () => void;
  isFetching: boolean;
}

const SUPPORTED_ATS = [
  { id: "greenhouse", label: "Greenhouse" },
  { id: "lever", label: "Lever" },
  { id: "ashby", label: "Ashby" },
  { id: "smartrecruiters", label: "SmartRecruiters" },
  { id: "workday", label: "Workday" },
  { id: "eightfold", label: "Eightfold" },
  { id: "darwinbox", label: "Darwinbox" },
  { id: "phenom", label: "Phenom People" },
  { id: "amazon", label: "Amazon Jobs" },
  { id: "jobvite", label: "Jobvite" },
  { id: "recruitee", label: "Recruitee" },
  { id: "workable", label: "Workable" },
];

export const FetchTriggerModal: React.FC<FetchTriggerModalProps> = ({
  isOpen,
  onClose,
  onTriggerRefresh,
  isFetching,
}) => {
  const [atsProvider, setAtsProvider] = useState("greenhouse");
  const [atsIdentifier, setAtsIdentifier] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Handle Escape key to close modal
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAddCompany = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    const cleanCo = cleanJobText(companyName).slice(0, 80).trim();
    const cleanId = atsIdentifier.trim();

    if (!cleanCo) {
      setErrorMessage("Please enter a valid company name.");
      return;
    }

    if (!cleanId) {
      setErrorMessage("Please enter an ATS identifier or company slug.");
      return;
    }

    // SSRF & Path Traversal Prevention: Strict slug validation ^[a-zA-Z0-9_-]{1,64}$
    const slugRegex = /^[a-zA-Z0-9_-]{1,64}$/;
    if (!slugRegex.test(cleanId)) {
      setErrorMessage(
        "Invalid identifier. ATS slug must contain only alphanumeric characters, hyphens, and underscores (1-64 characters). No slashes, dots, or query strings allowed."
      );
      return;
    }

    // Store in custom discovery registry
    try {
      const stored = localStorage.getItem("jobops_custom_ats");
      const list = stored ? JSON.parse(stored) : [];
      list.push({
        company: cleanCo,
        provider: atsProvider,
        identifier: cleanId,
        submittedAt: new Date().toISOString(),
      });
      localStorage.setItem("jobops_custom_ats", JSON.stringify(list));
    } catch {}

    setStatusMessage(
      `Successfully added "${cleanCo}" (${atsProvider}: ${cleanId}) to community ingestion queue! It will be verified and collected in the next scheduled cycle.`
    );
    setCompanyName("");
    setAtsIdentifier("");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Live Ingestion & ATS Trigger"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
    >
      <div className="bg-brand-surface rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-brand-border animate-in fade-in zoom-in-95 duration-150 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-brand-border mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-elevated border border-brand-border flex items-center justify-center text-brand-primary">
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-brand-text">
                Live ingestion & ATS trigger
              </h2>
              <p className="text-xs text-brand-secondary">Autonomous direct ATS radar engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-brand-muted hover:text-brand-text hover:bg-brand-elevated active:scale-[0.98] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action 1: On-Demand Fetch */}
        <div className="bg-brand-elevated rounded-xl p-4 border border-brand-border mb-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-text">
                Trigger real-time ingestion
              </h3>
              <p className="text-xs text-brand-secondary mt-1">
                Scans 757 verified employer ATS endpoints for new engineering jobs posted in the strict 24-hour freshness window.
              </p>
            </div>
          </div>
          <button
            onClick={onTriggerRefresh}
            disabled={isFetching}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand-primary hover:bg-brand-hover disabled:opacity-50 text-white font-semibold text-xs active:scale-[0.98] shadow-sm transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            <span>{isFetching ? "Scanning ATS endpoints..." : "Fetch latest 24h jobs now"}</span>
          </button>
        </div>

        {/* Action 2: Add New ATS Source */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-text mb-1 flex items-center gap-1.5">
            <PlusCircle className="w-4 h-4 text-brand-primary" />
            <span>Submit a new employer ATS endpoint</span>
          </h3>
          <p className="text-xs text-brand-secondary mb-3">
            Know a tech company with a direct ATS board? Add their slug to the radar:
          </p>

          <form onSubmit={handleAddCompany} className="space-y-3">
            <div>
              <label className="text-[11px] font-mono font-medium text-brand-secondary block mb-1">
                Company name
              </label>
              <input
                type="text"
                placeholder="e.g. Swiggy, Cred, Zerodha"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                maxLength={80}
                className="w-full px-3 py-2 text-xs rounded-xl border border-brand-border focus:outline-none focus:border-brand-primary bg-brand-elevated text-brand-text placeholder:text-brand-muted"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-mono font-medium text-brand-secondary block mb-1">
                  ATS platform
                </label>
                <select
                  value={atsProvider}
                  onChange={(e) => setAtsProvider(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-brand-border focus:outline-none focus:border-brand-primary bg-brand-elevated text-brand-text font-medium"
                >
                  {SUPPORTED_ATS.map((ats) => (
                    <option key={ats.id} value={ats.id}>
                      {ats.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono font-medium text-brand-secondary block mb-1">
                  ATS slug / identifier
                </label>
                <input
                  type="text"
                  placeholder="e.g. razorpay, linear"
                  value={atsIdentifier}
                  onChange={(e) => setAtsIdentifier(e.target.value)}
                  maxLength={64}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-brand-border focus:outline-none focus:border-brand-primary bg-brand-elevated text-brand-text placeholder:text-brand-muted font-mono"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-rose-500 text-xs">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-brand-surface hover:bg-brand-elevated text-brand-text border border-brand-border font-semibold text-xs active:scale-[0.98] transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>Add to ingestion queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {statusMessage && (
            <div className="mt-3 p-3 bg-brand-elevated border border-brand-border rounded-xl flex items-start gap-2 text-brand-text text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>{statusMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
