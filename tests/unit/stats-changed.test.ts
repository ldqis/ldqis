// Runs scripts/stats-changed.mjs the way refresh-stats.yml does (plain node, no bundler), so an
// import Node cannot resolve fails here instead of in the hourly workflow.
import { execFile } from "node:child_process";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import snapshot from "../../src/data/intefl-experiments.json";

const run = promisify(execFile);
const payloads: Record<string, unknown> = {
  "/same": snapshot,
  "/newer": { ...snapshot, total_experiments: snapshot.total_experiments + 1 },
  "/invalid": { total_experiments: "lots" },
};
let server: Server;
let base: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    const body = payloads[req.url ?? ""];
    res.writeHead(body ? 200 : 404, { "Content-Type": "application/json" });
    res.end(body ? JSON.stringify(body) : "");
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((done) => server.close(() => done())));

const check = async (live: string, deployed: string) =>
  (
    await run(process.execPath, ["scripts/stats-changed.mjs"], {
      env: { ...process.env, LIVE: base + live, DEPLOYED: base + deployed, GITHUB_OUTPUT: "" },
    })
  ).stdout;

describe("scripts/stats-changed.mjs", () => {
  it("reports no change when the live stats match the deployed copy", async () =>
    expect(await check("/same", "/same")).toContain("changed=false"));

  it("reports a change when they differ", async () =>
    expect(await check("/newer", "/same")).toContain("changed=true"));

  it("reports a change when the deployed copy is missing", async () =>
    expect(await check("/same", "/missing")).toContain("changed=true"));

  it("skips a live payload the site would reject", async () =>
    expect(await check("/invalid", "/same")).toContain("changed=false"));
});
