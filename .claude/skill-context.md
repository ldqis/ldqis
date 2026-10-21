# skill-context — ldqis

Repo-specific facts for canonical techne skills. Injected into each skill at
invocation via `!cat .claude/skill-context.md`. Update on toolchain / path /
tooling changes.

## repo

- name: ldqis
- owner: team
- audience: RIT Reznik lab site with outside contributors, not a solo research sister. Public-facing content uses a team-facing voice: no solo conventions ("Why <name>" etymology, sister-ecosystem framing), no internal jargon (M5/M6 milestones, IMPL/ROADMAP) in user-facing pages.
- package_root: `src/` (Astro pages + layouts + components + styles + content), `public/` (static assets served as-is), `tests/` (unit + e2e)
- language: TypeScript (Astro 5 + Tailwind 4) — no Python, no Rust
- cli_entrypoint: `npm run <script>` (see `package.json` `scripts`) wrapped by `make <target>` (see `Makefile`)
- runner_module: no Python runner; npm scripts drive the pipeline
- default_branch: `main` (ci.yml + deploy.yml triggers on push)
- has: Astro 5 (output: "static"), Tailwind 4 via `@tailwindcss/vite`, TypeScript strict, ESLint 10 flat config + Prettier 3, Vitest 4 + happy-dom for unit, Playwright + @axe-core/playwright for e2e + a11y, Lighthouse CI for perf/SEO assertions, GitHub Pages deploy via Actions, content cherry-picked from a 2026-02 Claude Cowork session

## audit

Audit drives the wrapper `make` targets, in dependency order:

### Phase 1 — Setup

1. `make setup` — `npm ci` clean install from `package-lock.json`. **Required before every downstream step.**

### Phase 2 — Fix (one-way door)

2. `make fix` — `eslint --fix` + `prettier --write` across the repo. Run before lint when iterating.

### Phase 3 — Granular lint

3. `make lint` — `eslint .` + `prettier --check .` (no auto-fix).
4. `make check` — `astro check` (TypeScript + `.astro` template type-checking). Surfaces type errors and Astro template issues.

### Phase 4 — Granular test

5. `make test-unit` — Vitest. Astro `getViteConfig()` seeds Vitest with the project's Vite resolution; happy-dom is the test environment.
6. `make test-e2e` — Playwright + @axe-core/playwright. Spawns `astro preview` via `playwright.config.ts`'s `webServer` block; serves the `dist/` build at the root path. **Requires `make build` first** (or any state that produced a valid `dist/`).
7. `make test` — combined unit + e2e.

### Phase 5 — End-to-end gates

8. `make build` — `astro build`, the "is it deployable" probe. Generates static HTML/CSS/JS into `dist/`.
9. `make validate` — fast pre-push gate (`lint + check + test-unit + build`). Skips e2e + lighthouse for speed; CI runs all gates.
10. `make audit` — `npm audit`. Informational only. The Astro 5 CVEs and the `@lhci/cli` transitive-dep CVEs are deliberately accepted (unpatched-upstream pattern; see `astro.config.mjs` research comment + ROADMAP).
11. `make lighthouse` — Lighthouse CI run, asserts performance / a11y / best-practices / SEO categories at ≥0.95. Loose-floor on category scores keeps CI stable against Lighthouse's run-to-run jitter while still gating the 100/100/100/100 ROADMAP intent.

Fast audit = `make setup → make lint → make check → make test-unit → make build`. Five commands. Mirrors `make validate`.

Stop-early phase: Phase 1 (`make setup`). If install fails, abort — every downstream step depends on it.

