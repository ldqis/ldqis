// The site footer on every page, and site search in the header.
import { expect, test, type Page } from "@playwright/test";
import { ROUTES } from "./routes";

// The lab's own links, absolute under the base so they work from every page.
const LAB = {
  "Funded by": /^\/#funding$/,
  Alumni: /^\/#alumni$/,
  Teaching: /^\/#teaching$/,
  "Join us": /^mailto:lrvcs@rit\.edu/,
  "Get in touch": /^mailto:lrvcs@rit\.edu$/,
  "Dr. Reznik on Google Scholar": /scholar\.google\.com/,
  "Site source on GitHub": /^https:\/\/github\.com\/ldqis\/ldqis$/,
  "RSS feed": /^\/news\/rss\.xml$/,
};
const NAV = ["Research", "Projects", "Publications", "People", "News"];

// /admin is the CMS app, not a site page.
const PAGES = ROUTES.filter((p) => !p.startsWith("admin/"));

test.describe("footer", () => {
  for (const theme of ["light", "dark"] as const) {
    test.describe(theme, () => {
      test.use({ colorScheme: theme });
      for (const path of PAGES) {
        test(`${path || "home"}`, async ({ page }) => {
          await page.addInitScript((t) => localStorage.setItem("ldqis-theme", t), theme);
          await page.goto(path);
          const footer = page.locator("footer#site-footer");
          await expect(footer).toHaveCount(1);
          await footer.scrollIntoViewIfNeeded();
          // The footer follows the theme under a hairline rule, not a fixed dark block.
          await expect(footer).toHaveCSS("border-top-style", "solid");
          await expect(footer).not.toHaveCSS("background-color", "rgb(0, 0, 0)");
          await expect(footer.getByRole("img")).toHaveCount(0);
          await expect(
            footer.getByRole("link", { name: "lrvcs@rit.edu", exact: true }),
          ).toBeVisible();
          await expect(footer.getByText("1 Lomb Memorial Drive")).toBeVisible();
          await expect(footer.getByText("Rochester Institute of Technology")).toBeVisible();
          await expect(footer.locator('a[href^="https://www.rit.edu/"]')).toHaveCount(1);
          // The header carries the primary sections; the footer does not repeat them.
          for (const name of NAV)
            await expect(footer.getByRole("link", { name, exact: true })).toHaveCount(0);
          for (const [name, href] of Object.entries(LAB))
            await expect(footer.getByRole("link", { name, exact: true })).toHaveAttribute(
              "href",
              href,
            );
          await expect(page.getByRole("navigation", { name: "Footer" })).toHaveCount(1);
          await expect(page.getByRole("contentinfo")).toHaveCount(1);
          await expect(page.getByRole("region", { name: "Lab", exact: true })).toHaveCount(0);
        });
      }
    });
  }
});

// One name, one destination: links that read the same must go to the same place.
test.describe("link names", () => {
  for (const path of PAGES) {
    test(`${path || "home"}: no two links share a name but not a target`, async ({ page }) => {
      await page.goto(path);
      const clash = await page.evaluate(() => {
        const seen = new Map<string, Set<string>>();
        for (const a of document.querySelectorAll<HTMLAnchorElement>("a[href]")) {
          const name = (
            a.getAttribute("aria-label") ??
            (a.textContent || a.querySelector("img")?.alt || "")
          )
            .replace(/\s+/g, " ")
            .trim();
          if (!name) continue;
          seen.set(name, (seen.get(name) ?? new Set()).add(a.href));
        }
        return [...seen].filter(([, h]) => h.size > 1).map(([n, h]) => [n, [...h]]);
      });
      expect(clash).toEqual([]);
    });
  }
});

const dialogOf = (page: Page) => page.getByRole("dialog");
// The results summary reads "N results for ..." or "No results for ...".
async function search(page: Page, query: string) {
  const dialog = dialogOf(page);
  await dialog.locator("input").first().fill(query);
  await expect(dialog.getByText(/\bresults? for\b/i).first()).toBeVisible();
  return dialog;
}

