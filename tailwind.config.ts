import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#07130f",
        mist: "#f6f8f7",
        line: "#dfe8e3",
        leaf: {
          50: "#effbf4",
          100: "#d8f5e4",
          200: "#b4ebcb",
          300: "#80dca9",
          400: "#49c682",
          500: "#20a862",
          600: "#16894f",
          700: "#136d42",
          800: "#125637",
          900: "#0f472f"
        }
      },
      boxShadow: {
        soft: "0 24px 80px rgba(7, 19, 15, 0.08)",
        glow: "0 0 0 1px rgba(32, 168, 98, 0.18), 0 24px 80px rgba(32, 168, 98, 0.18)"
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif"
        ]
      }
    },
  },
  plugins: [],
};

export default config;
