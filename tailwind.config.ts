import type { Config } from "tailwindcss";

// Tailwind v4 reads most config from CSS via @theme. This file is a thin
// content/plugin manifest. See src/app/globals.css for the design tokens.
const config: Config = {
  content: [
    "./src/**/*.{ts,tsx,mdx}",
    "./content/**/*.{md,mdx}",
  ],
  darkMode: "class",
};

export default config;
