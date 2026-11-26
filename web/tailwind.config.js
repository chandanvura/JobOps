/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "var(--bg-main)",
          surface: "var(--surface-primary)",
          secondarySurface: "var(--surface-secondary)",
          elevated: "var(--surface-elevated)",
          text: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          border: "var(--border-color)",
          borderSubtle: "var(--border-subtle)",
          primary: "var(--action-primary)",
          hover: "var(--action-hover)",
          accent: "var(--accent-color)",
          accentSoft: "var(--accent-soft)",
          success: "var(--success-color)",
          warning: "var(--warning-color)",
          danger: "var(--danger-color)",
          info: "var(--info-color)",
        },
        obsidian: {
          950: "#09090D",
          900: "#121217",
          850: "#16161D",
          800: "#1A1A22",
          700: "#22222C",
          600: "#2C2C38",
        },
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      borderRadius: {
        outer: "20px",
        control: "12px",
      },
      transitionTimingFunction: {
        base: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
