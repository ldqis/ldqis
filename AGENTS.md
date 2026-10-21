# ldqis

The website of RIT's Laboratory of Data Quality and Intelligent Security: an Astro and Tailwind static site on GitHub Pages, with every person, project, publication and news post a Markdown file under `src/content/`. Start with [README.md](README.md); hosting, the domain, the CMS and handover are in [MAINTAINING.md](MAINTAINING.md).

## Commands

`make help` lists every target. Run `make setup` in each checkout or worktree, then `make validate` (lint, type check, unit tests, build) before a PR. `make test-e2e` needs a build first. `make dev` and `make preview` are interactive servers. `make lighthouse` runs in CI; on WSL2 it can fail to reach Chrome.

## Rules

- Work in a git worktree and open a pull request; `main` is protected.
- Never commit `COMMITS.md` (a local scratchpad).
- Content schemas live in `src/content.config.ts`; a bad cross-reference should fail the build, so fix the entry rather than loosen the schema.
- `src/admin/config.template.yml` configures the browser editor at `/admin`; see MAINTAINING.md before changing how CMS edits publish.
- Public pages are written for lab members and visitors in the lab's voice; milestone names (M5, M6) and IMPL/ROADMAP references stay in the repo's own notes.
- `scripts/check-readme-claims.mjs` (run by `make lint`) checks every `make` target README.md names and its live site URL; update README.md and the script together.
- Pages meet WCAG 2.2 AA: `tests/e2e/a11y.spec.ts` runs axe-core on every built route in both themes, with no exclusions; fix the page when it fails.
- Source PDFs, `.env` files, `logs/` and `public/__seed/` (local CMS testing) stay untracked.
- Never create a branch named `cms`; it blocks the CMS's `cms/<collection>/<slug>` branches.

## State

`IMPL.md` holds the current slice and next step; `ROADMAP.md` the long view.
`.claude/skill-context.md` holds the facts the techne skills read for this repo.
