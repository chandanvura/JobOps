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
    <header className="sticky top-0 z-30 bg-ivory-50/95 dark:bg-espresso-900/95 backdrop-blur border-b border-sage-200 dark:border-sage-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Tabs */}
        <div className="flex items-center gap-6">
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setCurrentTab("jobs")}
          >
            <div className="w-10 h-10 rounded-xl bg-crimson-700 dark:bg-crimson-800 flex items-center justify-center text-ivory-300 shadow-md shadow-crimson-900/10 group-hover:scale-105 transition-transform">
              <Radar className="w-5 h-5 text-ivory-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-2xl tracking-tight text-crimson-800 dark:text-ivory-300">
                  JobOps
                </span>
                <span className="text-[10px] uppercase font-mono font-semibold tracking-wider px-1.5 py-0.5 rounded bg-ivory-300 dark:bg-crimson-950 text-crimson-800 dark:text-ivory-300 border border-ivory-400 dark:border-crimson-800">
                  Direct ATS
                </span>
              </div>
              <p className="text-xs text-sage-600 dark:text-sage-400 hidden sm:block">
                <span className="text-crimson-700 dark:text-ivory-400 font-semibold">{freshCount} new jobs in 24h</span>
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav
            className="flex items-center gap-1 bg-ivory-200 dark:bg-espresso-800 p-1 rounded-xl text-xs font-semibold border border-sage-200/60 dark:border-sage-800"
            role="tablist"
          >
            <button
              role="tab"
              aria-selected={currentTab === "jobs"}
              onClick={() => setCurrentTab("jobs")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                currentTab === "jobs"
                  ? "bg-white dark:bg-espresso-950 text-crimson-700 dark:text-ivory-200 shadow-sm font-bold"
                  : "text-sage-700 dark:text-sage-300 hover:text-crimson-800 dark:hover:text-white"
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
                  ? "bg-white dark:bg-espresso-950 text-crimson-700 dark:text-ivory-200 shadow-sm font-bold"
                  : "text-sage-700 dark:text-sage-300 hover:text-crimson-800 dark:hover:text-white"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Companies & Health</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-ivory-300 dark:bg-espresso-700 text-espresso-800 dark:text-ivory-300 ml-0.5">
                {companiesCount}
              </span>
            </button>
          </nav>
        </div>

        {/* Global Search Bar (When on Jobs tab) */}
        {currentTab === "jobs" && (
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sage-400" />
              <input
                type="text"
                placeholder="Search engineering positions, companies, or tech stack..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-espresso-950 hover:bg-ivory-50 dark:hover:bg-espresso-800 focus:bg-white dark:focus:bg-espresso-950 text-espresso-900 dark:text-ivory-200 border border-sage-200 dark:border-sage-800 focus:border-crimson-600 dark:focus:border-ivory-400 rounded-full focus:outline-none transition-all placeholder:text-sage-400 dark:placeholder:text-sage-500 shadow-sm"
              />
            </div>
          </div>
        )}

        {/* Action Buttons & Dark Mode Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-xl text-sage-600 hover:text-crimson-800 dark:text-sage-400 dark:hover:text-ivory-200 bg-ivory-200 dark:bg-espresso-800 hover:bg-ivory-300 dark:hover:bg-espresso-700 border border-sage-200 dark:border-sage-700 transition-colors"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-ivory-400" /> : <Moon className="w-4 h-4 text-espresso-800" />}
          </button>

          <button
            onClick={onOpenFetchModal}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg bg-crimson-50 dark:bg-crimson-950 text-crimson-700 dark:text-ivory-300 hover:bg-crimson-100 dark:hover:bg-crimson-900 border border-crimson-200 dark:border-crimson-800 transition-colors shadow-sm"
            title="Trigger real-time ATS refresh"
          >
            <RefreshCw className="w-3.5 h-3.5 text-crimson-700 dark:text-ivory-400" />
            <span>Fetch Jobs</span>
          </button>

          <button
            onClick={onOpenAddModal}
            className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg text-espresso-800 dark:text-ivory-300 hover:bg-ivory-200 dark:hover:bg-espresso-800 border border-sage-200 dark:border-sage-700 transition-colors"
          >
            <PlusCircle className="w-4 h-4 text-sage-500 dark:text-sage-400" />
            <span>Add ATS</span>
          </button>

          <button
            onClick={onOpenSavedModal}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg bg-ivory-200 dark:bg-espresso-800 hover:bg-ivory-300 dark:hover:bg-espresso-700 text-espresso-900 dark:text-ivory-200 border border-sage-200 dark:border-sage-700 transition-colors relative"
          >
            <Bookmark className="w-3.5 h-3.5 text-crimson-700 dark:text-ivory-400" />
            <span className="hidden sm:inline">Saved</span>
            {savedCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-crimson-700 text-ivory-200 font-mono text-[11px] font-bold flex items-center justify-center">
                {savedCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
