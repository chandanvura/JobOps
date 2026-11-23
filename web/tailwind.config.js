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
          950: "#08090B",
          900: "#101216",
          850: "#14171E",
          800: "#171A21",
          700: "#1F232D",
          600: "#2B303C",
        },
      },
      fontFamily: {
        sans: ["'Geist'", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["'Geist Mono'", "monospace"],
      },
      transitionTimingFunction: {
        base: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
