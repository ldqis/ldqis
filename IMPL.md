# LDQIS site — implementation notes

Where things stand right now, known issues, and the immediate next steps. The
longer-term plan lives in [ROADMAP.md](./ROADMAP.md); git history has the full record.

## In progress

**PR #195, CMS People form** (branch `feat/cms-ux`, worktree `.claude/worktrees/cms-ux`). The
independent review's findings are fixed: the build no longer rejects a pair of years the form
can save (an end year alone, or a reversed pair), `unique` is gone until the planned Sveltia upgrade
(the option ships from 0.237.0), and the intake script reads single-quoted card values and keeps "2016-2019 (now
at Google)" closed. After merge and deploy, open the live `/admin`, sign in, and confirm the
People form loads with no config errors and the year dropdowns run 2003 to this year plus
Present.

Local CMS testing without a GitHub sign-in: copy `src/content` to `public/__seed/` (never
commit it), write it into the browser's private file storage with an empty `.git` folder,
override `window.showDirectoryPicker` to return `navigator.storage.getDirectory()`, then choose
"Work with Local Repository" on `/admin/index.html` under `astro dev`.

**Next after #195:** publish CMS edits straight to `main`. Sveltia v0.248.0 ships the fix
(sveltia/sveltia-cms#1094); see the ROADMAP backlog entry.

## Known issues

- `npm audit --omit=dev` is clean. The dev-only findings are the `@lhci/cli` chain (0.15.1 is
  its latest release and no longer updated) and `@tailwindcss/typography` through
  `postcss-selector-parser`; `npm audit fix --force` would downgrade `@lhci/cli` and
  `@tailwindcss/typography`, so leave them. `@puppeteer/browsers`, `tmp`, and `uuid` are pinned
  forward in `package.json` `overrides`. `sprintf-js` has no patched release; it came in only
  through `js-yaml@3`'s command-line tool (`argparse@1`), which `@lhci/utils` never runs, so an
  override gives that `js-yaml` `argparse@2`, which has no dependencies.
- `ldqis-cms-auth` has no Dependabot and pins an old wrangler; its `pnpm audit` findings are
  all in build and lint tooling, not the deployed Worker.

## Next up

1. **RSS 2026 talk video.** When the Rochester Security Summit uploads the recording, add a
   "Watch the talk" link to `src/content/news/2026-10-rochester-security-summit.md`.
2. **Codecov for the org,** then update the README badge token.
3. **Install GitGuardian on the org.**
4. **Retire the old server.** The previous site still answers at `129.21.34.220`
   (`vhost11.cs.rit.edu`); RIT CS IT has to take it down.
5. **Backfill team cross-links.** Projects and publications link to their lab-member
   authors and contributors through the `people` collection; add the remaining lists as
   authorship is confirmed.
