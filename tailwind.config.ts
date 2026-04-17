import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Helius-branded dark theme. Palette sourced from helius.dev:
        // warm-dark backgrounds paired with an orange-red accent
        // (#EA4E33 / #EE6F59 / #FF664D) and Helius's green (#22C55E) for
        // "ok" states.
        bg: {
          base: "#050506",
          panel: "#0E0E11",
          raised: "#17171C",
          hover: "#1D1D23",
          elevated: "#22222A",
        },
        border: {
          subtle: "#2A2A33",
          strong: "#3E3E47",
          strongest: "#55555F",
        },
        fg: {
          primary: "#E8E8EE",
          secondary: "#A0A0AA",
          muted: "#7D7D8C",
          faint: "#3E3E47",
        },
        accent: {
          DEFAULT: "#EA4E33",
          hover: "#FF664D",
          subtle: "#32120D",
          ring: "rgba(234, 78, 51, 0.35)",
        },
        status: {
          ok: "#22C55E",
          warn: "#E8B33C",
          err: "#E8553C",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "ui-sans-serif",
          "-apple-system",
          "BlinkMacSystemFont",
          "Inter",
          "Segoe UI",
          "sans-serif",
        ],
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.02) inset",
        header: "0 1px 0 0 theme('colors.border.subtle')",
        sticky:
          "0 1px 0 0 theme('colors.border.subtle'), 0 4px 10px -6px rgba(0,0,0,0.4)",
        ring: "0 0 0 3px theme('colors.accent.ring')",
      },
      transitionDuration: {
        DEFAULT: "120ms",
      },
    },
  },
  plugins: [],
};

export default config;
