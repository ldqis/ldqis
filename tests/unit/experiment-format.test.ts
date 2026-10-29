import { describe, expect, it } from "vitest";
import {
  LIVE_WINDOW_MS,
  formatLabTime,
  readLiveStats,
  timeAgo,
} from "../../src/lib/experiment-format";

const at = (iso: string) => new Date(iso).getTime();

describe("timeAgo", () => {
  const t = "2026-10-28T23:00:00Z";
  it.each([
    [t, "just now"],
    ["2026-10-28T23:00:59Z", "just now"],
    ["2026-10-28T23:01:00Z", "1 minute ago"],
    ["2026-10-28T23:59:59Z", "59 minutes ago"],
    ["2026-10-29T00:00:00Z", "1 hour ago"],
    ["2026-10-30T22:59:00Z", "47 hours ago"],
    ["2026-10-30T23:00:00Z", "2 days ago"],
    ["2026-10-28T22:00:00Z", "just now"], // a clock behind the source
  ])("%s → %s", (now, text) => expect(timeAgo(t, at(now))).toBe(text));

  it("reads a timestamp without an offset as UTC", () =>
    expect(timeAgo("2026-10-28T23:00:00", at("2026-10-28T23:05:00Z"))).toBe("5 minutes ago"));
});

describe("formatLabTime", () => {
  it("shows the lab's local time and zone", () => {
    expect(formatLabTime("2026-10-24T01:07:55Z")).toBe("Oct 23, 2026, 9:07 PM EDT");
    expect(formatLabTime("2026-12-01T17:00:00Z")).toBe("Dec 1, 2026, 12:00 PM EST");
  });
});

describe("readLiveStats", () => {
  const payload = {
    total_experiments: 2496,
    successful_experiments: 2466,
    total_hours: 166.6,
    latest_experiment: {
      id: 2496,
      created_at: "2026-10-24T01:07:55Z",
      dataset: "femnist_iid",
      strategy: "pid_made",
    },
    experiments_per_week: [],
    generated_at: "2026-10-28T23:09:03Z",
  };

  it("keeps the fields the page shows", () =>
    expect(readLiveStats(payload)).toEqual({
      total: 2496,
      successful: 2466,
      hours: 166.6,
      generatedAt: "2026-10-28T23:09:03Z",
      latest: { createdAt: "2026-10-24T01:07:55Z", dataset: "femnist_iid", strategy: "pid_made" },
    }));

  it("accepts a database with no runs yet", () =>
    expect(readLiveStats({ ...payload, latest_experiment: null })?.latest).toBeNull());

  it.each([
    ["not an object", "oops"],
    ["null", null],
    ["a missing count", { ...payload, total_experiments: undefined }],
    ["a negative count", { ...payload, successful_experiments: -1 }],
    ["a string count", { ...payload, total_hours: "166" }],
    ["a bad timestamp", { ...payload, generated_at: "yesterday" }],
    ["a malformed latest run", { ...payload, latest_experiment: { dataset: 3 } }],
  ])("rejects %s", (_, json) => expect(readLiveStats(json)).toBeNull());

  it("calls a payload live for fifteen minutes", () => expect(LIVE_WINDOW_MS).toBe(900_000));
});
