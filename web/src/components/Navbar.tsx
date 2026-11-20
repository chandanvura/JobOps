import React, { useRef, useEffect } from "react";
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
    <header className="sticky top-0 z-30 bg-brand-surface/95 backdrop-blur border-b border-brand-border transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-4">
        {/* Brand & Tabs */}
        <div className="flex items-center gap-4 lg:gap-6 min-w-0">
          <div
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group flex-shrink-0"
            onClick={() => setCurrentTab("jobs")}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand-primary flex items-center justify-center text-white shadow-md shadow-brand-primary/10 group-hover:scale-105 transition-transform flex-shrink-0">
              <Radar className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-xl sm:text-2xl tracking-tight text-brand-text">
                  JobOps
                </span>
                <span className="text-[10px] uppercase font-mono font-semibold tracking-wider px-2 py-0.5 rounded-full bg-brand-wine text-brand-gold border border-brand-primary/40 hidden xs:inline-block shadow-sm">
                  Direct ATS
                </span>
              </div>
              <p className="text-[11px] text-brand-secondary hidden sm:block">
                <span className="text-brand-primary font-semibold">{freshCount} new jobs in 24h</span>
                <span className="text-brand-muted"> • {totalCount.toLocaleString()} indexed</span>
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav
            className="flex items-center gap-1 bg-brand-elevated p-1 rounded-xl text-xs font-semibold border border-brand-border flex-shrink-0"
            role="tablist"
          >
            <button
              role="tab"
              aria-selected={currentTab === "jobs"}
              onClick={() => setCurrentTab("jobs")}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all ${
                currentTab === "jobs"
                  ? "bg-brand-surface text-brand-text shadow-sm font-semibold border border-brand-border"
                  : "text-brand-secondary hover:text-brand-text"
              }`}
            >
              <Radar className="w-3.5 h-3.5" />
              <span>Jobs Radar</span>
            </button>

            <button
              role="tab"
              aria-selected={currentTab === "companies"}
              onClick={() => setCurrentTab("companies")}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all ${
                currentTab === "companies"
                  ? "bg-brand-surface text-brand-text shadow-sm font-semibold border border-brand-border"
                  : "text-brand-secondary hover:text-brand-text"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Companies & Health</span>
              <span className="sm:hidden">Companies</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-brand-surface text-brand-secondary border border-brand-border ml-0.5">
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
                placeholder="Search engineering positions, companies, or tech stack..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 text-xs sm:text-sm bg-brand-elevated focus:bg-brand-surface text-brand-text border border-brand-border focus:border-brand-primary rounded-full focus:outline-none transition-all placeholder:text-brand-muted shadow-sm"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 rounded border border-brand-border bg-brand-surface text-brand-muted hidden sm:inline-block">
                /
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons & Dark Mode Toggle */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-xl text-brand-secondary hover:text-brand-text bg-brand-elevated hover:bg-brand-surface border border-brand-border transition-colors"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-brand-gold" /> : <Moon className="w-4 h-4 text-brand-secondary" />}
          </button>

          <button
            onClick={onOpenFetchModal}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3 sm:py-2 text-xs font-semibold rounded-xl bg-brand-elevated hover:bg-brand-surface text-brand-text border border-brand-border hover:border-brand-primary/40 transition-colors shadow-sm"
            title="Trigger real-time ATS refresh"
          >
            <RefreshCw className="w-3.5 h-3.5 text-brand-primary" />
            <span className="hidden sm:inline">Fetch Jobs</span>
          </button>

          <button
            onClick={onOpenAddModal}
            className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-brand-secondary hover:text-brand-text hover:bg-brand-elevated border border-brand-border hover:border-brand-primary/40 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5 text-brand-muted" />
            <span>Add ATS</span>
          </button>

          <button
            onClick={onOpenSavedModal}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3 sm:py-2 text-xs font-semibold rounded-xl bg-brand-elevated hover:bg-brand-surface text-brand-text border border-brand-border hover:border-brand-primary/40 transition-colors relative shadow-sm"
            title="Saved applications & personal workspace"
          >
            <Bookmark className="w-3.5 h-3.5 text-brand-primary" />
            <span className="hidden sm:inline">Pipeline</span>
            {savedCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-brand-primary text-[#FFF0DC] font-mono text-[10px] font-bold shadow-sm">
                {savedCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
