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
    { key: "/", description: "Focus global search bar", icon: <Search className="w-3.5 h-3.5 text-blue-500" /> },
    { key: "Esc", description: "Close any modal or active filter drawer", icon: <X className="w-3.5 h-3.5 text-rose-500" /> },
    { key: "T", description: "Cycle theme (Light ➔ Dark ➔ System)", icon: <Moon className="w-3.5 h-3.5 text-indigo-500" /> },
    { key: "P", description: "Open Personal Pipeline / Saved Jobs", icon: <Bookmark className="w-3.5 h-3.5 text-sky-500" /> },
    { key: "D", description: "Toggle card density (Comfortable / Compact)", icon: <LayoutGrid className="w-3.5 h-3.5 text-emerald-500" /> },
    { key: "F", description: "Toggle Last 24 Hours freshness filter", icon: <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500" /> },
    { key: "?", description: "Show keyboard shortcuts cheat sheet", icon: <Command className="w-3.5 h-3.5 text-blue-500" /> },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard Shortcuts"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150 transition-colors">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center">
              <Command className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Keyboard Shortcuts</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Power productivity hotkeys</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close shortcuts dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {shortcuts.map((sc) => (
            <div key={sc.key} className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                {sc.icon}
                <span>{sc.description}</span>
              </div>
              <kbd className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200 shadow-sm">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono border border-slate-200 dark:border-slate-700">?</kbd> anywhere to open</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
