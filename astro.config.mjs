// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { createHash } from "node:crypto";
import { cpSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, resolve, sep } from "node:path";
import { URL, fileURLToPath } from "node:url";

// research(2026-05): Tailwind 4 ships as a Vite plugin (`@tailwindcss/vite`).
// The older `@astrojs/tailwind` integration is deprecated for Tailwind 4 per
// astro docs + the official Tailwind installation guide. Source:
// https://tailwindcss.com/docs/installation/framework-guides/astro
//
// research(2026-05): @tailwindcss/vite's wide vite peer range
// (^5.2 || ^6 || ^7 || ^8) lets npm hoist vite 8 over Astro 6's required
// vite 7, breaking the build ("Missing field `tsconfigPaths`..."). The
// `overrides.vite: ^7` pin in package.json prevents this; don't drop it
// without re-testing the build. (withastro/astro#16542; Astro 6 uses
// vite 7 + Rollup, not rolldown.)

// research(2026-10): Sveltia is self-hosted from the `@sveltia/cms` npm package
// rather than unpkg. Its entry script resolves its chunks relative to its own URL
// (`document.currentScript`), so a same-origin copy loads them locally. The copy
// goes into the build output (`astro:build:done`) and is served from node_modules
// in dev (`astro:server:setup`), so nothing is written into public/.
const CMS_DIST = fileURLToPath(new URL("./node_modules/@sveltia/cms/dist", import.meta.url));
const CMS_SKIP = /\.(map|mjs)$/;
/** @type {Record<string, string>} */
const CMS_TYPES = { ".js": "text/javascript; charset=utf-8" };

/** @type {() => import("astro").AstroIntegration} */
const sveltiaCms = () => {
  let base = "/";
  return {
    name: "sveltia-cms",
    hooks: {
      "astro:config:setup": ({ config }) => {
        base = config.base.endsWith("/") ? config.base : `${config.base}/`;
      },
      "astro:server:setup": ({ server }) => {
        // Match the original URL, so only base + admin/cms/ is served, as in production.
        const prefix = `${base}admin/cms/`;
        server.middlewares.use((req, res, next) => {
          const url = (req.originalUrl ?? req.url ?? "").split("?")[0];
          if (!url.startsWith(prefix)) return next();
          try {
            const rel = decodeURIComponent(url.slice(prefix.length));
            const file = resolve(CMS_DIST, rel);
            if (CMS_SKIP.test(rel) || !file.startsWith(CMS_DIST + sep)) return next();
            if (!statSync(file).isFile()) return next();
            res.setHeader("Content-Type", CMS_TYPES[extname(file)] ?? "application/octet-stream");
            res.end(readFileSync(file));
          } catch {
            next();
          }
        });
      },
      "astro:build:done": ({ dir }) => {
        // Lets the e2e staleness check compare the lockfile by content, not mtime.
        const lock = readFileSync(new URL("./package-lock.json", import.meta.url));
        writeFileSync(
          join(fileURLToPath(dir), ".lock-hash"),
          createHash("sha256").update(lock).digest("hex"),
        );
        cpSync(CMS_DIST, join(fileURLToPath(dir), "admin", "cms"), {
          recursive: true,
          filter: (f) => !CMS_SKIP.test(f),
        });
      },
    },
  };
};