test.describe("site search", () => {
  test("the header button opens a labelled dialog, finds a page, and returns focus on Escape", async ({
    page,
  }) => {
    await page.goto("news/");
    const trigger = page.getByRole("button", { name: "Search" });
    await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    await trigger.click();
    await expect(dialogOf(page)).toBeVisible();
    await expect(dialogOf(page).locator("input").first()).toBeFocused();
    const dialog = await search(page, "Reznik");
    const hit = dialog.locator('a[href*="people/leon-reznik"]').first();
    await expect(hit).toHaveAttribute("href", /\/people\/leon-reznik\/?/);
    await expect(hit).toContainText("Reznik");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  test("a result opens its page under the base path", async ({ page }) => {
    await page.goto("");
    await page.getByRole("button", { name: "Search" }).click();
    const dialog = await search(page, "Reznik");
    await dialog.locator('a[href*="people/leon-reznik"]').first().click();
    await expect(page).toHaveURL(/\/people\/leon-reznik\/?$/);
  });

  // The modifier is what the page advertises and binds: Cmd on macOS, Ctrl elsewhere.
  async function shortcut(page: Page) {
    const keys = await page.locator("#search-btn").getAttribute("aria-keyshortcuts");
    expect(keys).toMatch(/^(Meta|Control)\+K$/);
    return `${keys!.split("+")[0]}+k`;
  }

  test("the shortcut opens it from the page", async ({ page }) => {
    await page.goto("");
    const key = await shortcut(page);
    await page.keyboard.press(key);
    await expect(dialogOf(page)).toBeVisible();
    await expect(dialogOf(page).locator("input").first()).toBeFocused();
  });

  test("the shortcut is left alone inside a text field", async ({ page }) => {
    await page.goto("");
    const key = await shortcut(page);
    await page.evaluate(() => {
      const input = document.createElement("input");
      input.id = "scratch";
      input.setAttribute("aria-label", "scratch");
      document.querySelector("main")!.append(input);
      (window as unknown as { prevented: boolean[] }).prevented = [];
      document.addEventListener("keydown", (e) =>
        (window as unknown as { prevented: boolean[] }).prevented.push(e.defaultPrevented),
      );
    });
    // Load the bundle first, so a wrongly opened dialog would be visible at once.
    await page.getByRole("button", { name: "Search" }).focus();
    await page.waitForFunction(() => !!customElements.get("pagefind-modal"));
    await page.locator("#scratch").focus();
    await page.keyboard.press(key);
    const prevented = await page.evaluate(
      () => (window as unknown as { prevented: boolean[] }).prevented,
    );
    expect(prevented.at(-1)).toBe(false);
    await expect(dialogOf(page)).toBeHidden();
  });

  test("the Pagefind bundle loads on first use, not on page load", async ({ page }) => {
    const bundle: string[] = [];
    page.on("request", (r) => r.url().includes("/pagefind/") && bundle.push(r.url()));
    await page.goto("");
    await page.waitForLoadState("networkidle");
    expect(bundle.filter((u) => u.endsWith(".js"))).toEqual([]);
    await page.getByRole("button", { name: "Search" }).click();
    await expect(dialogOf(page)).toBeVisible();
    expect(bundle.some((u) => u.endsWith("pagefind-component-ui.js"))).toBe(true);
  });

  test("a failed bundle load says so and the next try retries", async ({ page }) => {
    await page.route("**/pagefind/pagefind-component-ui.js", (r) => r.abort());
    await page.goto("");
    const trigger = page.getByRole("button", { name: "Search" });
    await trigger.click();
    await expect(page.locator("#search-status")).toHaveText(/unavailable/);
    await expect(trigger).toBeVisible();
    await page.unroute("**/pagefind/pagefind-component-ui.js");
    await trigger.click();
    await expect(dialogOf(page)).toBeVisible();
    await expect(page.locator("#search-status")).toHaveText("");
  });

  test("a slow bundle shows progress and still opens on one click", async ({ page }) => {
    test.setTimeout(60_000);
    await page.route("**/pagefind/pagefind-component-ui.js", async (r) => {
      await new Promise((done) => setTimeout(done, 9000));
      await r.continue();
    });
    await page.goto("");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.locator("#search-status")).toHaveText("Loading search…");
    await expect(dialogOf(page)).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("#search-status")).toHaveText("");
  });

  test("a failed stylesheet is retried even though the script loaded", async ({ page }) => {
    await page.route("**/pagefind/pagefind-component-ui.css", (r) => r.abort());
    await page.goto("");
    const trigger = page.getByRole("button", { name: "Search" });
    await trigger.click();
    await expect(page.locator("#search-status")).toHaveText(/unavailable/);
    await page.unroute("**/pagefind/pagefind-component-ui.css");
    await trigger.click();
    await expect(dialogOf(page)).toBeVisible();
    const radius = await dialogOf(page).evaluate((d) => getComputedStyle(d).borderRadius);
    expect(radius).toBe("12px");
  });

  test("past the deadline the next click starts a fresh attempt", async ({ page }) => {
    test.setTimeout(60_000);
    let calls = 0;
    await page.route("**/pagefind/pagefind-component-ui.js*", async (r) => {
      if (calls++ === 0) await new Promise((done) => setTimeout(done, 25_000));
      await r.continue();
    });
    await page.goto("");
    const trigger = page.getByRole("button", { name: "Search" });
    await trigger.click();
    await expect(page.locator("#search-status")).toHaveText(/taking longer/, { timeout: 15_000 });
    await trigger.click();
    await expect(dialogOf(page)).toBeVisible({ timeout: 5000 });
    expect(calls).toBe(2);
  });

  test("a load that finishes after the user moved on does not open or steal focus", async ({
    page,
  }) => {
    await page.route("**/pagefind/pagefind-component-ui.js", async (r) => {
      await new Promise((done) => setTimeout(done, 2000));
      await r.continue();
    });
    await page.goto("");
    const trigger = page.getByRole("button", { name: "Search" });
    await trigger.click();
    await expect(page.locator("#search-status")).toHaveText("Loading search…");
    await page.locator("h1").first().click();
    await expect(page.locator("#search-status")).toHaveText("", { timeout: 10_000 });
    await expect(dialogOf(page)).toBeHidden();
    await trigger.click();
    await expect(dialogOf(page)).toBeVisible();
  });

  test("the hidden title is not indexed as page content", async ({ page }) => {
    await page.goto("");
    const { title, content } = await page.evaluate(async () => {
      const pf = await import(`${document.baseURI}pagefind/pagefind.js`);
      const hit = await pf.search("Reznik");
      for (const r of hit.results) {
        const d = await r.data();
        if (d.url.includes("people/leon-reznik"))
          return { title: d.meta.title, content: d.content };
      }
      throw new Error("leon-reznik not indexed");
    });
    expect(title).toBe("Dr. Leon Reznik");
    expect(content.startsWith(title)).toBe(false);
  });

  test("results are titled by page and homepage listings do not match", async ({ page }) => {
    await page.goto("");
    await page.getByRole("button", { name: "Search" }).click();
    // This title is listed on the homepage and has its own page.
    const dialog = await search(page, "Optimizing Federated Learning with Metacognition");
    const hit = dialog.locator('a[href*="publications/intefl-mis-2026"]').first();
    await expect(hit).toContainText(/InteFL/);
    await expect(dialog.getByText("· LDQIS")).toHaveCount(0);
    await expect(dialog.locator('a[href="/"]')).toHaveCount(0);
  });

  // 404 and /admin must stay out of the index; the queries are text only they contain.
  for (const [name, query, pattern] of [
    ["404", "may have moved", /404/],
    ["admin", "Content editor", /admin/],
  ] as const) {
    test(`${name} is not indexed`, async ({ page }) => {
      await page.goto("");
      await page.getByRole("button", { name: "Search" }).click();
      const dialog = await search(page, query);
      const hrefs = await dialog
        .locator("a")
        .evaluateAll((a) => a.map((x) => x.getAttribute("href")));
      expect(hrefs.filter((h) => pattern.test(h ?? ""))).toEqual([]);
    });
  }

  test("every built route except 404 and admin is in the index", async ({ page }) => {
    await page.goto("");
    const urls = await page.evaluate(async () => {
      const pf = await import(`${document.baseURI}pagefind/pagefind.js`);
      const all = await pf.search(null);
      const data = await Promise.all(
        all.results.map((r: { data(): Promise<{ url: string }> }) => r.data()),
      );
      return data.map((d: { url: string }) => d.url);
    });
    const indexed = urls
      .map((u: string) => u.replace(/^\//, ""))
      .map((u: string) => u.replace(/\.html$/, ""))
      .sort();
    const expected = ROUTES.filter((p) => p !== "404.html" && !p.startsWith("admin/")).map((p) =>
      p.replace(/\.html$/, ""),
    );
    expect(indexed).toEqual([...expected].sort());
  });

  test("the header button matches the round transparent theme toggle", async ({ page }) => {
    for (const theme of ["light", "dark"] as const) {
      await page.addInitScript((t) => localStorage.setItem("ldqis-theme", t), theme);
      await page.goto("");
      const style = (id: string) =>
        page.locator(id).evaluate((el) => {
          const c = getComputedStyle(el);
          return {
            w: c.width,
            h: c.height,
            radius: c.borderRadius,
            bg: c.backgroundColor,
            border: c.borderTopWidth,
            color: c.color,
          };
        });
      const search = await style("#search-btn");
      expect(search).toEqual(await style("#theme-toggle"));
      expect(search).toMatchObject({ w: "36px", h: "36px", bg: "rgba(0, 0, 0, 0)" });
    }
  });

  // WCAG 1.4.3 on what Pagefind paints: the match highlight in excerpts and the title of the
  // keyboard-selected card, each against its real (composited) background.
  for (const theme of ["light", "dark"] as const) {
    test(`excerpt marks and the selected result are AA (${theme})`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem("ldqis-theme", t), theme);
      await page.goto("");
      await page.getByRole("button", { name: "Search" }).click();
      const dialog = await search(page, "Reznik");
      await expect(dialog.locator("a.pf-result-link").first()).toBeVisible();
      await page.keyboard.press("ArrowDown");
      const selected = dialog.locator("[data-pf-selected]");
      await expect(selected).toHaveCount(1);
      const ratios = await page.evaluate(() => {
        const rgba = (css: string) => {
          const c = document
            .createElement("canvas")
            .getContext("2d", { willReadFrequently: true })!;
          c.clearRect(0, 0, 1, 1);
          c.fillStyle = css;
          c.fillRect(0, 0, 1, 1);
          const [r, g, b, a] = c.getImageData(0, 0, 1, 1).data;
          return { r, g, b, a: a / 255 };
        };
        const over = (top: ReturnType<typeof rgba>, bottom: ReturnType<typeof rgba>) => ({
          r: top.r * top.a + bottom.r * (1 - top.a),
          g: top.g * top.a + bottom.g * (1 - top.a),
          b: top.b * top.a + bottom.b * (1 - top.a),
          a: 1,
        });
        const background = (el: Element) => {
          const layers: ReturnType<typeof rgba>[] = [];
          for (let n: Element | null = el; n; n = n.parentElement)
            layers.push(rgba(getComputedStyle(n).backgroundColor));
          return layers.reduceRight((acc, l) => over(l, acc), { r: 255, g: 255, b: 255, a: 1 });
        };
        const lum = ({ r, g, b }: { r: number; g: number; b: number }) => {
          const f = (v: number) => {
            const x = v / 255;
            return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
          };
          return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
        };
        const ratio = (el: Element) => {
          const bg = background(el);
          const fg = over(rgba(getComputedStyle(el).color), bg);
          const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a);
          return (hi + 0.05) / (lo + 0.05);
        };
        const marks = [...document.querySelectorAll("dialog mark")];
        const card = document
          .querySelector("dialog [data-pf-selected]")!
          .closest(".pf-result-card")!;
        const title = card.querySelector("a.pf-result-link")!;
        const excerpt = card.querySelector(".pf-result-excerpt")!;
        return {
          marks: marks.map(ratio),
          title: ratio(title),
          excerpt: ratio(excerpt),
          count: marks.length,
        };
      });
      expect(ratios.count).toBeGreaterThan(0);
      for (const r of ratios.marks) expect(r).toBeGreaterThanOrEqual(4.5);
      expect(ratios.title).toBeGreaterThanOrEqual(4.5);
      expect(ratios.excerpt).toBeGreaterThanOrEqual(4.5);
    });
  }

  test("the modal follows the site theme", async ({ page }) => {
    for (const theme of ["light", "dark"] as const) {
      await page.addInitScript((t) => localStorage.setItem("ldqis-theme", t), theme);
      await page.goto("");
      await page.getByRole("button", { name: "Search" }).click();
      await expect(dialogOf(page)).toBeVisible();
      const [pf, site] = await page.evaluate(() => {
        const dialog = document.querySelector("dialog")!;
        const pf = getComputedStyle(dialog).backgroundColor;
        const probe = document.createElement("i");
        probe.style.backgroundColor = "var(--color-bg)";
        document.body.append(probe);
        const site = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return [pf, site];
      });
      expect(pf).toBe(site);
    }
  });
});
