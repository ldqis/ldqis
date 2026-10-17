# LDQIS Lab Website

Source for the website of RIT's **Laboratory of Data Quality and Intelligent Security (LDQIS)**. A static [Astro](https://astro.build/) site with Tailwind 4, deployed to GitHub Pages. It replaces the lab's older Flask + Bootstrap-4 site at `dataqualitylabs.com`.

[![Astro](https://img.shields.io/badge/Astro-6-FF5D01?style=flat-square&logo=astro&logoColor=white)](https://astro.build)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Pages](https://img.shields.io/badge/Deploy-GitHub_Pages-222?style=flat-square&logo=github)](https://dataqualitylabs.com/)
[![codecov](https://codecov.io/github/ajbarea/ldqis/graph/badge.svg?token=odipJPLUQV)](https://codecov.io/github/ajbarea/ldqis)

This is the lab's website: our people, research, projects, publications, and news. It is content as code: every project, publication, profile, and news post is a Markdown file in git. Add or edit yours through the browser editor at `/admin`, an issue form, or a pull request. No database to maintain.

## Quick start

```bash
make setup    # npm ci, clean install from lock
make dev      # hot-reload dev server at localhost:4321
make build    # production build into dist/
make check    # astro check (type-check + template validation)
```

`make help` lists every target.

## Adding content

Each kind of content is a folder under `src/content/`, and adding an entry is one new file. Schemas live in `src/content.config.ts`, so a typo in a cross-reference fails the build instead of shipping a broken page.

- **`people/`**: current team and alumni. Optional fields add a profile photo (an upload, or auto-pulled from a `github:` handle), social and academic links (website, GitHub, LinkedIn, YouTube, ORCID, Scholar, IEEE), and years in the lab. Lab members can fill all of this from the [profile form](https://github.com/ldqis/ldqis/issues/new/choose) — no file editing.
- **`projects/`**: the lab's open-source frameworks (InteFL, Phalanx-FL, Velocity-FL, Kourai Khryseai), each credited to its contributors.
- **`publications/`**: papers and books, with year, venue or publisher, and authors linked to their people entries.
- **`news/`**: dated posts, surfaced at `/news/` with an RSS feed at `/news/rss.xml`.

Every person, project, and publication renders to a stable per-page URL you can cite from a CV or profile. Cross-links (a publication's authors, a project's contributors) are computed at build time, so there is no bidirectional state to keep in sync.

## Project structure

```
src/
├── content/            # the editorial surface: people, projects, publications, news
├── content.config.ts   # collection schemas, plus the InteFL experiment-stats loader
├── lib/                # pure helpers (citations, publications, experiment stats), unit-tested
├── layouts/            # base layout: head, theme, skip-link
├── pages/              # routes, per-entry detail pages, and the news RSS endpoint
└── styles/global.css   # Tailwind 4 @theme tokens (RIT palette)

.github/workflows/      # CI gates + Pages deploy on push to main
astro.config.mjs        # site URL, base path, Tailwind plugin
```

## Accessibility

The site targets WCAG 2.2 AA, enforced on every PR by axe-core + Playwright, with Lighthouse running in CI as well. Theme toggle, skip link, semantic heading hierarchy, and `prefers-reduced-motion` are covered because they are tested, not assumed.

## Contributing

If you're in the lab, there are two no-code ways onto the site, plus git if you prefer.

**Edit anything (the CMS).** Ask a maintainer for write access to this repo, then sign in at [`/admin`](https://dataqualitylabs.com/admin/) with GitHub. You get a form editor for every person, project, publication, and news post: add, change, reorder, or delete. It commits and redeploys for you. Best for updating or fixing something that's already on the site.

**No account needed (issue forms).** Fill one in and a maintainer gets a pull request to review, no files to touch.

- [**Add or update your profile**](https://github.com/ldqis/ldqis/issues/new?template=profile.yml): your photo and links.
- [**Add a project**](https://github.com/ldqis/ldqis/issues/new?template=project.yml): an open-source project, its links, and stack.
- [**Add a publication**](https://github.com/ldqis/ldqis/issues/new?template=publication.yml): a journal paper, conference paper, or book (with DOI or ISBN).

Prefer git? Open a pull request directly; news posts are a Markdown file under `src/content/news/`.

Looking after the site itself (hosting, the domain, handing it to the next maintainer)? See [MAINTAINING.md](./MAINTAINING.md).

## Status

Live at <https://dataqualitylabs.com/>. MIT licensed.
