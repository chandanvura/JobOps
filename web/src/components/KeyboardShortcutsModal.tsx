import React, { useEffect } from "react";
import { X, Command, Search, Moon, Bookmark, SlidersHorizontal, LayoutGrid } from "lucide-react";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcuts = [
    { key: "/", description: "Focus global search bar", icon: <Search className="w-3.5 h-3.5 text-amber-500" /> },
    { key: "Esc", description: "Close any modal or active filter drawer", icon: <X className="w-3.5 h-3.5 text-rose-500" /> },
    { key: "T", description: "Cycle theme (Light ➔ Dark ➔ System)", icon: <Moon className="w-3.5 h-3.5 text-amber-400" /> },
    { key: "P", description: "Open Personal Pipeline / Saved Jobs", icon: <Bookmark className="w-3.5 h-3.5 text-amber-500" /> },
    { key: "D", description: "Toggle card density (Comfortable / Compact)", icon: <LayoutGrid className="w-3.5 h-3.5 text-emerald-500" /> },
    { key: "F", description: "Toggle Last 24 Hours freshness filter", icon: <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500" /> },
    { key: "A", description: "Open Ingestion Telemetry & Add ATS modal", icon: <Command className="w-3.5 h-3.5 text-emerald-500" /> },
    { key: "?", description: "Show keyboard shortcuts cheat sheet", icon: <Command className="w-3.5 h-3.5 text-amber-500" /> },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard Shortcuts"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
    >
      <div className="bg-brand-surface rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-brand-border animate-in fade-in zoom-in-95 duration-150 transition-colors">
        <div className="flex items-center justify-between pb-4 border-b border-brand-border mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-elevated text-brand-primary border border-brand-border flex items-center justify-center">
              <Command className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-brand-text">Keyboard shortcuts</h2>
              <p className="text-xs text-brand-secondary">Power productivity hotkeys</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-brand-muted hover:text-brand-text hover:bg-brand-elevated active:scale-[0.98] transition-colors"
            aria-label="Close shortcuts dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="divide-y divide-brand-border">
          {shortcuts.map((sc) => (
            <div key={sc.key} className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-brand-secondary">
                {sc.icon}
                <span>{sc.description}</span>
              </div>
              <kbd className="px-2 py-1 rounded-md bg-brand-elevated border border-brand-border font-mono text-[11px] font-semibold text-brand-text shadow-sm">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-3 border-t border-brand-border flex items-center justify-between text-[11px] text-brand-secondary">
          <span>Tip: Press <kbd className="px-1.5 py-0.5 rounded-md bg-brand-elevated font-mono border border-brand-border text-brand-text">?</kbd> anywhere to open</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-brand-elevated hover:bg-brand-surface text-brand-text border border-brand-border font-semibold active:scale-[0.98] transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
