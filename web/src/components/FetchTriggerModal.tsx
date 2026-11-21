import React, { useState, useEffect } from "react";
import {
  X,
  RefreshCw,
  PlusCircle,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
  Clock,
  Send,
  ShieldAlert,
  GitBranch,
  Key,
} from "lucide-react";
import { cleanJobText, sanitizeExternalUrl } from "../utils/jobUtils";

interface FetchTriggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerRefresh: () => void;
  isFetching: boolean;
}

interface WorkflowRunInfo {
  id: number;
  status: "queued" | "in_progress" | "completed";
  conclusion: "success" | "failure" | "cancelled" | null;
  html_url: string;
  created_at: string;
  updated_at: string;
}

export interface CustomAtsSubmission {
  id: string;
  company: string;
  provider: string;
  identifier: string;
  careersUrl?: string;
  status: "saved_locally" | "submitted_via_issue";
  submittedAt: string;
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
  { id: "custom", label: "Custom Careers Portal" },
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
  const [careersUrl, setCareersUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Real GitHub Ingestion Telemetry State
  const [workflowRun, setWorkflowRun] = useState<WorkflowRunInfo | null>(null);
  const [isLoadingRun, setIsLoadingRun] = useState(false);
  const [runFetchError, setRunFetchError] = useState<string | null>(null);

  // In-Page Maintainer Dispatch Token (strictly ephemeral in memory)
  const [githubPat, setGithubPat] = useState("");
  const [showPatInput, setShowPatInput] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Local submissions registry
  const [localSubmissions, setLocalSubmissions] = useState<CustomAtsSubmission[]>(() => {
    try {
      const stored = localStorage.getItem("jobops_custom_ats");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Query authentic GitHub Actions status from GitHub REST API
  const fetchWorkflowStatus = async () => {
    setIsLoadingRun(true);
    setRunFetchError(null);
    try {
      const res = await fetch(
        "https://api.github.com/repos/chandanvura/JobOps/actions/workflows/ingest.yml/runs?per_page=1",
        {
          headers: {
            Accept: "application/vnd.github.v3+json",
          },
        }
      );
      if (!res.ok) {
        if (res.status === 403) {
          setRunFetchError("GitHub API rate limit reached. Telemetry will retry automatically.");
        } else {
          setRunFetchError(`GitHub API responded with HTTP ${res.status}`);
        }
        setIsLoadingRun(false);
        return;
      }
      const data = await res.json();
      if (data && Array.isArray(data.workflow_runs) && data.workflow_runs.length > 0) {
        const run = data.workflow_runs[0];
        setWorkflowRun({
          id: run.id,
          status: run.status,
          conclusion: run.conclusion,
          html_url: run.html_url,
          created_at: run.created_at,
          updated_at: run.updated_at,
        });
      }
    } catch (err) {
      setRunFetchError("Failed to reach GitHub API for live workflow telemetry.");
    } finally {
      setIsLoadingRun(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchWorkflowStatus();
    // Poll every 20 seconds while modal is open to track live progress
    const interval = setInterval(fetchWorkflowStatus, 20000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // In-Page Dispatch using user-provided ephemeral PAT
  const handleInPageDispatch = async () => {
    if (!githubPat.trim()) {
      setDispatchResult({ type: "error", msg: "Please enter a valid GitHub token with actions:write scope." });
      return;
    }

    setIsDispatching(true);
    setDispatchResult(null);

    try {
      const res = await fetch(
        "https://api.github.com/repos/chandanvura/JobOps/actions/workflows/ingest.yml/dispatches",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${githubPat.trim()}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ref: "main", inputs: { all_time: false } }),
        }
      );

      if (res.status === 204) {
        setDispatchResult({
          type: "success",
          msg: "Workflow dispatch accepted by GitHub! Ingestion is now running on GitHub Actions.",
        });
        setTimeout(fetchWorkflowStatus, 2500);
      } else {
        const errJson = await res.json().catch(() => null);
        const errMsg = errJson?.message || `HTTP ${res.status}`;
        setDispatchResult({
          type: "error",
          msg: `GitHub rejected dispatch: ${errMsg}. Check token permissions.`,
        });
      }
    } catch (err) {
      setDispatchResult({
        type: "error",
        msg: "Network error attempting to dispatch GitHub Actions workflow.",
      });
    } finally {
      setIsDispatching(false);
    }
  };

  const handleAddCompany = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    const cleanCo = cleanJobText(companyName).slice(0, 80).trim();
    const cleanId = atsIdentifier.trim();
    const cleanUrl = careersUrl.trim() ? sanitizeExternalUrl(careersUrl) : "";

    if (!cleanCo) {
      setErrorMessage("Please enter a valid company name.");
      return;
    }

    if (!cleanId) {
      setErrorMessage("Please enter an ATS identifier or company slug.");
      return;
    }

    const slugRegex = /^[a-zA-Z0-9_-]{1,64}$/;
    if (!slugRegex.test(cleanId)) {
      setErrorMessage(
        "Invalid identifier. ATS slug must contain only alphanumeric characters, hyphens, and underscores (1-64 characters). No slashes or dots."
      );
      return;
    }

    const newSub: CustomAtsSubmission = {
      id: `${cleanCo.toLowerCase()}-${cleanId.toLowerCase()}`,
      company: cleanCo,
      provider: atsProvider,
      identifier: cleanId,
      careersUrl: cleanUrl !== "#" ? cleanUrl : undefined,
      status: "saved_locally",
      submittedAt: new Date().toISOString(),
    };

    const updated = [newSub, ...localSubmissions.filter((s) => s.id !== newSub.id)];
    setLocalSubmissions(updated);
    try {
      localStorage.setItem("jobops_custom_ats", JSON.stringify(updated));
    } catch {}

    setStatusMessage(
      `Saved "${cleanCo}" (${atsProvider}: ${cleanId}) to local drafts. To submit to the shared catalog, click "Submit via GitHub Issue" below.`
    );
    setCompanyName("");
    setAtsIdentifier("");
    setCareersUrl("");
  };

  const formatRunAge = (isoDate: string) => {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m ago`;
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
        <div className="flex items-center justify-between pb-4 border-b border-brand-border mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-elevated border border-brand-border flex items-center justify-center text-brand-primary">
              <RefreshCw className={`w-4 h-4 ${isFetching || isDispatching ? "animate-spin" : ""}`} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-brand-text">
                Live Ingestion & ATS Trigger
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

        {/* Real GitHub Actions Ingestion Telemetry */}
        <div className="bg-brand-elevated rounded-2xl p-4 border border-brand-border mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-secondary flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-brand-primary" />
              <span>GitHub Actions Ingestion Status</span>
            </span>
            <button
              onClick={fetchWorkflowStatus}
              disabled={isLoadingRun}
              className="text-[11px] text-brand-secondary hover:text-brand-text flex items-center gap-1"
              title="Refresh live workflow status"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingRun ? "animate-spin" : ""}`} />
              <span>Check Status</span>
            </button>
          </div>

          {workflowRun ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-brand-secondary">Latest Pipeline Run:</span>
                <span className="font-mono font-medium text-brand-text">Run #{workflowRun.id}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-brand-secondary">Execution State:</span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  {workflowRun.status === "in_progress" ? (
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[11px] flex items-center gap-1">
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" /> In Progress
                    </span>
                  ) : workflowRun.conclusion === "success" ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Succeeded ({formatRunAge(workflowRun.updated_at)})
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[11px] flex items-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5" /> {workflowRun.conclusion || workflowRun.status}
                    </span>
                  )}
                </span>
              </div>

              <div className="pt-2 flex items-center justify-between gap-2 border-t border-brand-border/60">
                <a
                  href={workflowRun.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-primary hover:underline flex items-center gap-1"
                >
                  <span>View Run Logs on GitHub</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  onClick={onTriggerRefresh}
                  disabled={isFetching}
                  className="text-xs px-2.5 py-1 rounded-lg bg-brand-surface border border-brand-border hover:bg-brand-elevated text-brand-text flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} />
                  <span>Sync Catalog Now</span>
                </button>
              </div>
            </div>
          ) : runFetchError ? (
            <p className="text-xs text-amber-500">{runFetchError}</p>
          ) : (
            <p className="text-xs text-brand-secondary">Connecting to GitHub Actions telemetry...</p>
          )}

          {/* Trigger Options */}
          <div className="mt-3 pt-3 border-t border-brand-border/60 flex flex-col sm:flex-row gap-2">
            <a
              href="https://github.com/chandanvura/JobOps/actions/workflows/ingest.yml"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 px-3 rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-semibold text-xs text-center flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <span>Run via GitHub Actions</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={() => setShowPatInput((prev) => !prev)}
              className="py-2 px-3 rounded-xl bg-brand-surface border border-brand-border hover:bg-brand-elevated text-brand-secondary hover:text-brand-text font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{showPatInput ? "Hide Dispatch" : "In-Page Dispatch"}</span>
            </button>
          </div>

          {/* Ephemeral PAT in-page dispatch box */}
          {showPatInput && (
            <div className="mt-3 p-3 rounded-xl bg-brand-surface border border-brand-border space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-brand-secondary">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                <span>Ephemeral token held in memory only (never saved).</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="ghp_... (actions:write)"
                  value={githubPat}
                  onChange={(e) => setGithubPat(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-brand-border bg-brand-elevated text-brand-text font-mono placeholder:text-brand-muted"
                />
                <button
                  onClick={handleInPageDispatch}
                  disabled={isDispatching || !githubPat.trim()}
                  className="px-3 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-hover text-white text-xs font-semibold disabled:opacity-50 transition-colors flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  <span>{isDispatching ? "Dispatching..." : "Dispatch"}</span>
                </button>
              </div>
              {dispatchResult && (
                <p
                  className={`text-xs ${
                    dispatchResult.type === "success" ? "text-emerald-500" : "text-rose-500"
                  }`}
                >
                  {dispatchResult.msg}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Section 2: Add New ATS Source */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-text flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4 text-brand-primary" />
              <span>Submit Employer ATS to Pipeline</span>
            </h3>
          </div>
          <p className="text-xs text-brand-secondary mb-3">
            Add a verified direct ATS board. Save as draft locally or open a community review issue:
          </p>

          <form onSubmit={handleAddCompany} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-mono font-medium text-brand-secondary block mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Swiggy, Cred"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  maxLength={80}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-brand-border focus:outline-none focus:border-brand-primary bg-brand-elevated text-brand-text placeholder:text-brand-muted"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono font-medium text-brand-secondary block mb-1">
                  ATS Platform
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
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-mono font-medium text-brand-secondary block mb-1">
                  ATS Slug / Identifier
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

              <div>
                <label className="text-[11px] font-mono font-medium text-brand-secondary block mb-1">
                  Careers URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://company.com/careers"
                  value={careersUrl}
                  onChange={(e) => setCareersUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-brand-border focus:outline-none focus:border-brand-primary bg-brand-elevated text-brand-text placeholder:text-brand-muted"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-rose-500 text-xs">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2 px-3 rounded-xl bg-brand-surface hover:bg-brand-elevated text-brand-text border border-brand-border font-semibold text-xs active:scale-[0.98] transition-colors shadow-sm"
              >
                Save as Local Draft
              </button>

              <a
                href={`https://github.com/chandanvura/JobOps/issues/new?title=${encodeURIComponent(
                  `[ATS Ingestion]: ${companyName.trim() || "New Employer"}`
                )}&body=${encodeURIComponent(
                  `### Company Name\n${companyName.trim()}\n\n### ATS Provider\n${atsProvider}\n\n### ATS Slug\n${atsIdentifier.trim()}\n\n### Careers URL\n${careersUrl.trim() || "N/A"}`
                )}&labels=ats-submission`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-3 rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-semibold text-xs active:scale-[0.98] transition-colors flex items-center gap-1 shadow-sm"
              >
                <span>Submit via GitHub Issue</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </form>

          {statusMessage && (
            <div className="mt-3 p-3 bg-brand-elevated border border-brand-border rounded-xl flex items-start gap-2 text-brand-text text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Local Submissions Queue */}
          {localSubmissions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-brand-border">
              <span className="text-[11px] font-mono text-brand-secondary block mb-1.5">
                Local Ingestion Queue ({localSubmissions.length} drafts):
              </span>
              <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1">
                {localSubmissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-2 rounded-lg bg-brand-elevated text-xs flex items-center justify-between border border-brand-border/60"
                  >
                    <div>
                      <span className="font-semibold text-brand-text">{sub.company}</span>{" "}
                      <span className="text-brand-muted font-mono text-[11px]">
                        ({sub.provider}: {sub.identifier})
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-500/10 text-brand-secondary border border-brand-border">
                      Local Draft
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
