// Words that read as acronyms in a tag; everything else is sentence case.
const ACRONYMS = new Set([
  "ai",
  "ml",
  "fl",
  "llm",
  "iot",
  "nsf",
  "rit",
  "cms",
  "rss",
  "api",
  "gpu",
]);

/** A news tag as readers see it: "federated-learning" becomes "Federated learning". */
export const formatTag = (tag: string) =>
  tag
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word, i) => {
      const lower = word.toLowerCase();
      if (ACRONYMS.has(lower)) return lower === "iot" ? "IoT" : lower.toUpperCase();
      return i === 0 ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
    })
    .join(" ");

/** Tags as one line of plain text, skipping blank ones. */
export const formatTags = (tags: string[]) => tags.map(formatTag).filter(Boolean).join(", ");
