// The People page carries the whole roster; the homepage shows the current team and links
// to it.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { ROOT } from "./routes";

const DIR = join(ROOT, "src/content/people");
const cohort = (c: string) =>
  readdirSync(DIR)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .filter((f) =>
      new RegExp(`^cohort:\\s*["']?${c}["']?\\s*$`, "m").test(readFileSync(join(DIR, f), "utf8")),
    )
    .map((f) => f.slice(0, -3));
const current = cohort("current");
const alumni = cohort("past");

test("the People page links every current member and every alumnus", async ({ page }) => {
  expect(current.length).toBeGreaterThan(0);
  expect(alumni.length).toBeGreaterThan(0);
  await page.goto("people/");
  for (const [section, ids] of [
    ["current", current],
    ["alumni", alumni],
  ] as const) {
    const region = page.locator(`section[aria-labelledby="${section}"]`);
    for (const id of ids)
      await expect(region.locator(`a[href="/people/${id}/"]`).first()).toBeVisible();
  }
});

test("the homepage shows the current team and links to the full roster", async ({ page }) => {
  await page.goto("");
  const people = page.locator("#people");
  for (const id of current)
    await expect(people.locator(`a[href="/people/${id}/"]`).first()).toBeVisible();
  for (const id of alumni) await expect(people.locator(`a[href="/people/${id}/"]`)).toHaveCount(0);
  await expect(people.getByRole("link", { name: /^See all \d+ people$/ })).toHaveAttribute(
    "href",
    "/people/",
  );
});

test("the footer's Alumni link lands on the alumni heading", async ({ page }) => {
  await page.goto("people/#alumni");
  await expect(page.locator("#alumni")).toBeInViewport();
});