Log archive: `logs/dev-<YYYYMMDDTHHMMSS>-<cmd>.log` + pointer `logs/dev-latest.log`. Written by `scripts/dev-runner.sh <target>` (mirror of techne's wrapper). Invoke via `./scripts/dev-runner.sh <target>` to get the archive + SUMMARY block; bare `make <target>` runs the same command without logging. CI continues to use bare `make` / npm scripts; the wrapper is the local-audit entrypoint. Do **not** read `dev-latest.log` (overwritten each invocation).

Do-not-run targets (long-running or interactive):

- `make dev` (interactive Astro dev server)
- `make preview` (interactive preview server)

WSL2 caveat: `make lighthouse` may fail locally if Chrome can't bind across the WSL2 boundary; the CI ubuntu-latest runner with native Chromium handles this cleanly. If a local lighthouse run is needed, run from a native Linux box or use the `lhci` Docker image.

## ci_audit

Referenced configs a CI failure can trace to:

- `package.json` (scripts, deps, engines)
- `astro.config.mjs` (site, base, Vite plugins including `@tailwindcss/vite`)
- `tsconfig.json` (extends `astro/tsconfigs/strict`)
- `src/styles/global.css` (Tailwind 4 `@theme` token registry — design tokens live in CSS, not config)
- `eslint.config.js` (ESLint 10 flat config; uses `eslint-plugin-astro` + `typescript-eslint`)
- `.prettierrc.json` (Prettier + `prettier-plugin-astro` + `prettier-plugin-tailwindcss`)
- `vitest.config.ts` (uses Astro's `getViteConfig()` so test resolution matches the build)
- `playwright.config.ts` (chromium project + `webServer` block; `baseURL` is `/`)
- `.lighthouserc.json` (URL list + per-category score assertions + chrome flags)
- `.github/workflows/ci.yml` (lint / type / unit / e2e / lighthouse jobs)
- `.github/workflows/deploy.yml` (Pages deploy on push to main)
- `.nvmrc` (Node version pin: 24)

Tool error markers (extend the default grep set):

- `astro` (build / type-check errors)
- `vite` (dev / build pipeline errors)
- `@tailwindcss/vite` (Tailwind processing errors — note the Astro 5 vs Astro 6 rolldown incompat tracked in `astro.config.mjs` research comment)
- `rolldown` (Vite-side build errors when Astro 6 is in play; current pin is Astro 5.18.x to avoid)
- `eslint` / `prettier` (lint + format errors)
- `vitest` (unit test failures)
- `playwright` (e2e failures — also `axe`, `WCAG`, `color-contrast` for a11y findings)
- `lhci` / `lighthouse` (lighthouse-ci category-score regressions)
- `pages` / `Pages` (deploy workflow errors)

Expected external PR checks: none specific to PRs today; the in-repo CI defines five required gates (lint, type-check, unit, e2e, lighthouse).

## slop_ground_truth

Source of truth for quantitative claims in README / docs:

- **Stack version pins:** `package.json` dependencies block — claims about Astro / Tailwind / TypeScript / ESLint / Vitest / Playwright major versions must trace here.
- **Site identity strings:** `astro.config.mjs` (`site`, `base`) and `src/layouts/BaseLayout.astro` (`<title>`, `<meta>`) — claims about the deployed URL or site title trace here.
- **Theme tokens:** `src/styles/global.css` `@theme` block — claims about brand colors (PMS 1505c, F6BE00), font choices (Instrument Serif, Inter), or the AA-text variants trace here.
- **Test counts:** `tests/unit/`, `tests/e2e/` directory contents — any "N tests" claim must `wc -l` to the actual count.
- **Deploy artifacts:** `dist/` after `make build`; ephemeral. Persistent claims need to point at source files, not the build output.

Any quantitative claim not traceable to one of those is slop.

## fragile_docs

Marketing claims in `README.md` most likely to drift. The CI gate at `scripts/check-readme-claims.mjs` is wired into both `make lint` and the `lint` job in `.github/workflows/ci.yml`; extend the script (a new `// ─── …` block) and add a row here whenever a new fragile claim lands.

| README claim                                   | Ground truth                    | Verified by                                                                                                      |
| ---------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Quick-start `make <target>` invocations        | `Makefile` recipe headers       | `check-readme-claims.mjs` asserts every `make <target>` in the quick-start bash block + inline mentions resolves |
| Live site URL (`https://dataqualitylabs.com/`) | `astro.config.mjs` `site` value | `check-readme-claims.mjs` asserts the README origin appears as a string literal in the config                    |

The script does **not** gate the Project structure code block or the Sister ecosystem list:

- Project structure is illustrative orientation, not an asserted claim — adding a file shouldn't fail CI.
- Sister ecosystem cross-references are governed by `/techne:sisters` (cross-repo audit), not per-sister CI.

## scan_scope

Skip paths:

- `.astro/`, `dist/`, `node_modules/`, `coverage/`, `playwright-report/`, `test-results/`, `.lighthouseci/`
- `package-lock.json`
- `public/` is fine to scan but most files there are assets, not source

Subagent scan-area split:

- Pages + layouts: `src/pages/**/*.astro`, `src/layouts/**/*.astro`
- Components: `src/components/**/*.astro` (none yet — homepage is monolithic until M2 content-collections work)
- Content collections: `src/content/**/*.md` (none yet — land with M2)
- Styles: `src/styles/*.css`
- Tests: `tests/unit/**/*.test.ts`, `tests/e2e/**/*.spec.ts`
- Config / build: `astro.config.mjs`, `tsconfig.json`, `package.json`, `eslint.config.js`, `.prettierrc.json`, `vitest.config.ts`, `playwright.config.ts`, `.lighthouserc.json`, `.github/workflows/**`, `Makefile`, `.nvmrc`
- Docs / repo: `README.md`, `IMPL.md`, `ROADMAP.md`

## docs_site

The site **is** itself a documentation site — Astro renders to `dist/` and ships via GitHub Pages.

- config: `astro.config.mjs` (Astro 5 SSG mode + Vite Tailwind plugin)
- workflow: `.github/workflows/deploy.yml` (Actions-driven Pages deploy)
- ci_workflow: `.github/workflows/ci.yml` (per-PR lint / type / unit / e2e / lighthouse)
- build_command: `make build` / `npm run build` / `astro build`
- output_dir: `dist/`
- preview_url: `https://dataqualitylabs.com/` (base `/`)
- production_url: `https://dataqualitylabs.com`
- action_pins (expected current, 2026-05): `actions/checkout@v6.0.2`, `actions/setup-node@v6.4.0`, `actions/upload-pages-artifact@v5.0.0`, `actions/deploy-pages@v5.0.0`, `actions/upload-artifact@v7.0.1`

## sister_graduation

Promoted to a sister 2026-05-21 ahead of original M6 schedule (AJ requested visibility). M6 DoD complete 2026-05-22 via [#5](https://github.com/ldqis/ldqis/pull/5):

- [x] Entry added to `~/.claude/techne.toml`
- [x] `Makefile` exists with sister-shape targets (full Phase 1-5 audit grid landed with M4)
- [x] `.claude/skill-context.md` filled in with per-skill facts (this file)
- [x] CI workflow at `.github/workflows/ci.yml` runs lint / type / unit / e2e / lighthouse on every PR
- [x] First successful `/techne:audit` run against this repo — surfaced the `scripts/dev-runner.sh` gap as the last missing primitive; closed in #5
- [x] First successful `/techne:sisters` audit run that includes ldqis with no missing-primitive findings — surfaced the merge-setting drift (squash-only / delete-on-merge); fixed via `gh api PATCH repos/ajbarea/ldqis` in #5
- [x] `~/ajsoftworks/MEMORY.md` index entry updated to note ldqis is now a sister — `project_ajsoftworks_keep_list.md` confirms ldqis on the active-sisters list as of 2026-05-21
