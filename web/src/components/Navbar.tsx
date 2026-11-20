import React from "react";
import { Radar, RefreshCw, Bookmark, PlusCircle, Search, Building2, Sun, Moon } from "lucide-react";

interface NavbarProps {
  currentTab: "jobs" | "companies";
  setCurrentTab: (tab: "jobs" | "companies") => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  freshCount: number;
  totalCount: number;
  savedCount: number;
  companiesCount: number;
  isDark: boolean;
  toggleDarkMode: () => void;
  onOpenFetchModal: () => void;
  onOpenSavedModal: () => void;
  onOpenAddModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  searchQuery,
  setSearchQuery,
  freshCount,
  totalCount,
  savedCount,
  companiesCount,
  isDark,
  toggleDarkMode,
  onOpenFetchModal,
  onOpenSavedModal,
  onOpenAddModal,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Tabs */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentTab("jobs")}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-100 dark:shadow-none">
              <Radar className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
                  JobOps
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Live
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{freshCount} new jobs in 24h</span>
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold" role="tablist">
            <button
              role="tab"
              aria-selected={currentTab === "jobs"}
              onClick={() => setCurrentTab("jobs")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                currentTab === "jobs"
                  ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Radar className="w-3.5 h-3.5" />
              <span>Jobs Radar</span>
            </button>

            <button
              role="tab"
              aria-selected={currentTab === "companies"}
              onClick={() => setCurrentTab("companies")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                currentTab === "companies"
                  ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Companies & Health</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 ml-0.5">
                {companiesCount}
              </span>
            </button>
          </nav>
        </div>

        {/* Global Search Bar (When on Jobs tab) */}
        {currentTab === "jobs" && (
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by title, company, or skills (e.g. Python, React)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-100/80 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white border border-transparent focus:border-indigo-500 rounded-full focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>
        )}

        {/* Action Buttons & Dark Mode Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          <button
            onClick={onOpenFetchModal}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 transition-colors shadow-sm"
            title="Trigger real-time ATS refresh"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Fetch Jobs</span>
          </button>

          <button
            onClick={onOpenAddModal}
            className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors"
          >
            <PlusCircle className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Add ATS</span>
          </button>

          <button
            onClick={onOpenSavedModal}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors relative"
          >
            <Bookmark className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
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
