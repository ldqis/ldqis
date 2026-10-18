# LDQIS Lab Website — Roadmap

The plan for the lab's public website: what's shipped, what's planned, and the principles
behind it. Day-to-day status lives in [IMPL.md](./IMPL.md); git history has the full record.

The site is built with [Astro](https://astro.build) and deploys automatically to GitHub
Pages on every push to `main`. It's intentionally static — no backend, no database, no login.

## Principles

These hold across redesigns; changing any is a deliberate decision, not drift.

- **No backend, no auth, no database.** The previous site's login / register / data-view
  surface was its main source of risk. Design any new feature as a build-time artifact
  (Markdown + frontmatter in git) first; only escalate to server state if a static answer
  truly can't do the job.
- **Content as code.** Adding a person, project, publication, or news post is one Markdown
  commit. If editorial volume outgrows git, layer a git-based editor (Sveltia / Decap) onto
  the existing content collections — never a database.
- **Fast and light.** Astro ships zero JavaScript by default; interactivity is added only
  where it's needed (theme toggle, search). The bar is a perfect Lighthouse score across all
  four categories.
- **Accessibility is a check, not a vibe.** WCAG 2.2 AA on every page, enforced on every
  pull request by Playwright and axe-core. No manual-only a11y claims.
- **Stable identity.** The LDQIS name and palette (PMS 1505c orange, F6BE00 yellow,
  Instrument Serif + Inter type) stay constant across redesigns.
  Light-theme text never uses `#f76902` (2.98:1 fails AA, even at large sizes); it uses the
  accessible orange token. The dark theme uses `#f76902` as text because it passes there.
  Elsewhere brand orange stays for non-text accents.
- **Research before architecture.** Framework, library, and pattern choices are checked
  against current best practice and recorded in a `research(YYYY-MM):` note in the code —
  the same provenance habit as the lab's published work.
- **Don't build around gaps that are about to close.** Before hand-rolling a shim (image
  optimization, RSS, a content loader), check whether the framework already ships it or is
  about to; when a major version lands, revisit the workarounds it makes unnecessary.

## Planned

### Backlog (unprioritized)

- **Research areas / themes** — group the lab's work by problem area (data quality,
  integrity, security) on the homepage and a research page, each theme linking its projects,
  publications, and people. research(2026-06): peer lab sites (Stanford AI, Oxford OATML)
  and lab-website guidance lead with research _by theme_ over a flat paper list, so a
  visitor grasps what the lab works on before the formal publications. Source:
  theacademicdesigner.com, OpenScholar lab-site structure.
- **Join the lab** — a static "open positions / prospective students" page (what the lab
  looks for, how to apply via the existing intake form / contact), refreshed before
  recruiting season. research(2026-06): all three peer sites surface a recruiting CTA, and
  guidance names prospective students + collaborators as the primary audience judging a lab
  site. Source: theacademicdesigner.com, SFU Library research-website tips.
- **Admin (Sveltia CMS) UX** — the no-code `/admin` editor is live; streamline its editing
  experience (clearer fields, smoother flows) as more lab members start using it.
- **Collaborators / partners** — credit the partner institutions and people the lab works
  with (the funder list now ships as the **Funded By** section). research(2026-06): OATML
  ("Collaborators") and Stanford ("Affiliates") surface partnerships as a credibility
  signal, and the data already lives on the PI's page and in grant records, so it's ready to
  build rather than "someday".
- **Per-project demo embeds** — interactive project demos as embedded islands, if and when
  the demos have hosted surfaces.
- **Multi-author news bylines** — when a post has more than one author.
- **Internationalization** — only if a lab member needs it.

### Looked at, deliberately not doing

research(2026-06): reviewed three peer lab sites (Stanford AI, Oxford OATML, UTRGV MI) for
ideas. These were weighed and declined, recorded so they aren't re-proposed:

