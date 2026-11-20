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
          elevated: "var(--surface-elevated)",
          text: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          border: "var(--border-color)",
          borderSubtle: "var(--border-subtle)",
          primary: "var(--action-primary)",
          hover: "var(--action-hover)",
          accent: "var(--accent-bg)",
          wine: "var(--accent-wine)",
          gold: "var(--highlight-gold)",
          goldBg: "var(--highlight-gold-bg)",
        },
        charcoal: {
          950: "#110E0C",
          900: "#1C1714",
          850: "#26201B",
          800: "#312922",
          700: "#382F27",
        },
        crimson: {
          500: "#D32F2F",
          600: "#B31822",
          700: "#91111A",
          800: "#790B13",
          900: "#590907",
          950: "#2B1012",
        },
        gold: {
          300: "#F5E7B2",
          400: "#E8D285",
          500: "#D1B56A",
          600: "#B39542",
          700: "#967520",
        },
        ivory: {
          50: "#FFFDF9",
          100: "#FAF7F2",
          200: "#FFF0DC",
          300: "#EFE3D0",
        },
        sage: {
          300: "#C2C4BA",
          400: "#A5A79B",
          500: "#8B8D82",
        },
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        serif: ["'Lora'", "Georgia", "serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
