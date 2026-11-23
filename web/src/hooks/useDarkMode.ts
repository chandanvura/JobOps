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

      // Synchronize <meta name="color-scheme"> per modern-web-guidance
      try {
        let meta = document.querySelector('meta[name="color-scheme"]');
        if (!meta) {
          meta = document.createElement("meta");
          meta.setAttribute("name", "color-scheme");
          document.head.appendChild(meta);
        }
        meta.setAttribute(
          "content",
          themeMode === "dark" ? "dark" : themeMode === "light" ? "light" : "light dark"
        );
      } catch {}
    };

    applyTheme();
    try {
      localStorage.setItem("jobops_theme_mode", themeMode);
      localStorage.setItem("jobops_theme", themeMode === "dark" ? "dark" : (themeMode === "light" ? "light" : (mediaQuery.matches ? "dark" : "light")));
    } catch {}

    const handleSystemChange = () => {
      if (themeMode === "system") {
        applyTheme();
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "jobops_theme_mode" && e.newValue) {
        const val = e.newValue as ThemeMode;
        if (val === "light" || val === "dark" || val === "system") {
          setThemeMode(val);
        }
      }
    };

    mediaQuery.addEventListener("change", handleSystemChange);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      mediaQuery.removeEventListener("change", handleSystemChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [themeMode]);

  const toggleDarkMode = () => {
    setThemeMode((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return { themeMode, setThemeMode, isDark, toggleDarkMode };
}

// Backward-compatible alias
export const useDarkMode = useTheme;
