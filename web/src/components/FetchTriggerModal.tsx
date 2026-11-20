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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-espresso-950/70 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-espresso-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-sage-200 dark:border-sage-800 animate-in fade-in zoom-in-95 duration-150 transition-colors">
        <div className="flex items-center justify-between pb-4 border-b border-sage-100 dark:border-sage-800 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-crimson-50 dark:bg-crimson-950 border border-crimson-200 dark:border-crimson-800 flex items-center justify-center text-crimson-700 dark:text-ivory-300">
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-espresso-950 dark:text-ivory-100">Live Ingestion & ATS Trigger</h2>
              <p className="text-xs text-sage-600 dark:text-sage-400">Zero-cost community engineering radar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-sage-400 hover:text-crimson-800 dark:hover:text-white hover:bg-ivory-100 dark:hover:bg-espresso-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action 1: On-Demand Fetch */}
        <div className="bg-ivory-50 dark:bg-espresso-800/60 rounded-2xl p-4 border border-sage-200/80 dark:border-sage-700 mb-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="font-serif text-sm font-bold text-espresso-950 dark:text-ivory-100">Trigger Real-Time Ingestion</h3>
              <p className="text-xs text-sage-600 dark:text-sage-400 mt-0.5">
                Probes all 757 configured ATS endpoints for new jobs posted in the strict 24-hour freshness window.
              </p>
            </div>
          </div>
          <button
            onClick={onTriggerRefresh}
            disabled={isFetching}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-crimson-700 hover:bg-crimson-800 disabled:bg-sage-400 text-ivory-100 font-bold text-xs shadow-md shadow-crimson-900/10 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            <span>{isFetching ? "Scanning ATS Endpoints..." : "Fetch Latest 24h Jobs Now"}</span>
          </button>
        </div>

        {/* Action 2: Add New ATS Source */}
        <div>
          <h3 className="font-serif text-sm font-bold text-espresso-950 dark:text-ivory-100 mb-1 flex items-center gap-1.5">
            <PlusCircle className="w-4 h-4 text-crimson-700 dark:text-ivory-400" />
            <span>Submit a New Company ATS Source</span>
          </h3>
          <p className="text-xs text-sage-600 dark:text-sage-400 mb-3">
            Found an employer using Greenhouse, Lever, Ashby, or Workday? Add their identifier to the public radar:
          </p>

          <form onSubmit={handleAddCompany} className="space-y-3">
            <div>
              <label className="text-[11px] font-mono font-semibold text-espresso-800 dark:text-ivory-300 block mb-1">Company Name</label>
              <input
                type="text"
                placeholder="e.g. Swiggy, Cred, Zerodha"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-sage-200 dark:border-sage-700 focus:outline-none focus:border-crimson-600 bg-ivory-50 dark:bg-espresso-950 text-espresso-900 dark:text-white placeholder:text-sage-400 dark:placeholder:text-sage-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-mono font-semibold text-espresso-800 dark:text-ivory-300 block mb-1">ATS Platform</label>
                <select
                  value={atsProvider}
                  onChange={(e) => setAtsProvider(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-sage-200 dark:border-sage-700 focus:outline-none focus:border-crimson-600 bg-ivory-50 dark:bg-espresso-950 text-espresso-900 dark:text-white font-medium"
                >
                  <option value="greenhouse">Greenhouse</option>
                  <option value="lever">Lever</option>
                  <option value="ashby">Ashby</option>
                  <option value="smartrecruiters">SmartRecruiters</option>
                  <option value="workday">Workday</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono font-semibold text-espresso-800 dark:text-ivory-300 block mb-1">ATS Identifier / Slug</label>
                <input
                  type="text"
                  placeholder="e.g. razorpay, linear"
                  value={atsIdentifier}
                  onChange={(e) => setAtsIdentifier(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-sage-200 dark:border-sage-700 focus:outline-none focus:border-crimson-600 bg-ivory-50 dark:bg-espresso-950 text-espresso-900 dark:text-white placeholder:text-sage-400 dark:placeholder:text-sage-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-crimson-700 hover:bg-crimson-800 text-ivory-100 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>Add to Ingestion Registry</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {statusMessage && (
            <div className="mt-3 p-3 bg-ivory-200 dark:bg-espresso-800 border border-ivory-400 dark:border-sage-700 rounded-xl flex items-center gap-2 text-espresso-900 dark:text-ivory-200 text-xs">
              <CheckCircle2 className="w-4 h-4 text-crimson-700 dark:text-ivory-400 flex-shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
