// research(2026-05): ESLint flat config is the only supported shape in ESLint 10.
// eslint-plugin-astro 1.7 ships a recommended preset that pulls in
// typescript-eslint and Astro template parsing. Prettier owns formatting; ESLint
// owns correctness. Runtime a11y is covered by @axe-core/playwright in e2e
// tests (catches ~57% of WCAG violations against the rendered HTML, vs static
// jsx-a11y rules that miss Astro template patterns). eslint-plugin-jsx-a11y
// 6.10 also still pins eslint ^9, so it would block the ESLint 10 upgrade.
import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import astroPlugin from "eslint-plugin-astro";

export default defineConfig([
  {
    ignores: [
      "dist/",
      ".astro/",
      "node_modules/",
      "coverage/",
      "playwright-report/",
      "test-results/",
      ".lighthouseci/",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...astroPlugin.configs.recommended,
  {
    // Browser globals for client-side <script> tags inside .astro files.
    languageOptions: {
      globals: {
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        console: "readonly",
      },
    },
  },
  {
    // The site logs warnings and errors only; console.log and friends never ship to a browser.
    rules: { "no-console": ["error", { allow: ["warn", "error"] }] },
  },
  {
    // Node globals for config files + build-time scripts that run under Node.
    files: [
      "*.config.{js,ts,mjs,cjs}",
      "vitest.config.ts",
      "playwright.config.ts",
      "scripts/**/*.{js,mjs,cjs}",
    ],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        fetch: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
      },
    },
    // These print their results to stdout.
    rules: { "no-console": "off" },
  },
]);
