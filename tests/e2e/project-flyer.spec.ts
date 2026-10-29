// The InteFL page's Information Flyer button and the PDF behind it.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { ROOT } from "./routes";

test.describe("InteFL information flyer", () => {
  test("the button opens the flyer in a new tab and names its type and size", async ({ page }) => {
    await page.goto("projects/intefl/");
    const link = page.getByRole("link", { name: /^Information Flyer/ });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/projects/intefl-flyer.pdf");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAccessibleName(/PDF, [\d.]+ [kM]B, opens in a new tab/);
  });

  test("the stable URL serves the PDF the entry names, byte for byte", async ({ request }) => {
    const res = await request.get("projects/intefl-flyer.pdf");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/pdf");
    const source = readFileSync(join(ROOT, "src/content/projects/files/intefl-flyer.pdf"));
    expect(Buffer.compare(await res.body(), source)).toBe(0);
  });

  test("projects without a flyer show no button", async ({ page }) => {
    await page.goto("projects/sphragis/");
    await expect(page.getByRole("link", { name: /^Information Flyer/ })).toHaveCount(0);
  });
});
