import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Paleta quente e acolhedora: terracota + creme, longe de dashboards
        // corporativos frios. Ver docs/FUNDACAO.md e seção 43 do PRD.
        cream: {
          50: "#fdfbf7",
          100: "#f8f2e9",
          200: "#f0e6d3",
        },
        terracotta: {
          50: "#fdf3ee",
          100: "#f9e2d4",
          300: "#e8a97e",
          500: "#c9713f",
          600: "#b25e30",
          700: "#8f4a26",
        },
        ink: {
          700: "#3d3530",
          900: "#231f1c",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
