// Layout stays put while the web fonts load. The body and heading faces are preloaded, so
// they are in place for first paint; every other face (other weights, italics) may arrive
// after it, and metric-matched fallbacks should keep text from moving when it does. This
// delays the fonts a page does not preload and measures cumulative layout shift on one page of
// each kind (one built route per top-level path).
import { expect, test } from "@playwright/test";
import { ROUTES } from "./routes";

const firstOfEachKind = [
  ...new Map(
    ROUTES.filter((r) => !r.startsWith("admin/") && !r.endsWith(".html")).map((r) => [
      r.split("/")[0],
      r,
    ]),
  ).values(),
];
// research(2026-10): web.dev rates CLS up to 0.1 as good; this holds the site well inside it.
const BUDGET = 0.02;

for (const path of firstOfEachKind) {
  test(`${path || "home"} does not shift while fonts load`, async ({ page, request }) => {
    const html = await (await request.get(path)).text();
    const preloaded = new Set(
      [...html.matchAll(/<link rel="preload" href="([^"]+\.woff2)"/g)].map((m) => m[1]),
    );
    expect(preloaded.size, "the body and heading fonts are preloaded").toBeGreaterThan(0);
    await page.route("**/*.woff2", async (route) => {
      if (!preloaded.has(new URL(route.request().url()).pathname))
        await new Promise((r) => setTimeout(r, 1200));
      await route.continue();
    });
    await page.addInitScript(() => {
      (window as unknown as { __cls: number }).__cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as unknown as {
          value: number;
          hadRecentInput: boolean;
        }[])
          if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto(path, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    expect(cls, `cumulative layout shift on ${path || "home"}`).toBeLessThan(BUDGET);
  });
}
