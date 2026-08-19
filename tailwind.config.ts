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
        // Fundação do redesign visual (docs do redesign, seção 17) — tokens
        // via CSS custom properties (ver globals.css), ainda não aplicados
        // às telas existentes. Nomes distintos de cream/terracotta/ink de
        // propósito, pra não confundir durante a migração gradual.
        primary: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
          light: "var(--color-primary-light)",
        },
        accent: "var(--color-accent)",
        surface: "var(--color-surface)",
        foreground: "var(--color-foreground)",
        muted: "var(--color-muted)",
        border: "var(--color-border)",
        background: "var(--color-background)",
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
