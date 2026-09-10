import type { Config } from "tailwindcss";

/**
 * Cores vêm todas de custom properties (src/app/globals.css) — nenhuma cor
 * literal aqui, pra que o tema litúrgico (que sobrescreve as properties)
 * alcance a interface inteira sem tocar em componente nenhum.
 */
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],

  /**
   * `dark:` segue o tema ESCOLHIDO no app, e não a preferência do sistema.
   *
   * Sem esta linha, o Tailwind usa `prefers-color-scheme` — então quem
   * escolhia tema claro em /eu/aparência, com o celular no escuro, via a
   * interface clara com retoques escuros no meio. As cores do app nunca
   * tiveram esse problema (vêm de custom properties sob
   * `[data-color-scheme]`); só os utilitários `dark:` divergiam.
   */
  darkMode: ["selector", '[data-color-scheme="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "rgb(var(--color-primary) / <alpha-value>)",
          hover: "rgb(var(--color-primary-hover) / <alpha-value>)",
          light: "rgb(var(--color-primary-light) / <alpha-value>)",
          tint: "rgb(var(--color-primary-tint) / <alpha-value>)",
        },
        gold: {
          DEFAULT: "rgb(var(--color-gold) / <alpha-value>)",
          soft: "rgb(var(--color-gold-soft) / <alpha-value>)",
        },
        // Alias histórico de `gold` — várias telas já usam `accent`.
        accent: "rgb(var(--color-gold) / <alpha-value>)",
        background: "rgb(var(--color-background) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        sunken: "rgb(var(--color-sunken) / <alpha-value>)",
        inverse: "rgb(var(--color-inverse) / <alpha-value>)",
        foreground: "rgb(var(--color-foreground) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        border: {
          DEFAULT: "rgb(var(--color-border) / <alpha-value>)",
          strong: "rgb(var(--color-border-strong) / <alpha-value>)",
        },
        success: {
          DEFAULT: "rgb(var(--color-success) / <alpha-value>)",
          tint: "rgb(var(--color-success-tint) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "rgb(var(--color-warning) / <alpha-value>)",
          tint: "rgb(var(--color-warning-tint) / <alpha-value>)",
        },
        error: {
          DEFAULT: "rgb(var(--color-error) / <alpha-value>)",
          tint: "rgb(var(--color-error-tint) / <alpha-value>)",
        },
      },
      backgroundImage: {
        // Gradiente da atmosfera litúrgica — topbar, hero, capa.
        wash: "var(--wash)",
      },
      fontFamily: {
        // `--font-sans` vem de globals.css e aponta para a família escolhida
        // em /eu/aparencia; a Inter é o padrão quando ninguém escolheu.
        sans: ["var(--font-sans, var(--fonte-inter))"],
        // Troca junto com a sans quando a pessoa escolhe uma letra legível
        // (ver globals.css); a Cormorant é o padrão.
        serif: ["var(--font-serif, var(--fonte-cormorant))"],
      },
      borderRadius: {
        md: "0.75rem",
        lg: "1.125rem",
        xl: "1.25rem",
        "2xl": "1.625rem",
      },
      boxShadow: {
        sm: "var(--shadow-1)",
        DEFAULT: "var(--shadow-2)",
        lg: "var(--shadow-3)",
      },
      letterSpacing: {
        eyebrow: "0.16em",
      },
      keyframes: {
        enter: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "none" },
        },
      },
      animation: {
        enter: "enter 0.3s var(--ease) both",
      },
    },
  },
  plugins: [],
};

export default config;
