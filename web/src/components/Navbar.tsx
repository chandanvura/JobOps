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
    <header className="sticky top-2 sm:top-3 z-30 max-w-7xl mx-auto px-3 sm:px-6 w-full transition-all duration-300">
      <div className="backdrop-blur-md bg-brand-surface/90 border border-brand-border rounded-2xl h-16 px-3 sm:px-5 flex items-center justify-between gap-2.5 sm:gap-4 shadow-sm transition-colors duration-300">
        {/* Brand & Tabs */}
        <div className="flex items-center gap-3 lg:gap-6 min-w-0">
          <Logo onClick={() => setCurrentTab("jobs")} />

          {/* Navigation Tabs */}
          <nav
            className="flex items-center gap-1 bg-brand-elevated p-1 rounded-xl text-xs font-semibold border border-brand-border flex-shrink-0"
            role="tablist"
          >
            <button
              role="tab"
              aria-selected={currentTab === "jobs"}
              onClick={() => setCurrentTab("jobs")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all active:scale-[0.98] ${
                currentTab === "jobs"
                  ? "bg-brand-surface text-brand-primary font-semibold border border-brand-border shadow-sm"
                  : "text-brand-secondary hover:text-brand-text"
              }`}
            >
              <Radar className="w-3.5 h-3.5" />
              <span>Jobs radar</span>
            </button>

            <button
              role="tab"
              aria-selected={currentTab === "companies"}
              onClick={() => setCurrentTab("companies")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all active:scale-[0.98] ${
                currentTab === "companies"
                  ? "bg-brand-surface text-brand-primary font-semibold border border-brand-border shadow-sm"
                  : "text-brand-secondary hover:text-brand-text"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Companies & health</span>
              <span className="sm:hidden">Portals</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-brand-elevated text-brand-secondary border border-brand-border ml-0.5 tabular-nums">
                {companiesCount}
              </span>
            </button>
          </nav>
        </div>

        {/* Global Search Bar (When on Jobs tab) */}
        {currentTab === "jobs" && (
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search engineering positions, skills, or companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 text-xs sm:text-sm bg-brand-elevated focus:bg-brand-surface text-brand-text border border-brand-border focus:border-brand-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all placeholder:text-brand-muted shadow-sm"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono px-1.5 py-0.5 rounded border border-brand-border bg-brand-surface text-brand-muted hidden sm:inline-block">
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
              className="lg:hidden flex items-center gap-1 p-2 rounded-xl border border-brand-border bg-brand-surface text-brand-text hover:bg-brand-elevated active:scale-[0.98] transition-colors shadow-sm"
              title="Filter jobs"
              aria-label="Open filter drawer"
            >
              <SlidersHorizontal className="w-4 h-4 text-brand-primary" />
            </button>
          )}

          {/* Theme Selector (Light / Dark / System) */}
          <ThemeSelector themeMode={themeMode} setThemeMode={setThemeMode} />

          {/* Fetch Jobs Trigger */}
          <button
            onClick={onOpenFetchModal}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-brand-surface hover:bg-brand-elevated text-brand-text border border-brand-border active:scale-[0.98] transition-all shadow-sm"
            title="Trigger real-time ATS refresh"
          >
            <RefreshCw className="w-3.5 h-3.5 text-brand-primary" />
            <span className="hidden sm:inline">Fetch jobs</span>
          </button>

          {/* Add ATS Button (Desktop) */}
          <button
            onClick={onOpenAddModal}
            className="hidden xl:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-brand-secondary hover:text-brand-text hover:bg-brand-elevated border border-brand-border active:scale-[0.98] transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5 text-brand-muted" />
            <span>Add ATS</span>
          </button>

          {/* Pipeline Button */}
          <button
            onClick={onOpenSavedModal}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-brand-surface hover:bg-brand-elevated text-brand-primary border border-brand-border active:scale-[0.98] transition-all relative shadow-sm"
            title="Saved applications & personal workspace"
          >
            <Bookmark className="w-3.5 h-3.5 text-brand-primary" />
            <span className="hidden sm:inline">Pipeline</span>
            {savedCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-brand-primary text-white font-mono text-[10px] font-bold shadow-sm tabular-nums">
                {savedCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
