import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: { colors: { ink: "#18243a", blue: "#416ee9", light: "#f7f9fd" }, fontFamily: { sans: ["Arial", "Helvetica", "sans-serif"] } } },
  plugins: []
} satisfies Config;
