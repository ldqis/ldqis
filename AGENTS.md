# ldqis

The website of RIT's Laboratory of Data Quality and Intelligent Security: an Astro and Tailwind static site on GitHub Pages, with every person, project, publication and news post a Markdown file under `src/content/`. Start with [README.md](README.md); hosting, the domain, the CMS and handover are in [MAINTAINING.md](MAINTAINING.md).

## Commands

`make help` lists every target. Run `make setup` once, then `make validate` (lint, type check, unit tests, build) before a PR. `make test-e2e` needs a build first. `make dev` and `make preview` are interactive servers.

## Rules

- Work in a git worktree and open a pull request; `main` is protected.
- Never commit `COMMITS.md` (a local scratchpad).
- Content schemas live in `src/content.config.ts`; a bad cross-reference should fail the build, so fix the entry rather than loosen the schema.
- `src/admin/config.template.yml` configures the browser editor at `/admin`; see MAINTAINING.md before changing how CMS edits publish.
- Public pages speak to the lab and its visitors: no internal milestone or planning jargon.
- The README's `make` targets and tool claims are checked by `scripts/check-readme-claims.mjs`; keep them in step when editing README.md.
- Accessibility (WCAG 2.2 AA) is tested by axe-core in the e2e suite; do not remove those checks to make a page pass.
- Source PDFs, `.env` files and `logs/` stay untracked.

## State

`IMPL.md` holds the current slice and next step; `ROADMAP.md` the long view.
`.claude/skill-context.md` holds the facts the techne skills read for this repo.
