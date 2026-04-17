import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#0A0C10",
          panel: "#10141A",
          raised: "#161B22",
          hover: "#1B2129",
          elevated: "#1E242D",
        },
        border: {
          subtle: "#222A34",
          strong: "#2E3842",
          strongest: "#3A4654",
        },
        fg: {
          primary: "#E8ECF2",
          secondary: "#A4ADBB",
          muted: "#6E7787",
          faint: "#454C56",
        },
        accent: {
          DEFAULT: "#4F8CFF",
          hover: "#6AA1FF",
          subtle: "#1A2540",
          ring: "rgba(79, 140, 255, 0.35)",
        },
        status: {
          ok: "#3DCC89",
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
