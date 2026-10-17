import { describe, expect, it } from "vitest";

import snapshot from "../../src/data/intefl-experiments.json";
import {
  datasetLabel,
  experimentStatsSchema,
  parseDataset,
  resolveStats,
  statsDiffer,
  strategyLabel,
  summarize,
  toDate,
} from "../../src/lib/experiment-stats";

const stats = experimentStatsSchema.parse(snapshot);

describe("parseDataset", () => {
  it("reads a Dirichlet tag as α (InteFL tags 2.0 as a20)", () => {
    expect(parseDataset("cifar100_a01")).toMatchObject({ family: "cifar100", variant: "α 0.1" });
    expect(parseDataset("cifar10_a20")).toMatchObject({ family: "cifar10", variant: "α 2.0" });
    expect(parseDataset("cifar100_a50").variant).toBe("α 5.0");
  });

  it("reads a one-digit tag as an integer α and leaves an ambiguous tag as written", () => {
    expect(parseDataset("cifar10_a5").variant).toBe("α 5");
    expect(parseDataset("cifar10_a105").variant).toBe("a105");
  });

  it("names IID and non-IID splits", () => {
    expect(datasetLabel("femnist_iid")).toBe("FEMNIST (IID)");
    expect(datasetLabel("femnist_niid")).toBe("FEMNIST (non-IID)");
  });

  it("keeps an underscore that belongs to the dataset name", () => {
    expect(parseDataset("air_quality_uci")).toMatchObject({
      family: "air_quality_uci",
      domain: "Sensor time series",
    });
    expect(parseDataset("lung_photos").variant).toBeUndefined();
  });

  it("falls back to the raw keyword for an unknown dataset", () => {
    expect(parseDataset("mystery_iid")).toEqual({
      family: "mystery_iid",
      label: "mystery_iid",
      domain: "Other",
    });
  });
});

describe("strategyLabel", () => {
  it("names known strategies and passes unknown ones through", () => {
    expect(strategyLabel("pid_made")).toBe("PID-MADE");
    expect(strategyLabel("brand_new")).toBe("brand_new");
  });
});

describe("summarize", () => {
  const view = summarize(stats);

  it("conserves every count across the groupings", () => {
    const total = (groups: { rows: { count: number }[] }[]) =>
      groups.flatMap((g) => g.rows).reduce((n, r) => n + r.count, 0);
    const sum = (xs: { count: number }[]) => xs.reduce((n, x) => n + x.count, 0);
    expect(total(view.attacks)).toBe(sum(stats.experiments_per_attack));
    expect(total(view.datasets)).toBe(sum(stats.experiments_per_dataset));
    expect(sum(view.weeks)).toBe(sum(stats.experiments_per_week));
  });

  it("orders attack families with the baseline last", () => {
    expect(view.attacks.map((g) => g.label).at(-1)).toBe("No attack");
    expect(view.attacks[0].label).toBe("Data poisoning");
  });

  it("files an unknown attack under other attacks", () => {
    const v = summarize({
      ...stats,
      experiments_per_attack: [{ name: "brand_new_attack", count: 3 }],
    });
    expect(v.attacks).toEqual([
      {
        label: "Other attacks",
        total: 3,
        rows: [{ key: "brand_new_attack", label: "Brand new attack", count: 3 }],
      },
    ]);
  });

  it("lists partitions as IID, non-IID, then ascending α", () => {
    const v = summarize({
      ...stats,
      experiments_per_dataset: [
        { name: "cifar10_a20", count: 1 },
        { name: "cifar10_niid", count: 2 },
        { name: "cifar10_a01", count: 3 },
        { name: "cifar10_iid", count: 4 },
      ],
    });
    expect(v.datasets[0].rows[0]).toMatchObject({
      label: "CIFAR-10",
      count: 10,
      detail: "IID: 4, non-IID: 2, α 0.1: 3, α 2.0: 1",
    });
  });

  it("counts a bare keyword beside its partitions as other", () => {
    const v = summarize({
      ...stats,
      experiments_per_dataset: [
        { name: "femnist", count: 10 },
        { name: "femnist_iid", count: 5 },
      ],
    });
    expect(v.datasets[0].rows[0]).toMatchObject({ count: 15, detail: "IID: 5, other: 10" });
  });

  it("marks quarter months major, shows the year at January, and pins ticks near the end", () => {
    const weeks = ["2026-11-30", "2026-12-07", "2027-01-04", "2027-02-01", "2027-02-08"];
    const v = summarize({
      ...stats,
      experiments_per_week: weeks.map((week_start) => ({ week_start, count: 1 })),
    });
    // Nov is dropped: Dec follows one week later and the labels would collide.
    expect(v.weeks.map((w) => w.tick)).toEqual([
      undefined,
      { text: "Dec", major: false, end: false },
      { text: "2027", major: true, end: false },
      { text: "Feb", major: false, end: true },
      undefined,
    ]);
  });

  it("widens the tick stride as the series grows", () => {
    const start = Date.parse("2026-03-02T00:00:00Z");
    const series = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        week_start: new Date(start + i * 7 * 86_400_000).toISOString().slice(0, 10),
        count: 1,
      }));
    const texts = (n: number, major?: boolean) =>
      summarize({ ...stats, experiments_per_week: series(n) }).weeks.flatMap((w) =>
        w.tick && (major === undefined || w.tick.major === major) ? [w.tick.text] : [],
      );
    expect(texts(100)).toEqual(["Apr", "Jul", "Oct", "2027", "Apr", "Jul", "Oct", "2028"]);
    expect(texts(100, true)).toEqual(["Jul", "2027", "Jul", "2028"]);
    // The first week's month (Mar) is labelled as a minor tick: Jul is 18 weeks on.
    expect(texts(200)).toEqual(["Mar", "Jul", "2027", "Jul", "2028", "Jul", "2029", "Jul"]);
  });

  it("ticks each month once and picks the busiest week", () => {
    const v = summarize({
      ...stats,
      experiments_per_week: [
        { week_start: "2026-03-23", count: 0 },
        { week_start: "2026-03-30", count: 5 },
        { week_start: "2026-04-06", count: 9 },
      ],
    });
    expect(v.weeks.map((w) => w.tick?.text)).toEqual([undefined, undefined, "Apr"]);
    expect(v.peak?.start).toBe("2026-04-06");
    expect(v.since).toBe("March 2026");
  });

  it("has no peak when every week is empty", () => {
    const v = summarize({
      ...stats,
      experiments_per_week: [{ week_start: "2026-03-23", count: 0 }],
    });
    expect(v.peak).toBeUndefined();
    expect(v.since).toBeUndefined();
  });
});

