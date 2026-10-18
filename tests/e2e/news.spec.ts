// News posts: the shown date is the frontmatter's calendar day in every build zone, and a
// cover photo renders with its alt text, caption and share image.
import { expect, test } from "@playwright/test";

test("a post shows its own publish date, not the day before", async ({ page }) => {
  await page.goto("news/2026-05-welcome/");
  const time = page.locator("article time").first();
  await expect(time).toHaveAttribute("datetime", /^2026-05-22/);
  await expect(time).toHaveText(/May 22, 2026/i);
});

test("a cover photo renders with alt text, caption and share image", async ({ page }) => {
  await page.goto("news/2026-10-rochester-security-summit/");
  const img = page.locator("article figure img");
  await expect(img).toHaveAttribute("alt", /Rochester Security Summit sign/);
  await expect(page.locator("article figcaption")).toContainText("Photo: Dr. Leon Reznik");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    /\/_astro\/.+\.jpg$/,
  );
});