- **A live social-media feed** (Stanford embeds X/Twitter) — a third-party feed is JS-heavy,
  breaks the zero-JS-by-default / perfect-Lighthouse / a11y bar, and rots when the platform
  changes (cf. Storify's shutdown). If social presence matters, use a static "follow us"
  link row or curate highlights as news. Source: Nieman Lab.
- **A dedicated events / talks page** — events pages are the top staleness liability for lab
  sites. The existing `news` collection already carries talks and defenses and auto-hides
  drafts + future-dated posts at build; revisit a separate page only with a sustained,
  maintained cadence and the same auto-archive. Source: The Academic Designer.
- **A heavy per-course collection** (syllabi, schedules) — duplicates the RIT catalog and
  goes stale; the shipped **Teaching** section (a thin link-out list) covers the need instead.
- **A rotating / punny banner** (OATML's oat puns) — characterful, but it fights the "stable
  identity" principle and isn't worth the churn.

## Shipped

Highlights below; full history in git.

- **2026-10-18: A People page.** `/people/` carries the current team and every past
  researcher; the homepage keeps the current team and links to the full roster, so it stays a
  front door rather than a directory. Nav "People" and the footer's Alumni link point there,
  and person pages link back to it. research(2026-10): university web guidance and peer lab
  sites put the full roster on its own page and keep the homepage to purpose, research, and
  highlights.

- **2026-10-18: One design language across the inner pages.** Person, project, publication, and
  news pages, the full publications list, and the 404 page drop boxed cards, all-caps labels,
  and pill tags for the homepage's hairline rules and serif sentence-case headings (a shared
  `Subhead`). Person pages lead with the name and a large photo, as Stanford HAI's do; project
  contributors and publication authors show their photos through a shared `PeopleList` instead
  of initials chips. research(2026-10): reviewed Stanford HAI person pages and Ai2's team
  directory, where large photos and type carry the page.

- **2026-10-18: Featured publications, named project groups, and a clearer support path.**
  Publications take a `featured` flag (CMS-editable); the homepage's "Selected publications"
  shows only featured entries, chosen from the senior members' strongest recent work (DSN 2026,
  IEEE TDSC 2025, IEEE Intelligent Systems 2026, ICMLA 2025, and Dr. Reznik's Wiley-IEEE book),
  and every entry still appears on its authors' pages. The projects section names its two groups,
  "Research projects" and "Agentic AI tools", and each project card links its page again. The
  support box splits into Give and Partner paths and shows the email address with a copy button
  instead of a bare mailto button. research(2026-10): a mailto button hides the address and
  dead-ends without a desktop mail app. Sources: adamsilver.io, SMU web guidelines.

- **2026-10-18: Lines, not boxes, and a hero built from real data.** Every homepage section
  (research areas, projects, publications, people, teaching, funding) trades rounded, bordered
  cards for hairline rules and whitespace, from shared `SectionHeader`, `ProjectCard`, and
  `PersonCard` components; section labels are sentence case, and the numbering and arrows that
  implied sequence or decoration are gone. The hero's signature is now InteFL's real weekly
  experiment record, which rises once on load (not with reduced motion), and the four stat
  tiles became one sentence with the same live counts. research(2026-10): recognized lab sites
  are restrained and let typography, spacing, and rules carry structure; the design-award
  rubric weights design and usability over spectacle, and current motion practice is one
  purposeful, reduced-motion-aware moment. Sources: thisisvisceral.com, the-scientist.com,
  utsubo.com, motionkit.io.

- **2026-10-18: No layout shift while fonts load.** Fonts are declared through Astro's Fonts
  API, which adds fallback faces with metrics matched to Inter and Instrument Serif, and the
  body and heading faces are preloaded. The homepage's CLS went from 0.11 to under 0.01 and
  every page type scores 100 in all four Lighthouse categories; an e2e test holds CLS under
  0.02 while the other faces arrive late. research(2026-10): Astro Fonts API optimized
  fallbacks; web.dev rates CLS up to 0.1 as good. Source: docs.astro.build/en/guides/fonts.

- **2026-10-18: A lighter footer.** The footer follows the site's theme under a hairline rule
  instead of a fixed black block, and holds only what the header lacks: the lab's address and
  email, its own links, and Scholar, GitHub, and RSS. research(2026-10): recognized lab sites
  are restrained and separate text with lines rather than boxes. Sources: thisisvisceral.com
  (Flatiron, Biohub), the-scientist.com lab website awards.

- **2026-10-17: News cover photos.** A post can carry one optional cover photo, optimized by
  Astro, with required alt text and a caption that credits the photographer. It heads the post,
  appears as a thumbnail in the news list, and becomes the post's share image (cropped to
  1200x630). News dates now read the frontmatter day in UTC, so no build zone shifts them.

- **2026-10-18: Projects grouped as research and software.** Projects take a `kind` (research
  or software), editable in the CMS. The homepage lists research projects, then a software
  section for tools the lab maintains. research(2026-10): lab sites list the
  software they maintain apart from their research projects. Sources:
  labs.csc.uni-frankfurt.de, ling.uni-konstanz.de computational-linguistics lab.

