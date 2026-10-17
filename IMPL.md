# LDQIS site — implementation notes

Where things stand right now, known issues, and the immediate next steps. The
longer-term plan lives in [ROADMAP.md](./ROADMAP.md); git history has the full record.

## In progress

Nothing in flight. The site moved to the `ldqis` org and to `dataqualitylabs.com` on
2026-10-16; setup reference in [MAINTAINING.md](./MAINTAINING.md).

## Known issues

- The homepage's Lighthouse CLS is about 0.10 to 0.11 (performance 0.97) on `main` as well; it
  clears the 0.95 gate but is the one score short of perfect.

- `npm audit --omit=dev` is clean. The dev-only findings are the `@lhci/cli` chain (0.15.1 is
  its latest release and no longer updated) and `@tailwindcss/typography` through
  `postcss-selector-parser`; `npm audit fix --force` would downgrade `@lhci/cli` and
  `@tailwindcss/typography`, so leave them. `@puppeteer/browsers`, `tmp`, and `uuid` are pinned
  forward in `package.json` `overrides`.
- `ldqis-cms-auth` has no Dependabot and pins an old wrangler; its `pnpm audit` findings are
  all in build and lint tooling, not the deployed Worker.

## Next up

1. **Codecov for the org,** then update the README badge token.
2. **Install GitGuardian on the org.**
3. **Retire the old server.** The previous site still answers at `129.21.34.220`
   (`vhost11.cs.rit.edu`); RIT CS IT has to take it down.
4. **Backfill team cross-links.** Projects and publications link to their lab-member
   authors and contributors through the `people` collection; add the remaining lists as
   authorship is confirmed.
