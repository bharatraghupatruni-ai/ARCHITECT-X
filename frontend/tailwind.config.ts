import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#090D16",
        surface: {
          50: "#1E293B",
          100: "#161F30",
          200: "#111827",
          300: "#0D131F",
        },
        brand: {
          DEFAULT: "#4F46E5",
          hover: "#4338CA",
          light: "#818CF8",
          glow: "rgba(99, 102, 241, 0.15)",
        },
        accent: {
          cyan: "#06B6D4",
          emerald: "#10B981",
          amber: "#F59E0B",
          rose: "#F43F5E",
        },
        border: {
          subtle: "#1E293B",
          muted: "#334155",
          highlight: "#475569",
        }
      },
      fontFamily: {
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
