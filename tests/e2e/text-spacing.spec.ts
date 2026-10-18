// A link set on its own line after a word, as Prettier formats it, loses the space between them
// once Astro compresses the HTML ("Reznik'sGoogle Scholar profile"). Write `{" "}` before it.
// This scans every built page for a word glued to the start of a link.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { DIST, ROUTES } from "./routes";

const GLUED = /([A-Za-z0-9’'"”])<a[\s>][^>]*>([^<]{0,40})/g;
// The reverse: whitespace left between a link and the punctuation that ends its sentence.
const DETACHED = /([^<>]{0,40})<\/a>\s+([.,;:!?)])/g;

test("no word runs straight into a link", () => {
  const glued = ROUTES.filter((r) => !r.startsWith("admin/")).flatMap((route) => {
    const file = route.endsWith(".html") ? route : join(route, "index.html");
    const html = readFileSync(join(DIST, file), "utf8");
    return [...html.matchAll(GLUED)].map((m) => `${route || "home"}: …${m[1]}${m[2]}`);
  });
  expect(glued, `add {" "} before these links:\n${glued.join("\n")}`).toEqual([]);
});

test("no space between a link and the punctuation after it", () => {
  const detached = ROUTES.filter((r) => !r.startsWith("admin/")).flatMap((route) => {
    const file = route.endsWith(".html") ? route : join(route, "index.html");
    const html = readFileSync(join(DIST, file), "utf8");
    return [...html.matchAll(DETACHED)].map((m) => `${route || "home"}: …${m[1]} ${m[2]}`);
  });
  expect(detached, `put the punctuation right after </a>:\n${detached.join("\n")}`).toEqual([]);
});
