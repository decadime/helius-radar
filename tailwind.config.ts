import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#0B0D10",
          panel: "#101317",
          raised: "#151A20",
          hover: "#1A2027",
        },
        border: {
          subtle: "#1F262E",
          strong: "#2A333D",
        },
        fg: {
          primary: "#E6EAF0",
          secondary: "#A0A8B3",
          muted: "#6B7380",
          faint: "#454C56",
        },
        accent: {
          DEFAULT: "#4F8CFF",
          hover: "#6AA1FF",
          subtle: "#1E2A44",
        },
        status: {
          ok: "#3DCC89",
          warn: "#E8B33C",
          err: "#E8553C",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "-apple-system",
          "BlinkMacSystemFont",
          "Inter",
          "Segoe UI",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: [
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
      },
    },
  },
  plugins: [],
};

export default config;
