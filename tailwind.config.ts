import type { Config } from "tailwindcss";

// Johns Hopkins palette (PRD section 6): Heritage Blue primary, Spirit Blue accent.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        heritage: {
          DEFAULT: "#002D72",
          deep: "#00204F",
        },
        spirit: {
          DEFAULT: "#68ACE5",
          dark: "#3B77B8",
        },
        wash: "#EFF4FB",
        washline: "#D5E1F2",
        ink: {
          DEFAULT: "#1A1F2B",
          soft: "#48526A",
          muted: "#78819A",
        },
        line: "#DBE1EE",
        status: {
          green: "#1E6E43",
          greenbg: "#E4F2E9",
          amber: "#8A5E00",
          amberbg: "#F8EED6",
          red: "#A62B23",
          redbg: "#F9E6E4",
        },
      },
      maxWidth: {
        measure: "70ch",
      },
    },
  },
  plugins: [],
};

export default config;
