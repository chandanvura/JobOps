import React from "react";
import { Radar, RefreshCw, Bookmark, PlusCircle, Search, Sparkles } from "lucide-react";

interface NavbarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  freshCount: number;
  totalCount: number;
  savedCount: number;
  onOpenFetchModal: () => void;
  onOpenSavedModal: () => void;
  onOpenAddModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  setSearchQuery,
  freshCount,
  totalCount,
  savedCount,
  onOpenFetchModal,
  onOpenSavedModal,
  onOpenAddModal,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <Radar className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                JobOps
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                Live Radar
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              {totalCount.toLocaleString()} engineering jobs •{" "}
              <span className="text-emerald-600 font-semibold">{freshCount} in last 24h</span>
            </p>
          </div>
        </div>

        {/* Global Search Bar (LinkedIn Style) */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, company, or skills (e.g. Python, React)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-indigo-500 rounded-full focus:outline-none transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Fetch Jobs Community Trigger */}
          <button
            onClick={onOpenFetchModal}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-sm"
            title="Trigger real-time ATS refresh"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
            <span>Fetch Jobs</span>
          </button>

          {/* Add Company ATS */}
          <button
            onClick={onOpenAddModal}
            className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
          >
            <PlusCircle className="w-4 h-4 text-slate-500" />
            <span>Add ATS</span>
          </button>

          {/* Saved Applications */}
          <button
            onClick={onOpenSavedModal}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors relative"
          >
            <Bookmark className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Saved</span>
            {savedCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">
                {savedCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
