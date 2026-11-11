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
        market: {
          darkest: "#070C18",
          dark: "#0B132B",
          surface: "#111B38",
          card: "#152248",
          cardHover: "#1B2A59",
          border: "#1E2F5E",
          borderSubtle: "#162347",
          muted: "#94A3B8",
          text: "#F8FAFC",
          accent: "#38BDF8",
          operational: "#10B981",
          degraded: "#F59E0B",
          down: "#EF4444",
        }
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      }
    },
  },
  plugins: [],
};
export default config;
