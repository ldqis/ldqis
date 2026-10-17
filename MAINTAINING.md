# Maintaining the LDQIS site

What the site depends on, how the domain and DNS are set up, and how to hand the site to the
next maintainer.

## What the site depends on

| Piece                           | Where it lives                                                                                  | Who can change it            |
| ------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------- |
| Source, CI, GitHub Pages        | `ldqis/ldqis`                                                                                   | Repo admins                  |
| CMS sign-in (Cloudflare Worker) | `ldqis-cms-auth`, source in `ldqis/ldqis-cms-auth`; Cloudflare deploys every push to its `main` | Cloudflare account members   |
| GitHub OAuth App                | Client ID in the Worker's `wrangler.toml`; client secret stored as a Worker secret              | The app's owner              |
| CMS publisher GitHub App        | Repo variable `CMS_APP_ID`, repo secret `CMS_APP_PRIVATE_KEY`                                   | The app's owner              |
| `dataqualitylabs.com`           | GoDaddy (registration and DNS); renews every February 12                                        | Dr. Reznik (GoDaddy account) |
| InteFL experiment stats         | `https://gcis-lrvcs-rl.gccis.rit.edu/public/stats`, served by InteFL's experiment database      | Dmitrii Korobeinikov         |

## Domain and DNS

The site is served at <https://dataqualitylabs.com/>.

- **Registration and DNS:** GoDaddy, in Dr. Reznik's account. The domain renews every
  February 12; turn on auto-renew.
- **Verification:** the domain is verified for the `ldqis` org with a TXT record,
  `_github-pages-challenge-ldqis`.
- **Apex records:** four `A` records for `@` (`185.199.108.153`, `185.199.109.153`,
  `185.199.110.153`, `185.199.111.153`) and four `AAAA` records
  (`2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`).
- **`www`:** a `CNAME` for `ldqis.github.io`.
- **Custom domain:** set in repo Settings > Pages. A `CNAME` file does nothing for an Actions
  deploy.
- **HTTPS:** Enforce HTTPS is on.

### Still to do

- [ ] Turn on Codecov for the org and update the badge token in `README.md`.
- [ ] Install GitGuardian on the org.
- [ ] Ask RIT CS IT to retire the old site on `vhost11.cs.rit.edu` (`129.21.34.220`), which
      still answers by IP.

## Handing the site to the next maintainer

- **Keep at least two org owners.** Before a maintainer graduates, make their successor an
  owner (org → People → role Owner).
- **Add new lab members** from org → People → Invite, then add them to `lab-members`.
- **Share the Cloudflare account.** Cloudflare → Manage Account → Members → invite the
  successor as Super Administrator; the CMS sign-in runs there.
- **Watch the renewal.** `dataqualitylabs.com` expires each February 12 unless renewed.

## Search

Pagefind indexes the built HTML: `npm run build` runs `pagefind --site dist` after
`astro build`, writing the index to `dist/pagefind/`. `astro dev` serves that folder, so run
`npm run build` once and `npm run dev` shows search over that snapshot (it goes stale as pages
change; rebuild to refresh). With no build, the header search button hides itself.
Pages are indexed through `data-pagefind-body` on `<body>` in `BaseLayout`; pass
`indexed={false}` to keep a page out, and put `data-pagefind-ignore` on listings or controls
that shouldn't match queries. Result titles come from each page's `og:title`.

## Experiment stats

The InteFL project page and its homepage card show the lab's experiment counts. The build
fetches them (the `experimentStats` collection in `src/content.config.ts`) from InteFL's
public endpoint, so they are static HTML, and serves the copy it rendered at
`/data/intefl-experiments.json`. If the endpoint is down, the build uses the newer of that
deployed copy and the committed snapshot `src/data/intefl-experiments.json`, so an outage
never breaks a deploy.

`refresh-stats.yml` runs hourly. It compares the live stats with the deployed copy and, when
they differ, starts `deploy.yml`. While the endpoint is down it leaves a warning and does
nothing. GitHub turns off scheduled workflows in a public repository after 60 days without
activity; if the counts stop moving, re-enable it under Actions.

Labels for datasets, attacks and strategies live in `src/lib/experiment-stats.ts`. A keyword
it does not know shows as the raw keyword, so a new one never breaks the build; add its label
there when it appears.

## Updating the CMS bundle

`@sveltia/cms` is an exact-pinned npm dependency, so Dependabot bumps it like any other
package. `astro.config.mjs` copies its `dist/` into `dist/admin/cms/` after each build and
serves it from `node_modules` in dev, and `/admin` loads it from the same origin, chunks
included. The schema URL in the served `config.yml` takes its version from `package.json`.

After a bump, open `/admin/` on a build and preview, and check the sign-in screen renders and
the viewport meta has no `maximum-scale`. `public/admin/index.html` rewrites the tag the bundle
injects so pinch zoom stays on, and sets 16px textboxes on touch devices so iOS does not zoom
on focus. For a quick check, `astro dev` serves the page at `/admin/index.html`; its directory index, `/admin/`, 404s there.

`/admin` still makes these third-party requests, with no integrity checks:

- On every load: `unpkg.com` (a version check and the CMS `package.json`), the GitHub status
  API, and two jsDelivr fonts (Source Sans 3 and Material Symbols).
- On demand: code-block highlighting in the rich-text editor (shiki), the map field (leaflet),
  and HEIC or PDF previews (`@discourse/heic`, `pdfjs-dist`) from `unpkg.com`. The site config
  has no map field.
