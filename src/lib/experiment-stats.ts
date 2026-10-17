// InteFL's public experiment statistics: the payload schema, where it is fetched from, and
// the view model the project page renders. Labels come from InteFL's own README and
// config validator (github.com/dmitrykoro/fl-execution-framework); keys this file does not
// know render as their raw keyword, so a new dataset, attack or strategy never breaks the build.
import { z } from "astro/zod";

// Loose objects keep fields this site does not render, so the mirror at
// /data/intefl-experiments.json stays byte-for-byte comparable with the source
// (the scheduled deploy diffs the two to decide whether to rebuild).
const count = z.number().int().nonnegative();
const named = z.looseObject({ name: z.string().min(1), count });

export const experimentStatsSchema = z.looseObject({
  total_experiments: count,
  successful_experiments: count,
  total_hours: z.number().nonnegative(),
  latest_experiment: z
    .looseObject({
      id: z.number().int(),
      created_at: z.iso.datetime({ offset: true }),
      dataset: z.string(),
      strategy: z.string(),
    })
    .nullable(),
  experiments_per_week: z.array(z.looseObject({ week_start: z.iso.date(), count })),
  experiments_per_dataset: z.array(named),
  experiments_per_attack: z.array(named),
  generated_at: z.iso.datetime({ offset: true }),
});

export type ExperimentStats = z.infer<typeof experimentStatsSchema>;

/** The lab's experiment database, run by InteFL. CORS-open and cached for 60 s. */
export const STATS_ENDPOINT = "https://gcis-lrvcs-rl.gccis.rit.edu/public/stats";
/** The copy this site last deployed, served by src/pages/data/intefl-experiments.json.ts. */
export const STATS_MIRROR = "https://dataqualitylabs.com/data/intefl-experiments.json";

export type StatsSource = { name: string; get: () => Promise<unknown> };

/**
 * The first source that answers with a valid payload, in order. Each failure is reported
 * through `warn` and the next source is tried; throws only when every source fails.
 */
