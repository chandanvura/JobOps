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
        navy: {
          950: "#0B1120",
          900: "#0F172A",
          850: "#131C31",
          800: "#172033",
          700: "#1E293B",
        },
        precision: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
        },
      },
      fontFamily: {
        sans: ["'Inter'", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
