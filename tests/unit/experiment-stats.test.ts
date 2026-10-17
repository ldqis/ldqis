import { describe, expect, it } from "vitest";

import snapshot from "../../src/data/intefl-experiments.json";
import {
  datasetLabel,
  experimentStatsSchema,
  parseDataset,
  resolveStats,
  strategyLabel,
  summarize,
} from "../../src/lib/experiment-stats";

const stats = experimentStatsSchema.parse(snapshot);

describe("parseDataset", () => {
  it("reads a Dirichlet tag as α (InteFL tags 2.0 as a20)", () => {
    expect(parseDataset("cifar100_a01")).toMatchObject({ family: "cifar100", variant: "α 0.1" });
    expect(parseDataset("cifar10_a20")).toMatchObject({ family: "cifar10", variant: "α 2.0" });
    expect(parseDataset("cifar100_a50").variant).toBe("α 5.0");
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

  it("ticks each month once and picks the busiest week", () => {
    const v = summarize({
      ...stats,
      experiments_per_week: [
        { week_start: "2026-03-23", count: 0 },
        { week_start: "2026-03-30", count: 5 },
        { week_start: "2026-04-06", count: 9 },
      ],
    });
    expect(v.weeks.map((w) => w.tick)).toEqual(["Mar", undefined, "Apr"]);
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

describe("resolveStats", () => {
  it("falls through a failing and an invalid source to the first valid one", async () => {
    const warnings: string[] = [];
    const got = await resolveStats(
      [
        { name: "down", get: async () => Promise.reject(new Error("timeout")) },
        { name: "changed", get: async () => ({ total: 1 }) },
        { name: "mirror", get: async () => snapshot },
      ],
      (m) => warnings.push(m),
    );
    expect(got.source).toBe("mirror");
    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toBe("down: timeout");
  });

  it("throws when no source answers", async () => {
    await expect(resolveStats([{ name: "down", get: async () => null }], () => {})).rejects.toThrow(
      /no experiment-stats source/,
    );
  });
});
