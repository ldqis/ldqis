// The experiment section's live check: the status badge, headline counts and latest run follow
// the live source when it answers with newer data, and keep the build's values otherwise.
// The source is mocked and the browser clock fixed relative to the build, so every state is
// reproducible.
import { expect, test, type Page } from "@playwright/test";
import { STATS_ENDPOINT } from "../../src/lib/experiment-stats";

const MIN = 60_000;

async function built(page: Page) {
  const res = await page.request.get("data/intefl-experiments.json");
  return (await res.json()) as Record<string, unknown> & { generated_at: string };
}

async function open(
  page: Page,
  at: number,
  reply: ((base: Record<string, unknown>) => unknown) | "fail",
) {
  const base = await built(page);
  await page.clock.setFixedTime(at);
  await page.route(STATS_ENDPOINT, (route) =>
    reply === "fail"
      ? route.abort()
      : route.fulfill({ json: reply(base), headers: { "Access-Control-Allow-Origin": "*" } }),
  );
  await page.goto("projects/intefl/");
  return page.locator("[data-status]");
}

test.describe("InteFL live check", () => {
  test("a fresh answer shows Live and the newest counts and run", async ({ page }) => {
    const base = await built(page);
    const t = new Date(base.generated_at).getTime();
    const status = await open(page, t + 3 * MIN, (b) => ({
      ...b,
      total_experiments: 9001,
      successful_experiments: 8000,
      total_hours: 1234.4,
      latest_experiment: {
        id: 9001,
        created_at: "2026-10-28T18:30:00Z",
        dataset: "cifar100_a05",
        strategy: "krum",
      },
      generated_at: new Date(t + 2 * MIN).toISOString(),
    }));
    await expect(status).toHaveAttribute("data-state", "live");
    await expect(status).toHaveText(/^\s*Live · checked 1 minute ago\s*$/);
    const section = page.locator("#experiments");
    await expect(section.locator('[data-live="total"]')).toHaveText("9,001 experiments");
    await expect(section.locator('[data-live="successful"]')).toHaveText("8,000");
    await expect(section.locator('[data-live="hours"]')).toHaveText("1,234");
    const card = section.getByRole("region", { name: "Latest run" });
    await expect(card.locator('[data-live="dataset"]')).toHaveText("CIFAR-100 (α 0.5)");
    await expect(card.locator('[data-live="strategy"]')).toHaveText("Krum");
    await expect(card.locator('[data-live="started"]')).toHaveText("Oct 28, 2026, 2:30 PM EDT");
    await expect(card.locator('[data-live="started"]')).toHaveAttribute(
      "datetime",
      "2026-10-28T18:30:00Z",
    );
  });

  test("an old answer says when it was last checked, not Live", async ({ page }) => {
    const base = await built(page);
    const t = new Date(base.generated_at).getTime();
    const status = await open(page, t + 3 * 60 * MIN, (b) => b);
    await expect(status).toHaveAttribute("data-state", "stale");
    await expect(status).toHaveText(/^\s*Last checked 3 hours ago\s*$/);
  });

  test("an unreachable source leaves the build's time and counts", async ({ page }) => {
    const base = await built(page);
    const status = await open(page, new Date(base.generated_at).getTime() + MIN, "fail");
    const total = page.locator('[data-live="total"]');
    const before = await total.textContent();
    await page.waitForTimeout(500);
    await expect(status).toHaveAttribute("data-state", "built");
    await expect(status).toHaveText(/^\s*Updated [A-Z][a-z]{2} \d+, \d{4}, .* E[SD]T\s*$/);
    await expect(total).toHaveText(before!);
  });

  test("an answer older than the build or malformed is ignored", async ({ page }) => {
    const base = await built(page);
    const t = new Date(base.generated_at).getTime();
    for (const reply of [
      (b: Record<string, unknown>) => ({
        ...b,
        generated_at: new Date(t - 24 * 60 * MIN).toISOString(),
      }),
      (b: Record<string, unknown>) => ({ ...b, total_experiments: "lots" }),
    ]) {
      await page.unrouteAll();
      const status = await open(page, t + MIN, reply);
      await page.waitForTimeout(500);
      await expect(status).toHaveAttribute("data-state", "built");
    }
  });

  test("serves the latest run with readable labels", async ({ request }) => {
    const res = await request.get("data/intefl-latest.json");
    expect(res.headers()["content-type"]).toContain("application/json");
    const latest = await res.json();
    const all = await (await request.get("data/intefl-experiments.json")).json();
    expect(latest).toMatchObject({ ...all.latest_experiment, generated_at: all.generated_at });
    expect(latest.dataset_label).toEqual(expect.any(String));
    expect(latest.strategy_label).toEqual(expect.any(String));
  });
});
