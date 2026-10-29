// Readable labels for InteFL's dataset and strategy keywords, the lab's local dates, and how
// fresh a live payload is. Kept apart from experiment-stats.ts (which loads zod) so the page
// script can read live data without shipping the schema. Labels come from InteFL's own README and config
// validator (github.com/dmitrykoro/fl-execution-framework); keys this file does not know
// render as their raw keyword.

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
  const m = key.match(/^(.+)_(iid|niid|a\d+)$/);
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

// InteFL's partition script tags α as "a" + str(alpha) without the dot, so a20 is 2.0 and
// a5 an integer 5. Longer tags are ambiguous (a105 is 10.5 or 1.05) and show as written.
function variantLabel(tag: string): string {
  if (tag === "iid") return "IID";
  if (tag === "niid") return "non-IID";
  const digits = tag.slice(1);
  if (digits.length === 1) return `α ${digits}`;
  if (digits.length === 2) return `α ${digits[0]}.${digits[1]}`;
  return tag;
}

export function datasetLabel(key: string): string {
  const { label, variant } = parseDataset(key);
  return variant ? `${label} (${variant})` : label;
}

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

/** A timestamp as a Date, reading one with no offset as UTC so the build machine's zone never shifts it. */
export const toDate = (iso: string) =>
  new Date(/(Z|[+-]\d{2}:\d{2})$/i.test(iso) ? iso : `${iso}Z`);

/** "Oct 23, 2026, 9:07 PM EDT": a timestamp in the lab's time zone. */
export const formatLabTime = (iso: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  }).format(toDate(iso));

/** "9:07 PM EDT": the time of day in the lab's time zone. */
export const formatLabClock = (iso: string) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  }).format(toDate(iso));

// The source regenerates its payload at least every minute; one older than this means the
// database behind it has stopped answering, so the page no longer calls it live.
export const LIVE_WINDOW_MS = 15 * 60_000;
// A payload stamped further ahead of the visitor's clock than this means that clock is wrong,
// so its age cannot be judged.
export const CLOCK_SKEW_MS = 5 * 60_000;

/** Whether data generated at `generatedAt` is live, stale or of unknown age at `now`. */
export function freshness(generatedAt: string, now: number): "live" | "stale" | "unknown" {
  const age = now - toDate(generatedAt).getTime();
  if (age < -CLOCK_SKEW_MS) return "unknown";
  return age <= LIVE_WINDOW_MS ? "live" : "stale";
}

export type LiveStats = {
  total: number;
  successful: number;
  hours: number;
  generatedAt: string;
  latest: { createdAt: string; dataset: string; strategy: string } | null;
};

const isCount = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const isTime = (v: unknown): v is string =>
  typeof v === "string" && !Number.isNaN(toDate(v).getTime());

/** The live fields the page shows, or null when the payload lacks any of them. */
export function readLiveStats(json: unknown): LiveStats | null {
  if (!json || typeof json !== "object") return null;
  const s = json as Record<string, unknown>;
  const l = s.latest_experiment as Record<string, unknown> | null | undefined;
  const latest =
    l && isTime(l.created_at) && typeof l.dataset === "string" && typeof l.strategy === "string"
      ? { createdAt: l.created_at, dataset: l.dataset, strategy: l.strategy }
      : null;
  if (l && !latest) return null;
  const { total_experiments: total, successful_experiments: successful, total_hours: hours } = s;
  if (!isCount(total) || !isCount(successful) || !isCount(hours) || !isTime(s.generated_at))
    return null;
  return { total, successful, hours, generatedAt: s.generated_at, latest };
}
