// research(2026-05): Astro content collections use the Content Layer
// API. `glob({ pattern, base })` discovers Markdown files at build time;
// IDs are derived from filenames (no reserved `slug` field). Detail-route
// dynamic segments key off `entry.id`. Source:
// https://docs.astro.build/en/guides/content-collections/
// https://docs.astro.build/en/reference/content-loader-reference/
//
// research(2026-05): @astrojs/rss exports an `rssSchema` helper, but
// composing it via `rssSchema.extend(...)` fails because the package
// bundles its own Zod 4 internals that don't compose with the Zod the
// content layer hands us via `astro/zod`. Define the news schema
// directly with the same fields (title/description/pubDate/link/author)
// — the rss endpoint reads these by name, not by type identity. Source:
// https://docs.astro.build/en/recipes/rss/
import { glob } from "astro/loaders";
import { defineCollection, reference } from "astro:content";
import { z } from "astro/zod";
import {
  STATS_ENDPOINT,
  STATS_MIRROR,
  experimentStatsSchema,
  fetchJson,
  resolveStats,
} from "./lib/experiment-stats";
import statsSnapshot from "./data/intefl-experiments.json";

// Sveltia writes "" for a cleared optional field, which would fail the .url() /
// .regex() refinements below and block the build. Treat a blank string as absent
// so leaving an optional link/social field empty in the CMS stays valid.
const blankable = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), schema.optional());

// Projects — open-source frameworks + research artifacts the lab ships.
// Each entry's frontmatter mirrors the prior inline array in index.astro
// (name, tagline, tags[], stack, desc with allowed inline HTML, links[]).
const projects = defineCollection({
  loader: glob({ pattern: "[^_]*.md", base: "./src/content/projects" }),
  schema: z.object({
    name: z.string(),
    tagline: z.string(),
    tags: z.array(z.string()),
    // research(2026-05): array, not a "A · B" string — the separator lives at the display layer.
    stack: z.array(z.string()),
    // `desc` retains the inline-HTML escape hatch (e.g. <strong>...</strong>)
    // that the prior inline data leaned on. Markdown body could replace it
    // long-term but the data is short enough that one-line desc stays
    // readable inside frontmatter.
    desc: z.string(),
    links: z.array(z.object({ label: z.string(), href: z.url() })).min(1),
    // Ordering: lower numbers render first. Mirrors the prior array order
    // (InteFL → Sphragis → Phalanx-FL → Velocity-FL → Kourai Khryseai) without
    // depending on filesystem listing.
    order: z.number().int().nonnegative(),
    // research(2026-10): lab sites list software the lab maintains apart from its research
    // projects (Frankfurt CSC labs, Konstanz CL lab), so tools render in their own group.
    kind: z.enum(["research", "software"]).default("research"),
    // research(2026-05): Astro's `reference("people")` validates each
    // string against the people collection's IDs at build time, so a typo
    // hard-fails the build instead of rendering a broken link silently.
    // Source: https://docs.astro.build/en/guides/content-collections/#defining-collection-references
    // The reverse direction (people → projects_contributed) is computed
    // in `src/pages/people/[id].astro` by walking the projects collection.
    // One-direction storage avoids the bidirectional-sync bug class.
    contributors: z.array(reference("people")).default([]),
  }),
});

const publications = defineCollection({
  loader: glob({ pattern: "[^_]*.md", base: "./src/content/publications" }),
  schema: z.object({
    year: z.string(),
    venue: z.string(),
    // research(2026-05): venue_type drives the venue tag Google Scholar parses
    // (citation_journal_title / citation_conference_title, or citation_publisher
    // + citation_isbn for a book) and the JSON-LD type (Periodical /
    // CreativeWorkSeries / Book). Required (no default) so a paper can't
    // silently inherit a wrong venue type. Consumed by publications/[id].astro.
    venue_type: z.enum(["journal", "conference", "book"]),
    // ISBN (books only) → citation_isbn. ISBN-10 or -13, hyphens optional.
    isbn: z
      .string()
      .regex(/^[\dX-]{10,17}$/i, { message: "isbn must be an ISBN-10 or ISBN-13" })
      .optional(),
    title: z.string(),
    // The `authors` string is the canonical citation form ("D. Korobeinikov,
    // R. Zatsarenko, …") — kept for venues like RSS that need a flat string.
    // `author_ids` is the structured form that resolves to per-person detail
    // pages; it can be a subset when not every author is in the people
    // collection (e.g. external collaborators on multi-institution papers).
    authors: z.string(),
    author_ids: z.array(reference("people")).default([]),
    link: z.object({ label: z.string(), href: z.url() }),
    // Optional link to the lab project that implements this paper (its code +
    // artifacts). Surfaces a "Code" cross-link on the publication. `blankable`
    // keeps a cleared CMS field valid; reference() hard-fails the build on a bad
    // project id. The reverse (project → its papers) is intentionally not stored.
    project: blankable(reference("projects")),
    // Shown under "Selected publications" on the homepage. Every entry still appears on its
    // authors' pages and has its own page; featuring picks the lab's strongest recent work.
    featured: z.boolean().default(false),
  }),
});

