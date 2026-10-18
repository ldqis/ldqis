import type { APIRoute } from "astro";
import template from "../../admin/config.template.yml?raw";
import pkg from "../../../package.json";
import { PRESENT, PROFILE_PATTERNS, labYears } from "../../lib/profile-fields";

// research(2026-05): Sveltia builds every "View on Live Site" link as
// `new URL(site_url).origin + '/' + preview_path` (sveltia-cms config/index.js
// `_baseURL = new URL(siteURL).origin`, entry/index.js joins it) — it discards
// site_url's PATH, so under any non-root base the base would be dropped and
// links would 404. No site_url value can fix that; the base has to live in each
// preview_path. Serving config.yml from an endpoint lets both site_url and that
// prefix derive from astro's `site` + base — same pattern as
// src/pages/robots.txt.ts. The .yml.ts → /admin/config.yml mapping mirrors
// robots.txt.ts and news/rss.xml.js.

export const GET: APIRoute = ({ site }) => {
  const base = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  // `site` is always set in astro.config.mjs; guard keeps the types honest.
  const origin = site ?? new URL("https://dataqualitylabs.com");
  // Full site root → "open production site" link (Sveltia keeps this path).
  const siteURL = new URL(base, origin).href;
  // Base path Sveltia drops from site_url, re-attached to each preview_path.
  // Base "/" → "" (no prefix); a sub-path base "/x/" → "x/".
  const basePrefix = base.replace(/^\//, "");

  // A dropdown takes plain values or label/value pairs, never both.
  const yearOptions = labYears().map((y) => ({ label: String(y), value: y }));
  const config = template
    .replaceAll("__SITE_URL__", siteURL)
    .replaceAll("__BASE_PREFIX__", basePrefix)
    .replaceAll("__CMS_VERSION__", pkg.dependencies["@sveltia/cms"])
    // The year dropdowns run from the lab's first year to this one, rebuilt on each deploy.
    .replaceAll("__YEARS_FROM_OPTIONS__", JSON.stringify(yearOptions))
    .replaceAll(
      "__YEARS_TO_OPTIONS__",
      JSON.stringify([{ label: "Present", value: PRESENT }, ...yearOptions]),
    )
    // Each link field gets the build's own pattern and message, as JSON (valid YAML).
    .replace(/__PATTERN_([A-Z]+)__/g, (_, key: string) => {
      const rule = PROFILE_PATTERNS[key.toLowerCase() as keyof typeof PROFILE_PATTERNS];
      return `${JSON.stringify(rule.pattern.source)}, ${JSON.stringify(rule.message)}`;
    });

  if (/__[A-Z_]+__/.test(config)) {
    throw new Error("admin/config.yml: unsubstituted template placeholder");
  }

  return new Response(config, {
    headers: { "Content-Type": "text/yaml; charset=utf-8" },
  });
};
