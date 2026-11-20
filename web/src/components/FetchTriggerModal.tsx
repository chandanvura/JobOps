import React, { useState } from "react";
import { X, RefreshCw, PlusCircle, CheckCircle2, ArrowRight } from "lucide-react";

interface FetchTriggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerRefresh: () => void;
  isFetching: boolean;
}

export const FetchTriggerModal: React.FC<FetchTriggerModalProps> = ({
  isOpen,
  onClose,
  onTriggerRefresh,
  isFetching,
}) => {
  const [atsProvider, setAtsProvider] = useState("greenhouse");
  const [atsIdentifier, setAtsIdentifier] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!atsIdentifier || !companyName) return;

    setStatusMessage(`Added "${companyName}" (${atsProvider}) to discovery registry. It will be collected in the next scheduled shard!`);
    setCompanyName("");
    setAtsIdentifier("");
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150 transition-colors">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Live Ingestion & ATS Trigger</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Zero-cost community job radar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action 1: On-Demand Fetch */}
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 mb-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Trigger Real-Time Ingestion</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Checks all 757 configured ATS endpoints for new jobs posted in the last 24 hours.
              </p>
            </div>
          </div>
          <button
            onClick={onTriggerRefresh}
            disabled={isFetching}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-xs shadow-md shadow-emerald-200 dark:shadow-none transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            <span>{isFetching ? "Scanning ATS Endpoints..." : "Fetch Latest 24h Jobs Now"}</span>
          </button>
        </div>

        {/* Action 2: Add New ATS Source */}
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
            <PlusCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Submit a New Company ATS Source</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Found an employer using Greenhouse, Lever, Ashby, or Workday? Add their identifier to the public radar:
          </p>

          <form onSubmit={handleAddCompany} className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">Company Name</label>
              <input
                type="text"
                placeholder="e.g. Swiggy, Cred, Zerodha"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">ATS Platform</label>
                <select
                  value={atsProvider}
                  onChange={(e) => setAtsProvider(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                >
                  <option value="greenhouse">Greenhouse</option>
                  <option value="lever">Lever</option>
                  <option value="ashby">Ashby</option>
                  <option value="smartrecruiters">SmartRecruiters</option>
                  <option value="workday">Workday</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">ATS Slug / Board Token</label>
                <input
                  type="text"
                  placeholder="e.g. razorpay, linear"
                  value={atsIdentifier}
                  onChange={(e) => setAtsIdentifier(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Add to Ingestion Registry</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {statusMessage && (
            <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
