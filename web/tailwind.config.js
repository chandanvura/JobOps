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
          primary: "var(--action-primary)",
          hover: "var(--action-hover)",
          accent: "var(--accent-bg)",
          gold: "var(--highlight-gold)",
        },
        charcoal: {
          950: "#15120F",
          900: "#211C18",
          850: "#28221C",
          800: "#322B24",
          700: "#423A31",
        },
        crimson: {
          600: "#BD252D",
          700: "#A61921",
          800: "#790B13",
          900: "#590907",
          950: "#321416",
        },
        gold: {
          400: "#E8D285",
          500: "#D1B56A",
          600: "#B39542",
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
