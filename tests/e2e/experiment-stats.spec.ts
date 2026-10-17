// The InteFL experiment section: the summary renders from the build-time data, and the
// weekly chart reads out by keyboard and pointer.
import { expect, test } from "@playwright/test";

test.describe("InteFL experiment stats", () => {
  test("renders the summary, chart and both breakdowns", async ({ page }) => {
    await page.goto("projects/intefl/");
    const section = page.locator("#experiments");
    await expect(section.getByRole("heading", { name: "Experiments" })).toBeVisible();
    await expect(section.locator(".lede")).toHaveText(/^[\d,]+ experiments/);
    await expect(section.getByRole("heading", { name: "Attacks tested" })).toBeVisible();
    await expect(section.getByRole("heading", { name: "Datasets" })).toBeVisible();
    await expect(section.locator(".bars li").first()).toBeAttached();
  });

  test("the chart steps through weeks by keyboard", async ({ page }) => {
    await page.goto("projects/intefl/");
    const chart = page.getByRole("group", { name: /Experiments per week/ });
    const readout = page.locator("#experiments-readout");
    await expect(readout).toHaveText(/^Busiest week: /);

    await chart.focus();
    await expect(readout).toHaveText(/^Week of /);
    await page.keyboard.press("Home");
    const first = await page.locator(".bars li").first().getAttribute("data-label");
    await expect(readout).toHaveText(new RegExp(`^Week of ${first}:`));
    await page.keyboard.press("End");
    const last = await page.locator(".bars li").last().getAttribute("data-label");
    await expect(readout).toHaveText(new RegExp(`^Week of ${last}:`));

    await page.keyboard.press("Escape");
    await expect(readout).toHaveText(/^Busiest week: /);
  });

  test("the chart reads the week under the pointer", async ({ page }) => {
    await page.goto("projects/intefl/");
    const bars = page.locator(".bars");
    await bars.scrollIntoViewIfNeeded();
    const box = (await bars.boundingBox())!;
    await page.mouse.move(box.x + 2, box.y + box.height / 2);
    const first = await page.locator(".bars li").first().getAttribute("data-label");
    await expect(page.locator("#experiments-readout")).toHaveText(new RegExp(`^Week of ${first}:`));
    await page.mouse.move(box.x + box.width / 2, box.y - 200);
    await expect(page.locator("#experiments-readout")).toHaveText(/^Busiest week: /);
  });

  test("serves the rendered data as JSON", async ({ request }) => {
    const res = await request.get("data/intefl-experiments.json");
    expect(res.ok()).toBe(true);
    expect(await res.json()).toHaveProperty("total_experiments");
  });

  test("the homepage InteFL card links to the section", async ({ page }) => {
    await page.goto("");
    const link = page.getByRole("link", { name: /experiments run so far with InteFL/ });
    await expect(link).toHaveAttribute("href", /projects\/intefl\/#experiments$/);
  });
});
