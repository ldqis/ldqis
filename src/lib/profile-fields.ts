// Rules for the fields on a person's card, shared by the content schema (the build), the CMS
// form (src/pages/admin/config.yml.ts) and the card itself, so the editor rejects exactly what
// the build would.

// The first year on the "Years in the lab" dropdowns. research(2026-10): Dr. Reznik taught at
// Victoria University through 2001 and at UTEP in 2002 (https://www.cs.rit.edu/~lr/), so his
// RIT lab starts in 2003.
export const LAB_FIRST_YEAR = 2003;

export const PRESENT = "present";

// Each link field's check, with the message the editor and the build both show.
export const PROFILE_PATTERNS = {
  github: {
    pattern: /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/,
    message: 'Enter just the handle, like "ajbarea", not a URL',
  },
  linkedin: {
    pattern: /^https:\/\/([a-z0-9-]+\.)?linkedin\.com\//,
    message: "Paste the full link to your LinkedIn profile, starting with https://",
  },
  youtube: {
    pattern: /^https:\/\/([a-z0-9-]+\.)?(youtube\.com|youtu\.be)\//,
    message: "Paste the full link to your YouTube channel, starting with https://",
  },
  scholar: {
    pattern: /^https:\/\/scholar\.google\.com\//,
    message: "Paste the full link to your Google Scholar profile, starting with https://",
  },
  ieee: {
    pattern: /^https:\/\/ieeexplore\.ieee\.org\//,
    message: "Paste the full link to your IEEE Xplore author page, starting with https://",
  },
  orcid: {
    pattern: /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/,
    message: "Enter the 16-digit iD, like 0000-0002-1825-0097",
  },
} as const;

// The years a dropdown offers, newest first.
export function labYears(now = new Date()): number[] {
  const last = now.getUTCFullYear();
  return Array.from({ length: last - LAB_FIRST_YEAR + 1 }, (_, i) => last - i);
}

// "2021–present", "2015–2018", or "2019" when a person started and finished in one year.
export function formatYears(from?: number, to?: number | typeof PRESENT): string {
  if (from === undefined) return "";
  if (to === undefined || to === from) return String(from);
  return `${from}–${to}`;
}

// Up to two letters from the name, honorific dropped: "Dr. Leon Reznik" → "LR".
export function initialsOf(name: string): string {
  const words = name
    .replace(/^(Dr|Prof)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean);
  const picked = words.length > 1 ? [words[0], words.at(-1)!] : words;
  return picked.map((w) => w[0]!.toUpperCase()).join("");
}
