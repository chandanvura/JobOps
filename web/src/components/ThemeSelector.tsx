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
    { id: "dark", label: "Dark", icon: <Moon className="w-4 h-4 text-amber-400" /> },
    { id: "system", label: "System", icon: <Monitor className="w-4 h-4 text-brand-muted" /> },
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
        className="flex items-center gap-1.5 p-2 rounded-xl border border-brand-border bg-brand-surface text-brand-text hover:bg-brand-elevated active:scale-[0.98] transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
      >
        {currentOption.icon}
        <span className="text-xs font-medium hidden md:inline">{currentOption.label}</span>
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Theme options"
          className="absolute right-0 mt-2 w-36 rounded-xl border border-brand-border bg-brand-surface shadow-xl p-1 z-50 animate-in fade-in zoom-in-95 duration-100"
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
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-colors text-left active:scale-[0.98] ${
                  isSelected
                    ? "bg-brand-elevated text-brand-primary font-semibold"
                    : "text-brand-secondary hover:bg-brand-elevated hover:text-brand-text"
                }`}
              >
                {opt.icon}
                <span>{opt.label}</span>
                {isSelected && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-primary" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
