import React, { useRef, useEffect } from "react";
import { Radar, RefreshCw, Bookmark, PlusCircle, Search, Building2, SlidersHorizontal } from "lucide-react";
import { Logo } from "./Logo";
import { ThemeSelector } from "./ThemeSelector";
import { ThemeMode } from "../hooks/useDarkMode";

interface NavbarProps {
  currentTab: "jobs" | "companies";
  setCurrentTab: (tab: "jobs" | "companies") => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  freshCount: number;
  totalCount: number;
  savedCount: number;
  companiesCount: number;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  onOpenFetchModal: () => void;
  onOpenSavedModal: () => void;
  onOpenAddModal: () => void;
  onToggleMobileFilter?: () => void;
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
  themeMode,
  setThemeMode,
  onOpenFetchModal,
  onOpenSavedModal,
  onOpenAddModal,
  onToggleMobileFilter,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global keyboard shortcut '/' to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-150">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2.5 sm:gap-4">
        {/* Brand & Tabs */}
        <div className="flex items-center gap-3 lg:gap-6 min-w-0">
          <Logo onClick={() => setCurrentTab("jobs")} />

          {/* Navigation Tabs */}
          <nav
            className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700/60 flex-shrink-0"
            role="tablist"
          >
            <button
              role="tab"
              aria-selected={currentTab === "jobs"}
              onClick={() => setCurrentTab("jobs")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                currentTab === "jobs"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm font-semibold border border-slate-200/80 dark:border-slate-700"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
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
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm font-semibold border border-slate-200/80 dark:border-slate-700"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Companies & Health</span>
              <span className="sm:hidden">Portals</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 ml-0.5">
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
                ref={searchInputRef}
                type="text"
                placeholder="Search engineering positions, skills, or companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-950/60 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700/80 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/15 transition-all placeholder:text-slate-400 shadow-sm"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hidden sm:inline-block">
                /
              </span>
            </div>
          </div>
        )}

        {/* Action Controls & Theme Selector */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Mobile Filter Toggle Button (Shown on mobile when on jobs tab) */}
          {currentTab === "jobs" && onToggleMobileFilter && (
            <button
              onClick={onToggleMobileFilter}
              className="lg:hidden flex items-center gap-1 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
              title="Filter jobs"
              aria-label="Open filter drawer"
            >
              <SlidersHorizontal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </button>
          )}

          {/* Theme Selector (Light / Dark / System) */}
          <ThemeSelector themeMode={themeMode} setThemeMode={setThemeMode} />

          {/* Fetch Jobs Trigger */}
          <button
            onClick={onOpenFetchModal}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/60 transition-colors shadow-sm"
            title="Trigger real-time ATS refresh"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Fetch Jobs</span>
          </button>

          {/* Add ATS Button (Desktop) */}
          <button
            onClick={onOpenAddModal}
            className="hidden xl:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Add ATS</span>
          </button>

          {/* Pipeline Button */}
          <button
            onClick={onOpenSavedModal}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 transition-colors relative shadow-sm"
            title="Saved applications & personal workspace"
          >
            <Bookmark className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Pipeline</span>
            {savedCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white font-mono text-[10px] font-bold shadow-sm">
                {savedCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
