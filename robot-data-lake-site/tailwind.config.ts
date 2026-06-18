import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/{pages,components,app}/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT:"#001b5c", 950:"#00102f", 900:"#001b5c", 700:"#0a2f7a", 500:"#1e4aa8", 300:"#6f8fd0" },
        him: { purple:"#6a258a", blue:"#1e95d4", teal:"#00a9a9" },
        ink:"#0f1722", muted:"#5b6573", line:"#e3e8f0", surface:"#ffffff", surface2:"#f5f7fb",
      },
      fontFamily: { sans:["var(--font-sans)","system-ui","sans-serif"], mono:["var(--font-mono)","ui-monospace","monospace"] },
      maxWidth: { container:"1200px" },
      boxShadow: { card:"0 1px 2px rgba(0,27,92,.06), 0 8px 24px rgba(0,27,92,.06)" },
      borderRadius: { sm:"6px", md:"10px", lg:"16px" },
    },
  },
  plugins: [],
};
export default config;