- **2026-10-17: InteFL experiment record.** The InteFL project page shows the lab's experiment
  database: a one-line summary, a weekly chart that reads out by pointer or keyboard, and what
  the runs covered (attacks by family, datasets by domain and partition). The homepage card
  carries the run count. Built at deploy from InteFL's public endpoint, redeployed hourly when the
  numbers change, so it ships as static HTML with a small script for the chart. research(2026-10):
  bars, not a line, for bursty weekly counts, with zero weeks kept visible; a real table and
  text-bearing lists stand in for the chart for assistive tech. Sources:
  datadoghq.com/blog/timeseries-metric-graphs-101,
  sarasoueidan.com/blog/accessible-data-charts-for-khan-academy-2018-annual-report.

- **2026-10-16: Moved to the ldqis org and dataqualitylabs.com.** The repo lives in the lab-owned
  `ldqis` organization and the site builds only for <https://dataqualitylabs.com/>. DNS and the
  domain are described in [MAINTAINING.md](./MAINTAINING.md).

- **Footer and site search.** Every page ends in one black footer: the lab's address and
  contact, primary links, and the lab's own links. The site is the lab's own, so it carries
  no RIT logo or RIT policy links. A header search button opens Pagefind's modal over an index built from each
  page's `<body>`, with nav and footer left out by Pagefind's defaults and the 404 page and `/admin` excluded. research(2026-10): Pagefind 1.5 component UI (`pagefind-modal`) uses a
  native `<dialog>` for focus trapping, Escape, a labelled input and result announcements,
  and `pagefind --site dist` runs after `astro build`, so CI and deploy produce the index;
  it resolves its bundle and result URLs from where it is served, so it works under any base. Source: pagefind.app/docs/components/modal.

- **Publication code links.** A publication can reference the lab project that implements it
  (a `project` field); the paper then surfaces a "Code" cross-link to that project on its
  detail page and in the homepage list (the InteFL paper links the `fl-execution-framework`
  repo). No artifact badge — none of the lab's papers went through formal artifact
  evaluation, so the schema stays ready for a real badge rather than faking one.
- **Teaching.** A homepage section lists the courses lab members teach — Dr. Reznik's
  undergraduate CSCI-331/531/532 and graduate CSCI-630/734/735/736/788 — as a thin inline
  list that links out to his maintained course pages rather than duplicating syllabi, with
  the course code as the identity anchor.
- **Funded By.** A homepage section credits the lab's competitive research awards — NSF
  (incl. SMORES #2321652 and IMPRESS-U), DoD / Army Research Office, and CRDF Global with the
  U.S. Department of State — NSF titles and dates verified against the NSF Awards API, under a
  federal-funding disclaimer.
- **Astro 6.** Upgraded from the 5.x line; `overrides.vite: ^7` keeps npm from hoisting
  Vite 8 (which breaks the build) and cleared the 5.x advisories.
- **Slim content-PR gate.** Content PRs (Markdown under `src/content/**`) merge on a fast
  `Build` (schema validation) + `pin-check`; the full app suite (lint, type-check, unit,
  E2E + a11y, Lighthouse) skips via a job-level `if:` (rationale in `ci.yml`).
- **Intake forms + email chip.** Issue forms open auto-generated, reviewed PRs for profiles,
  projects, and publications — comma-separated tags/stack, names derived from the issue
  title, each validated by `astro build` before the PR opens. Email renders as a
  click-to-mail chip with an inline copy button.
- **Profile cards.** Team cards show a photo (uploaded, GitHub-handle, or initials), social
  and academic links (website, GitHub, LinkedIn, YouTube, ORCID, Scholar, IEEE), and years
  in the lab.
- **Academic discovery metadata.** Publication pages emit Highwire `citation_*` tags (what
  Google Scholar reads), plus schema.org JSON-LD and a sitemap.
- **News + RSS.** A `news` collection with an index, per-post pages, and a valid RSS 2.0
  feed; drafts and future-dated posts are excluded at build time.
- **Content collections + detail pages.** Projects, publications, and people are Astro
  content collections, each with a prerendered detail page; projects and publications
  cross-link to the people who authored or built them.
- **Supply-chain hardening + CI.** GitHub Actions pinned to commit SHAs with a Dependabot
  cooldown; the per-PR suite runs lint, type-check, unit, a11y, and Lighthouse on app PRs.