// People — current + past cohort. `cohort` discriminates the section the
// person lands in on the homepage. `lead: true` reserves the wider card
// for the principal investigator.
const people = defineCollection({
  // `[^_]*.md` ignores files prefixed with "_" (e.g. people/_example.md, the
  // copy-me profile template). Astro's glob loader no longer auto-skips them.
  loader: glob({ pattern: "[^_]*.md", base: "./src/content/people" }),
  // `({ image })` unlocks the image() helper so `avatar` can be an optimized
  // local image (Astro processes + hashes it at build).
  schema: ({ image }) =>
    z.object({
      initials: z.string().min(1).max(3),
      name: z.string(),
      role: z.string(),
      email: blankable(z.email()),
      // Optional Google Scholar profile URL. When set, the homepage team
      // card + the per-person detail page render a "Google Scholar" link
      // alongside the email button. Constrained to the scholar.google.com
      // host so a typo in the frontmatter (e.g. dropping the URL or
      // pasting a researchgate link) doesn't silently surface as an
      // ambiguous external link.
      scholar: blankable(
        z.url().regex(/^https:\/\/scholar\.google\.com\//, {
          message: "scholar URL must point at https://scholar.google.com/",
        }),
      ),
      // Optional IEEE Xplore author-profile URL. Same treatment as `scholar`:
      // host-constrained so a mistyped or wrong-host link fails the build.
      ieee: blankable(
        z.url().regex(/^https:\/\/ieeexplore\.ieee\.org\//, {
          message: "ieee URL must point at https://ieeexplore.ieee.org/",
        }),
      ),
      // --- Social / web links (all optional; paste the full URL unless noted) ---
      // Personal website or homepage.
      website: blankable(z.url()),
      // GitHub *handle* (e.g. "ajbarea", not a URL). Drives the GitHub link and —
      // when no `avatar` image is set — the profile photo (github.com/<handle>.png).
      github: blankable(
        z.string().regex(/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/, {
          message: 'github must be a handle like "ajbarea", not a URL',
        }),
      ),
      linkedin: blankable(
        z.url().regex(/linkedin\.com\//, { message: "linkedin must be a linkedin.com URL" }),
      ),
      youtube: blankable(
        z.url().regex(/youtube\.com\/|youtu\.be\//, {
          message: "youtube must be a youtube.com URL",
        }),
      ),
      // ORCID iD in canonical 0000-0000-0000-0000 form (the link is built from it).
      orcid: blankable(
        z.string().regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/, {
          message: "orcid must be an iD like 0000-0002-1825-0097",
        }),
      ),
      // Profile photo: drop a file in src/content/people/avatars/ and set
      // `avatar: ./avatars/your-name.jpg`. Astro optimizes it. Falls back to the
      // GitHub avatar (if `github` set), then initials.
      avatar: image().optional(),
      // Years in the lab, e.g. "2018–2022" or "2021" (handy for alumni).
      years: z.string().optional(),
      cohort: z.enum(["current", "past"]),
      lead: z.boolean().optional(),
      order: z.number().int().nonnegative(),
    }),
});

// News / blog posts — dated, optional tags + author. Field names match
// the RSS feed item shape so news/rss.xml.js can pass them straight
// through to @astrojs/rss without re-mapping.
const news = defineCollection({
  loader: glob({ pattern: "[^_]*.md", base: "./src/content/news" }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string().min(1),
        description: z.string().optional(),
        summary: z.string().min(1).max(280),
        pubDate: z.coerce.date(),
        tags: z.array(z.string()).default([]),
        author: z.string().default("LDQIS"),
        // `draft: true` keeps a post out of indexes + RSS without removing the
        // file. Future-dated posts (pubDate > now at build time) are also
        // hidden — see news/index.astro + rss.xml.js filters.
        draft: z.boolean().default(false),
        // research(2026-06): peer lab sites pair each news item with one image for scanability.
        // Optional cover photo (src/content/news/images/), optimized by Astro; it needs alt text,
        // and the caption credits the photographer.
        cover: image().optional(),
        coverAlt: blankable(z.string().min(1)),
        coverCaption: blankable(z.string().min(1)),
      })
      .refine((d) => !d.cover || d.coverAlt, {
        message: "coverAlt is required when a cover image is set",
        path: ["coverAlt"],
      }),
});

// research(2026-10): Astro ships no remote loader, so this is an object loader (it gets
// `logger` + `parseData`, which an inline loader does not). The data store only changes at
// build time; .github/workflows/refresh-stats.yml redeploys hourly when the stats change.
// InteFL's live endpoint wins; if it is down, the newer of the copy this site last deployed
// and the committed snapshot (so an offline build still works) is used.
// Entry ids are project ids: projects/[id].astro renders the stats on that project's page.
// Source: https://docs.astro.build/en/reference/content-loader-reference/
const experimentStats = defineCollection({
  loader: {
    name: "intefl-experiment-stats",
    load: async ({ store, logger, parseData }) => {
      const { stats, source } = await resolveStats(
        { name: STATS_ENDPOINT, get: fetchJson(STATS_ENDPOINT) },
        [
          // Pages' CDN caches this copy for up to 10 minutes and ignores query strings, so
          // within 10 minutes of a deploy it can be one deploy behind.
          { name: STATS_MIRROR, get: fetchJson(STATS_MIRROR) },
          { name: "src/data/intefl-experiments.json", get: async () => statsSnapshot },
        ],
        (msg) => logger.warn(msg),
      );
      logger.info(`InteFL stats from ${source} (generated ${stats.generated_at})`);
      store.clear();
      store.set({ id: "intefl", data: await parseData({ id: "intefl", data: stats }) });
    },
  },
  schema: experimentStatsSchema,
});

export const collections = { projects, publications, people, news, experimentStats };
