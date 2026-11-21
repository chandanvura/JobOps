import { useState, useEffect } from "react";

export type ThemeMode = "light" | "dark" | "system";

export function useTheme() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem("jobops_theme_mode") as ThemeMode;
      if (saved === "light" || saved === "dark" || saved === "system") {
        return saved;
      }
      // Check legacy key
      const legacy = localStorage.getItem("jobops_theme");
      if (legacy === "dark" || legacy === "light") {
        return legacy;
      }
      return "system";
    } catch {
      return "system";
    }
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const saved = localStorage.getItem("jobops_theme_mode") as ThemeMode;
      if (saved === "dark") return true;
      if (saved === "light") return false;
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      const activeDark =
        themeMode === "dark" ||
        (themeMode === "system" && mediaQuery.matches);

      setIsDark(activeDark);
      if (activeDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    applyTheme();
    localStorage.setItem("jobops_theme_mode", themeMode);
    localStorage.setItem("jobops_theme", themeMode === "dark" ? "dark" : (themeMode === "light" ? "light" : (mediaQuery.matches ? "dark" : "light")));

    const handleSystemChange = () => {
      if (themeMode === "system") {
        applyTheme();
      }
    };

    mediaQuery.addEventListener("change", handleSystemChange);
    return () => mediaQuery.removeEventListener("change", handleSystemChange);
  }, [themeMode]);

  const toggleDarkMode = () => {
    setThemeMode((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return { themeMode, setThemeMode, isDark, toggleDarkMode };
}

// Backward-compatible alias
export const useDarkMode = useTheme;
