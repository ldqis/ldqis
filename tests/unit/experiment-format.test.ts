import { describe, expect, it } from "vitest";
import {
  CLOCK_SKEW_MS,
  LIVE_WINDOW_MS,
  formatLabClock,
  formatLabTime,
  freshness,
  readLiveStats,
} from "../../src/lib/experiment-format";

const at = (iso: string) => new Date(iso).getTime();

describe("freshness", () => {
  const t = "2026-10-28T23:00:00Z";
  it.each([
    ["2026-10-28T23:00:00Z", "live"],
    ["2026-10-28T23:15:00Z", "live"],
    ["2026-10-28T23:15:01Z", "stale"],
    ["2026-10-29T02:00:00Z", "stale"],
    ["2026-10-28T22:55:00Z", "live"], // a visitor clock up to five minutes behind
    ["2026-10-28T22:54:59Z", "unknown"], // further behind: the age cannot be judged
    ["2026-10-28T19:00:00Z", "unknown"],
  ])("at %s → %s", (now, state) => expect(freshness(t, at(now))).toBe(state));

  it("reads a timestamp without an offset as UTC", () =>
    expect(freshness("2026-10-28T23:00:00", at("2026-10-28T23:20:00Z"))).toBe("stale"));

  it("uses a fifteen-minute window and five minutes of clock tolerance", () => {
    expect(LIVE_WINDOW_MS).toBe(900_000);
    expect(CLOCK_SKEW_MS).toBe(300_000);
  });
});

describe("formatLabClock", () => {
  it("shows the lab's local time of day and zone", () =>
    expect(formatLabClock("2026-10-24T01:07:55Z")).toBe("9:07 PM EDT"));
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
});
