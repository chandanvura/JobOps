/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        crimson: {
          50: "#fbf2f2",
          100: "#f6e2e3",
          200: "#ecc9cb",
          300: "#dda4a7",
          400: "#c7757a",
          500: "#aa3840",
          600: "#8e121b",
          700: "#790b13", // User's deep crimson burgundy
          800: "#590907", // User's deep burgundy
          900: "#450605",
          950: "#270202",
        },
        ivory: {
          50: "#fefdfa",
          100: "#fcf9f2",
          200: "#f7f1e5",
          300: "#fff0dc", // User's warm ivory cream
          400: "#e8d285", // User's warm cream beige
          500: "#d9bd64",
          600: "#be9e46",
          700: "#987a32",
          800: "#7c622c",
          900: "#675127",
        },
        sage: {
          50: "#f7f8f6",
          100: "#edeee9",
          200: "#dadcd4",
          300: "#c2c5b9",
          400: "#a5a79b", // User's muted sage grey
          500: "#888a7c",
          600: "#6c6e61",
          700: "#55574c",
          800: "#46473e",
          900: "#3c3d35",
        },
        espresso: {
          700: "#38312a",
          800: "#27221c",
          900: "#1d1915",
          950: "#13100d",
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