export async function resolveStats(
  sources: StatsSource[],
  warn: (message: string) => void,
): Promise<{ stats: ExperimentStats; source: string }> {
  for (const { name, get } of sources) {
    try {
      const parsed = experimentStatsSchema.safeParse(await get());
      if (parsed.success) return { stats: parsed.data, source: name };
      warn(`${name}: unexpected payload (${z.prettifyError(parsed.error)})`);
    } catch (err) {
      warn(`${name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new Error("no experiment-stats source answered with a valid payload");
}

export const fetchJson =
  (url: string, timeoutMs = 10_000) =>
  async () => {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

// ---------- labels ----------

type Family = { label: string; domain: Domain };
type Domain = "Image classification" | "Medical imaging" | "Sensor time series" | "Text";

const FAMILIES: Record<string, Family> = {
  femnist: { label: "FEMNIST", domain: "Image classification" },
  cifar10: { label: "CIFAR-10", domain: "Image classification" },
  cifar100: { label: "CIFAR-100", domain: "Image classification" },
  its: { label: "Traffic signs", domain: "Image classification" },
  flair: { label: "FLAIR", domain: "Image classification" },
  pneumoniamnist: { label: "PneumoniaMNIST", domain: "Medical imaging" },
  bloodmnist: { label: "BloodMNIST", domain: "Medical imaging" },
  breastmnist: { label: "BreastMNIST", domain: "Medical imaging" },
  pathmnist: { label: "PathMNIST", domain: "Medical imaging" },
  dermamnist: { label: "DermaMNIST", domain: "Medical imaging" },
  octmnist: { label: "OCTMNIST", domain: "Medical imaging" },
  retinamnist: { label: "RetinaMNIST", domain: "Medical imaging" },
  tissuemnist: { label: "TissueMNIST", domain: "Medical imaging" },
  organamnist: { label: "OrganAMNIST", domain: "Medical imaging" },
  organcmnist: { label: "OrganCMNIST", domain: "Medical imaging" },
  organsmnist: { label: "OrganSMNIST", domain: "Medical imaging" },
  lung_photos: { label: "Lung CT (NLST)", domain: "Medical imaging" },
  smores: { label: "SMORES dissolved oxygen", domain: "Sensor time series" },
  air_quality_uci: { label: "Air Quality (UCI)", domain: "Sensor time series" },
  medmentions: { label: "MedMentions", domain: "Text" },
};

/**
 * Split a dataset keyword into its family and partition: `cifar100_a05` is CIFAR-100 split
 * with Dirichlet α = 0.5 (InteFL's partition script tags α as "a" + the digits, 2.0 → a20).
 */
export function parseDataset(key: string): {
  family: string;
  label: string;
  domain: string;
  variant?: string;
} {
  const m = key.match(/^(.+)_(iid|niid|a\d{2,})$/);
  const familyKey = m && FAMILIES[m[1]] ? m[1] : key;
  const family = FAMILIES[familyKey];
  const variant = m && familyKey === m[1] ? variantLabel(m[2]) : undefined;
  return {
    family: familyKey,
    label: family?.label ?? key,
    domain: family?.domain ?? "Other",
    ...(variant && { variant }),
  };
}

function variantLabel(tag: string): string {
  if (tag === "iid") return "IID";
  if (tag === "niid") return "non-IID";
  const digits = tag.slice(1);
  return `α ${digits[0]}.${digits.slice(1)}`;
}

export function datasetLabel(key: string): string {
  const { label, variant } = parseDataset(key);
  return variant ? `${label} (${variant})` : label;
}

type AttackFamily = "Data poisoning" | "Model poisoning" | "Other attacks" | "No attack";

const ATTACKS: Record<string, { label: string; family: AttackFamily }> = {
  label_flipping: { label: "Label flipping", family: "Data poisoning" },
  target_flipping: { label: "Target flipping", family: "Data poisoning" },
  gaussian_noise: { label: "Gaussian noise", family: "Data poisoning" },
  gradient_scaling: { label: "Gradient scaling", family: "Model poisoning" },
  little_is_enough: { label: "A Little Is Enough", family: "Model poisoning" },
  none: { label: "Clean baseline", family: "No attack" },
};

export const ATTACK_FAMILY_NOTES: Record<AttackFamily, string> = {
  "Data poisoning": "Malicious clients corrupt their training data.",
  "Model poisoning": "Malicious clients tamper with the model updates they send.",
  "Other attacks": "",
  "No attack": "Every client is honest, for comparison.",
};

const humanize = (key: string) => {
  const s = key.replace(/[_-]+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const STRATEGIES: Record<string, string> = {
  fedavg: "FedAvg",
  trust: "Trust & Reputation",
  pid: "PID",
  pid_scaled: "PID (scaled)",
  pid_standardized: "PID (standardized)",
  pid_standardized_score_based: "PID (score-based)",
  pid_v5_stateless_mean_based: "PID (stateless, mean)",
  pid_v5_stateless_median_based: "PID (stateless, median)",
  pid_made: "PID-MADE",
  krum: "Krum",
  "multi-krum": "Multi-Krum",
  "multi-krum-based": "Multi-Krum",
  trimmed_mean: "Trimmed mean",
  rfa: "RFA",
  bulyan: "Bulyan",
  fools_gold: "FoolsGold",
  freq_fed: "FreqFed",
  fl_detector: "FLDetector",
  fed_nga: "Fed-NGA",
  fed_dmc: "FedDMC",
  signguard: "SignGuard",
  rfcl: "RFCL",
  lqr_fed: "LQR-Fed",
};

export const strategyLabel = (key: string) => STRATEGIES[key] ?? key;

// ---------- view model ----------

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Apr 6, 2026" from an ISO date, in UTC so a week never shifts by a day. */
export function formatDay(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const monthYear = (iso: string) => `${MONTH_NAMES[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

export type Week = { start: string; count: number; label: string; tick?: string };
export type Row = { key: string; label: string; count: number; detail?: string };
export type Group = { label: string; note?: string; total: number; rows: Row[] };

const byCount = <T extends { count: number }>(a: T, b: T) => b.count - a.count;
// IID, then non-IID, then Dirichlet splits from most to least skewed (ascending α).
const partitionRank = (label: string) =>
  label === "IID" ? -2 : label === "non-IID" ? -1 : Number(label.replace("α ", ""));
const byPartition = (a: { label: string }, b: { label: string }) =>
  partitionRank(a.label) - partitionRank(b.label);
const sum = (rows: { count: number }[]) => rows.reduce((n, r) => n + r.count, 0);

export function summarize(stats: ExperimentStats) {
  const weeks: Week[] = stats.experiments_per_week.map((w, i, all) => {
    const month = Number(w.week_start.slice(5, 7)) - 1;
    const prev = i ? Number(all[i - 1].week_start.slice(5, 7)) - 1 : -1;
    return {
      start: w.week_start,
      count: w.count,
      label: formatDay(w.week_start),
      ...(month !== prev && { tick: MONTHS[month] }),
    };
  });
  const peak = weeks.reduce<Week | undefined>(
    (p, w) => (!p || w.count > p.count ? w : p),
    undefined,
  );
  const firstActive = weeks.find((w) => w.count > 0);

  const attackGroups = new Map<AttackFamily, Row[]>();
  for (const a of stats.experiments_per_attack) {
    const known = ATTACKS[a.name];
    const family = known?.family ?? "Other attacks";
    const rows = attackGroups.get(family) ?? [];
    rows.push({ key: a.name, label: known?.label ?? humanize(a.name), count: a.count });
    attackGroups.set(family, rows);
  }
  const attackOrder: AttackFamily[] = [
    "Data poisoning",
    "Model poisoning",
    "Other attacks",
    "No attack",
  ];
  const attacks: Group[] = attackOrder
    .filter((f) => attackGroups.has(f))
    .map((f) => {
      const rows = attackGroups.get(f)!.sort(byCount);
      return { label: f, note: ATTACK_FAMILY_NOTES[f] || undefined, total: sum(rows), rows };
    });

  // Dataset families (CIFAR-100 across its partitions) within domains.
  const families = new Map<
    string,
    Row & { domain: string; parts: { label: string; count: number }[] }
  >();
  for (const d of stats.experiments_per_dataset) {
    const p = parseDataset(d.name);
    const f = families.get(p.family) ?? {
      key: p.family,
      label: p.label,
      count: 0,
      domain: p.domain,
      parts: [],
    };
    f.count += d.count;
    if (p.variant) f.parts.push({ label: p.variant, count: d.count });
    families.set(p.family, f);
  }
  const domains = new Map<string, Row[]>();
  for (const f of families.values()) {
    const detail = f.parts.length
      ? f.parts
          .sort(byPartition)
          .map((v) => `${v.label}: ${v.count.toLocaleString("en-US")}`)
          .join(", ")
      : undefined;
    const rows = domains.get(f.domain) ?? [];
    rows.push({ key: f.key, label: f.label, count: f.count, ...(detail && { detail }) });
    domains.set(f.domain, rows);
  }
  const datasets: Group[] = [...domains]
    .map(([label, rows]) => ({ label, total: sum(rows), rows: rows.sort(byCount) }))
    .sort((a, b) => Number(a.label === "Other") - Number(b.label === "Other") || b.total - a.total);

  const latest = stats.latest_experiment;
  return {
    total: stats.total_experiments,
    successful: stats.successful_experiments,
    hours: stats.total_hours,
    since: firstActive ? monthYear(firstActive.start) : undefined,
    weeks,
    peak: peak && peak.count > 0 ? peak : undefined,
    latest: latest && {
      day: formatDay(latest.created_at),
      dataset: datasetLabel(latest.dataset),
      strategy: strategyLabel(latest.strategy),
    },
    attacks,
    attackMax: Math.max(0, ...attacks.flatMap((g) => g.rows.map((r) => r.count))),
    datasets,
    datasetMax: Math.max(0, ...datasets.flatMap((g) => g.rows.map((r) => r.count))),
    generatedAt: stats.generated_at,
  };
}

export type StatsView = ReturnType<typeof summarize>;
