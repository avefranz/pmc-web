import type { Config } from "tailwindcss";

/**
 * Single palette. shadcn-style class names (border, card, muted-foreground …)
 * are aliased onto our --color-* tokens — there is no second set of variables.
 *
 * Tokens are stored as "R G B" channels in src/styles/tokens.css, which lets
 * Tailwind's opacity-modifier work everywhere: `bg-bg-card/95`, `text-fg/60`.
 */
const ds = (varName: string) => `rgb(var(${varName}) / <alpha-value>)`;

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── shadcn aliases → our tokens ───────────────────────────────
        background: ds("--color-bg"),
        foreground: ds("--color-fg"),
        border:     ds("--color-border"),
        input:      ds("--color-border"),
        ring:       ds("--color-primary"),
        card: {
          DEFAULT:    ds("--color-bg-card"),
          foreground: ds("--color-fg"),
        },
        popover: {
          DEFAULT:    ds("--color-bg-card"),
          foreground: ds("--color-fg"),
        },
        primary: {
          DEFAULT:    ds("--color-primary"),
          foreground: ds("--color-primary-fg"),
        },
        secondary: {
          DEFAULT:    ds("--color-bg-subtle"),
          foreground: ds("--color-fg"),
        },
        muted: {
          DEFAULT:    ds("--color-bg-subtle"),
          foreground: ds("--color-fg-muted"),
        },
        accent: {
          DEFAULT:    ds("--color-primary"),
          foreground: ds("--color-primary-fg"),
        },
        destructive: {
          DEFAULT:    ds("--color-danger"),
          foreground: ds("--color-primary-fg"),
        },

        // ── Design-system tokens ───────────────────────────────────────
        bg:           ds("--color-bg"),
        "bg-card":    ds("--color-bg-card"),
        "bg-subtle":  ds("--color-bg-subtle"),
        fg:           ds("--color-fg"),
        "fg-muted":   ds("--color-fg-muted"),
        "fg-subtle":  ds("--color-fg-subtle"),
        "border-strong": ds("--color-border-strong"),
        brand: {
          DEFAULT: ds("--color-primary"),
          hover:   ds("--color-primary-hover"),
          fg:      ds("--color-primary-fg"),
        },
        success: ds("--color-success"),
        warning: ds("--color-warning"),
        danger:  ds("--color-danger"),
      },
      fontFamily: {
        sans:    ["Plus Jakarta Sans", "Noto Sans Thai", "system-ui", "sans-serif"],
        display: ["var(--font-display)"],
        mono:    ["var(--font-mono)"],
      },
      borderRadius: {
        // shadcn (kept — Radix components reference --radius)
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // design-system
        pill: "var(--radius-pill)",
        xl:   "var(--radius-xl)",
      },
      boxShadow: {
        card:  "var(--shadow-card)",
        hover: "var(--shadow-hover)",
        pop:   "var(--shadow-pop)",
      },
    },
  },
  plugins: [],
};

export default config;
