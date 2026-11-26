import React, { useRef, useEffect, useState, useLayoutEffect } from "react";
import { Radar, RefreshCw, Bookmark, PlusCircle, Search, Building2 } from "lucide-react";
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
  totalCount,
  savedCount,
  companiesCount,
  themeMode,
  setThemeMode,
  onOpenFetchModal,
  onOpenSavedModal,
  onOpenAddModal,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const jobsTabRef = useRef<HTMLButtonElement>(null);
  const companiesTabRef = useRef<HTMLButtonElement>(null);
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number }>({ left: 4, width: 108 });
  const [isScrolled, setIsScrolled] = useState(false);

  // Track scroll position for Apple/M3 floating surface separation
  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Measure active tab for sliding spring pill indicator
  useLayoutEffect(() => {
    const updatePill = () => {
      const target = currentTab === "jobs" ? jobsTabRef.current : companiesTabRef.current;
      if (target) {
        setPillStyle({
          left: target.offsetLeft,
          width: target.offsetWidth,
        });
      }
    };
    updatePill();
    window.addEventListener("resize", updatePill);
    return () => window.removeEventListener("resize", updatePill);
  }, [currentTab, companiesCount]);

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
    <header className="sticky top-2 sm:top-3 z-30 max-w-7xl mx-auto px-3 sm:px-6 w-full">
      <div
        className={`backdrop-blur-xl rounded-[20px] h-14 sm:h-16 px-3 sm:px-5 flex items-center justify-between gap-2.5 sm:gap-4 border transition-[background-color,border-color,box-shadow] duration-[260ms] ease-base ${
          isScrolled
            ? "bg-brand-surface/90 border-brand-border shadow-lg shadow-black/5 dark:shadow-black/40"
            : "bg-brand-surface/75 border-brand-border/70 shadow-sm"
        }`}
      >
        {/* Brand & Desktop Navigation Tabs */}
        <div className="flex items-center gap-3 lg:gap-6 min-w-0">
          <Logo onClick={() => setCurrentTab("jobs")} />

          {/* Desktop Segmented Control with Spring Pill Indicator */}
          <nav
            className="hidden md:flex relative items-center gap-1 bg-brand-elevated p-1 rounded-xl text-xs font-semibold border border-brand-border flex-shrink-0"
            role="tablist"
            aria-label="Primary sections"
          >
            {/* Sliding Spring Pill */}
            <span
              aria-hidden="true"
              className="segmented-pill absolute top-1 bottom-1 left-0 rounded-lg bg-brand-surface border border-brand-border shadow-sm pointer-events-none"
              style={{
                width: `${pillStyle.width}px`,
                transform: `translateX(${pillStyle.left}px)`,
              }}
            />

            <button
              ref={jobsTabRef}
              role="tab"
              aria-selected={currentTab === "jobs"}
              onClick={() => setCurrentTab("jobs")}
              className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-tactile ${
                currentTab === "jobs"
                  ? "text-brand-primary font-semibold"
                  : "text-brand-secondary hover:text-brand-text"
              }`}
            >
              <Radar className="w-3.5 h-3.5" />
              <span>Jobs radar</span>
            </button>

            <button
              ref={companiesTabRef}
              role="tab"
              aria-selected={currentTab === "companies"}
              onClick={() => setCurrentTab("companies")}
              className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-tactile ${
                currentTab === "companies"
                  ? "text-brand-primary font-semibold"
                  : "text-brand-secondary hover:text-brand-text"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Companies & health</span>
              <span className="sm:hidden">Portals</span>
              <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-full bg-brand-elevated text-brand-secondary border border-brand-border ml-0.5 tabular-nums">
                {companiesCount}
              </span>
            </button>
          </nav>
        </div>

        {/* Global Search Bar (Desktop lg+ only; mobile/tablet uses the dedicated search bar above filters) */}
        {currentTab === "jobs" && (
          <div className="flex-1 max-w-md hidden lg:block">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
              <input
                id="global-search-input"
                ref={searchInputRef}
                type="text"
                placeholder="Search roles, skills, or companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 text-xs sm:text-sm bg-brand-elevated focus:bg-brand-surface text-brand-text border border-brand-border focus:border-brand-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-[background-color,border-color,box-shadow] duration-150 placeholder:text-brand-muted shadow-sm"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono px-1.5 py-0.5 rounded border border-brand-border bg-brand-surface text-brand-muted hidden sm:inline-block">
                /
              </span>
            </div>
          </div>
        )}

        {/* Action Controls & Theme Selector */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Theme Selector (Light / Dark / System) */}
          <ThemeSelector themeMode={themeMode} setThemeMode={setThemeMode} />

          {/* Fetch Jobs Trigger */}
          <button
            onClick={onOpenFetchModal}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-semibold rounded-xl bg-brand-surface hover:bg-brand-elevated text-brand-text border border-brand-border btn-tactile shadow-sm"
            title="Trigger real-time ATS refresh"
            aria-label="Refresh job catalog"
          >
            <RefreshCw className="w-3.5 h-3.5 text-brand-primary" />
            <span className="hidden sm:inline">Fetch jobs</span>
          </button>

          {/* Add ATS Button (Desktop) */}
          <button
            onClick={onOpenAddModal}
            className="hidden xl:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-brand-secondary hover:text-brand-text hover:bg-brand-elevated border border-brand-border btn-tactile"
          >
            <PlusCircle className="w-3.5 h-3.5 text-brand-muted" />
            <span>Add ATS</span>
          </button>

          {/* Pipeline Button */}
          <button
            onClick={onOpenSavedModal}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-semibold rounded-[12px] bg-brand-surface hover:bg-brand-elevated text-brand-primary border border-brand-border btn-tactile relative shadow-sm"
            title="Saved applications & personal workspace"
            aria-label="Open saved applications pipeline"
          >
            <Bookmark className="w-3.5 h-3.5 text-brand-primary" />
            <span className="hidden sm:inline">Pipeline</span>
            {savedCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-brand-primary text-white font-mono text-[11px] font-bold shadow-sm tabular-nums">
                {savedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Dedicated Mobile Navigation Segmented Control (Zero overlap, clean 44px touch targets) */}
      <div className="md:hidden mt-2">
        <nav
          className="flex items-center bg-brand-surface/90 backdrop-blur-xl p-1 rounded-[20px] text-xs font-semibold border border-brand-border shadow-sm gap-1"
          role="tablist"
          aria-label="Mobile sections"
        >
          <button
            role="tab"
            aria-selected={currentTab === "jobs"}
            onClick={() => setCurrentTab("jobs")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-[12px] btn-tactile min-h-[44px] text-xs font-semibold ${
              currentTab === "jobs"
                ? "bg-brand-primary text-white font-bold shadow-sm"
                : "text-brand-secondary hover:text-brand-text active:bg-brand-elevated"
            }`}
          >
            <Radar className="w-3.5 h-3.5" />
            <span>Jobs radar</span>
            <span
              className={`text-[11px] font-mono px-1.5 py-0.5 rounded-full tabular-nums font-bold ${
                currentTab === "jobs"
                  ? "bg-white/20 text-white"
                  : "bg-brand-elevated text-brand-secondary border border-brand-border"
              }`}
            >
              {totalCount.toLocaleString()}
            </span>
          </button>

          <button
            role="tab"
            aria-selected={currentTab === "companies"}
            onClick={() => setCurrentTab("companies")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-[12px] btn-tactile min-h-[44px] text-xs font-semibold ${
              currentTab === "companies"
                ? "bg-brand-primary text-white font-bold shadow-sm"
                : "text-brand-secondary hover:text-brand-text active:bg-brand-elevated"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Companies</span>
            <span
              className={`text-[11px] font-mono px-1.5 py-0.5 rounded-full tabular-nums font-bold ${
                currentTab === "companies"
                  ? "bg-white/20 text-white"
                  : "bg-brand-elevated text-brand-secondary border border-brand-border"
              }`}
            >
              {companiesCount}
            </span>
          </button>
        </nav>
      </div>
    </header>
  );
};
