#!/usr/bin/env node
// Whether InteFL's live experiment stats differ from the copy the site last deployed, for
// .github/workflows/refresh-stats.yml. Validates the live payload with the site's own
// schema, so the workflow only redeploys for stats the build will actually render.
// Prints changed=true|false, appending it to $GITHUB_OUTPUT when set.
//   Run: node scripts/stats-changed.mjs
import { appendFileSync } from "node:fs";
import process from "node:process";

import {
  STATS_ENDPOINT,
  STATS_MIRROR,
  experimentStatsSchema,
  fetchJson,
  statsDiffer,
} from "../src/lib/experiment-stats.ts";

const get = (url) => fetchJson(url, 30_000)();

const report = (changed) => {
  console.log(`changed=${changed}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
};

let live;
try {
  live = experimentStatsSchema.parse(await get(process.env.LIVE ?? STATS_ENDPOINT));
} catch (err) {
  console.log(
    `::warning::InteFL stats are unreachable or invalid, so nothing to do (${err.message.replace(/\s+/g, " ")})`,
  );
  report(false);
  process.exit(0);
}
// A missing or unreadable deployed copy counts as changed, so the next deploy restores it.
const deployed = await get(process.env.DEPLOYED ?? STATS_MIRROR).catch(() => null);
report(statsDiffer(live, deployed));
