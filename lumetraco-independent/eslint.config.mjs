import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";
const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });
const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "public/vendor/**", "test-results/**"] },
  { files: ["**/*.cjs", "public/*.js"], rules: { "@typescript-eslint/no-require-imports": "off" } },
  // Uploaded blob URLs must stay local; next/image optimization would upload them.
  { files: ["src/app/editor/page.tsx"], rules: { "@next/next/no-img-element": "off" } },
];
export default config;