describe("experimentStatsSchema", () => {
  it("keeps fields this site does not render, so the mirror stays comparable", () => {
    const parsed = experimentStatsSchema.parse({
      ...snapshot,
      new_field: 1,
      experiments_per_attack: [{ name: "none", count: 1, share: 0.5 }],
    });
    expect(parsed).toMatchObject({ new_field: 1, experiments_per_attack: [{ share: 0.5 }] });
  });
});

describe("statsDiffer", () => {
  it("ignores generated_at, key order and number spelling", () => {
    const a = JSON.parse('{"total_hours": 165.0, "generated_at": "x", "b": [{"n": 1, "m": 2}]}');
    const b = JSON.parse('{"b": [{"m": 2, "n": 1}], "generated_at": "y", "total_hours": 165}');
    expect(statsDiffer(a, b)).toBe(false);
  });

  it("sees a changed count and a missing copy", () => {
    expect(statsDiffer({ total: 1 }, { total: 2 })).toBe(true);
    expect(statsDiffer(snapshot, null)).toBe(true);
  });
});

describe("toDate", () => {
  it("reads a timestamp with no offset as UTC", () => {
    expect(toDate("2026-10-17T02:30:00").toISOString()).toBe("2026-10-17T02:30:00.000Z");
    expect(toDate("2026-10-17T02:30:00-04:00").toISOString()).toBe("2026-10-17T06:30:00.000Z");
  });
});

describe("resolveStats", () => {
  const at = (generated_at: string) => ({ ...snapshot, generated_at });

  it("uses the live source when it is valid", async () => {
    const got = await resolveStats(
      { name: "live", get: async () => at("2026-10-17T21:00:00Z") },
      [{ name: "mirror", get: async () => at("2026-10-18T00:00:00Z") }],
      () => {},
    );
    expect(got.source).toBe("live");
  });

  it("falls back to the newest valid copy, never an older one", async () => {
    const warnings: string[] = [];
    const got = await resolveStats(
      { name: "live", get: async () => Promise.reject(new Error("timeout")) },
      [
        { name: "changed", get: async () => ({ total: 1 }) },
        { name: "snapshot", get: async () => at("2026-10-01T00:00:00Z") },
        { name: "mirror", get: async () => at("2026-10-17T21:00:00Z") },
      ],
      (m) => warnings.push(m),
    );
    expect(got.source).toBe("mirror");
    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toBe("live: timeout");
  });

  it("throws when no source answers", async () => {
    await expect(
      resolveStats({ name: "down", get: async () => null }, [], () => {}),
    ).rejects.toThrow(/no experiment-stats source/);
  });
});