// research(2026-10): Pagefind indexes built HTML, so `astro dev` has no index of its own.
// This serves the one from the last `npm run build` (dist/pagefind) at <base>/pagefind/,
// so search works in dev against that snapshot; without a build the header button hides.
const PAGEFIND_DIST = fileURLToPath(new URL("./dist/pagefind", import.meta.url));
/** @type {Record<string, string>} */
const PAGEFIND_TYPES = {
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

/** @type {() => import("astro").AstroIntegration} */
const pagefindDev = () => {
  let base = "/";
  return {
    name: "pagefind-dev",
    hooks: {
      "astro:config:setup": ({ config }) => {
        base = config.base.endsWith("/") ? config.base : `${config.base}/`;
      },
      "astro:server:setup": ({ server }) => {
        const prefix = `${base}pagefind/`;
        server.middlewares.use((req, res, next) => {
          const url = (req.originalUrl ?? req.url ?? "").split("?")[0];
          if (!url.startsWith(prefix)) return next();
          try {
            const file = resolve(PAGEFIND_DIST, decodeURIComponent(url.slice(prefix.length)));
            if (!file.startsWith(PAGEFIND_DIST + sep) || !statSync(file).isFile()) return next();
            res.setHeader(
              "Content-Type",
              PAGEFIND_TYPES[extname(file)] ?? "application/octet-stream",
            );
            res.end(readFileSync(file));
          } catch {
            next();
          }
        });
      },
    },
  };
};

// research(2026-10): web fonts that swap in after first paint reflow the hero and shift the
// stats strip (Lighthouse CLS ~0.10, all of it font loading). Astro's Fonts API emits
// fallback faces whose metrics are adjusted to match each font, so the swap no longer moves
// text. The files stay the self-hosted Fontsource ones from npm: this reads Fontsource's own
// CSS to list every file with its weight, style and unicode-range. No font is fetched at build.
// BaseLayout preloads the body and heading faces (Inter 400, Instrument Serif 400) so text
// does not rewrap when they arrive. Astro's local provider preloads by weight and style, not
// subset, so each family keeps only the subsets the site uses: Latin, plus Greek in Inter for
// the α in the experiment record. The site has no extended-Latin text; add "latin-ext" here
// if it ever does.
// Source: https://docs.astro.build/en/guides/fonts/
/** @param {string} pkg @param {string[]} cssFiles @param {string[]} subsets */
const fontsourceVariants = (pkg, cssFiles, subsets) =>
  cssFiles.flatMap((css) => {
    const dir = `./node_modules/@fontsource/${pkg}`;
    const text = readFileSync(new URL(`${dir}/${css}`, import.meta.url), "utf8");
    // Each face is preceded by a comment naming it: /* inter-latin-ext-400-normal */
    const face = new RegExp(
      `/\\* ${pkg}-([a-z-]+)-\\d+-(?:normal|italic) \\*/\\s*@font-face \\{([^}]*)\\}`,
      "g",
    );
    // Latin first: Astro derives the fallback's metrics from the first file it is given.
    return [...text.matchAll(face)]
      .filter(([, subset]) => subsets.includes(subset))
      .sort(([, a], [, b]) => subsets.indexOf(a) - subsets.indexOf(b))
      .map(([, , body]) => {
        const get = (/** @type {string} */ k) =>
          body.match(new RegExp(`${k}:\\s*([^;]+);`))?.[1].trim();
        const file = body.match(/url\(\.\/(files\/[^)]+\.woff2)\)/)?.[1];
        const range = get("unicode-range");
        if (!file || !range) throw new Error(`unreadable @font-face in ${pkg}/${css}`);
        return {
          weight: Number(get("font-weight")),
          style: /** @type {"normal" | "italic"} */ (get("font-style")),
          src: /** @type {[string]} */ ([`${dir}/${file}`]),
          display: /** @type {"swap"} */ ("swap"),
          unicodeRange: /** @type {[string, ...string[]]} */ (range.split(",")),
        };
      });
  });

/** @template T @param {T[]} list @returns {[T, ...T[]]} */
const nonEmpty = (list) => {
  if (!list.length) throw new Error("no Fontsource files matched the requested subsets");
  return /** @type {[T, ...T[]]} */ (list);
};

export default defineConfig({
  fonts: [
    {
      provider: fontProviders.local(),
      name: "Inter",
      cssVariable: "--font-inter",
      fallbacks: ["sans-serif"],
      options: {
        variants: nonEmpty(
          fontsourceVariants(
            "inter",
            ["400.css", "500.css", "600.css", "700.css"],
            ["latin", "greek"],
          ),
        ),
      },
    },
    {
      provider: fontProviders.local(),
      name: "Instrument Serif",
      cssVariable: "--font-instrument-serif",
      fallbacks: ["serif"],
      options: {
        variants: nonEmpty(
          fontsourceVariants("instrument-serif", ["400.css", "400-italic.css"], ["latin"]),
        ),
      },
    },
  ],
  site: "https://dataqualitylabs.com",
  // research(2026-05): @astrojs/sitemap auto-generates
  // sitemap-index.xml from `site` + `base`, surfacing the publication /
  // people / project detail pages to crawlers (incl. Google Scholar). The
  // build-time robots.txt endpoint (src/pages/robots.txt.ts) points at it.
  // Source: https://docs.astro.build/en/guides/integrations-guide/sitemap/
  integrations: [sitemap(), sveltiaCms(), pagefindDev()],
  vite: {
    plugins: [tailwindcss()],
  },
});
