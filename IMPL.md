# LDQIS site — implementation notes

Where things stand right now, known issues, and the immediate next steps. The
longer-term plan lives in [ROADMAP.md](./ROADMAP.md); git history has the full record.

## In progress

**DQ Lab meeting asks of Fri 10-23** (wanted before Fri 10-30):

- #205 Information Flyer button on InteFL (PR #207, merged 10-28): PDF in `src/content/projects/files/`,
  served at `/projects/<id>-flyer.pdf`; CMS field "Information flyer".
- #204 live badge and latest-run card (PR #208): the browser checks InteFL's public endpoint;
  Live only while its data is under 15 minutes old. `data/<id>-latest.json` beside the full data.
- #206 publication import: research only. The recommendation (OpenAlex by ORCID iD, one review
  PR per run, a person approves every entry) is on the issue; build nothing until AJ answers its
  six questions.

The latest-run card shows date, dataset and strategy because that is all the public endpoint
serves for the latest run; attack and accuracy need Dima to add them to `latest_experiment`.

Local CMS testing without a GitHub sign-in: copy `src/content` to `public/__seed/` (never
commit it), write it into the browser's private file storage with an empty `.git` folder,
override `window.showDirectoryPicker` to return `navigator.storage.getDirectory()`, then choose
"Work with Local Repository" on `/admin/index.html` under `astro dev`.

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

1. **CMS follow-ups.** An org owner uninstalls the `ldqis-cms-publisher` app, and the first real
   CMS edit is watched end to end: Publish while Build runs, auto-merge on, squash merge as the
   editor, deploy runs.
2. **InteFL page layout shift.** At 390 wide it shifts 0.067 shortly after load (on main before
   #208 too); `layout-stability.spec.ts` measures only the first project page.
3. **RSS 2026 talk video.** When the Rochester Security Summit uploads the recording, add a
   "Watch the talk" link to `src/content/news/2026-10-rochester-security-summit.md`.
4. **Codecov for the org,** then update the README badge token.
5. **Install GitGuardian on the org.**
6. **Retire the old server.** The previous site still answers at `129.21.34.220`
   (`vhost11.cs.rit.edu`); RIT CS IT has to take it down.
7. **Backfill team cross-links.** Projects and publications link to their lab-member
   authors and contributors through the `people` collection; add the remaining lists as
   authorship is confirmed.
