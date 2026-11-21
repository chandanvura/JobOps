import React, { useState, useRef, useEffect } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { ThemeMode } from "../hooks/useDarkMode";

interface ThemeSelectorProps {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  className?: string;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  themeMode,
  setThemeMode,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const options: { id: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { id: "light", label: "Light", icon: <Sun className="w-4 h-4 text-amber-500" /> },
    { id: "dark", label: "Dark", icon: <Moon className="w-4 h-4 text-blue-400" /> },
    { id: "system", label: "System", icon: <Monitor className="w-4 h-4 text-slate-400" /> },
  ];

  const currentOption = options.find((opt) => opt.id === themeMode) || options[2];

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Current theme: ${currentOption.label}. Click to change theme.`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="flex items-center gap-1.5 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      >
        {currentOption.icon}
        <span className="text-xs font-medium hidden md:inline">{currentOption.label}</span>
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Theme options"
          className="absolute right-0 mt-2 w-36 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-1 z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          {options.map((opt) => {
            const isSelected = themeMode === opt.id;
            return (
              <button
                key={opt.id}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  setThemeMode(opt.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-colors text-left ${
                  isSelected
                    ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {opt.icon}
                <span>{opt.label}</span>
                {isSelected && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
