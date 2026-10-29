// A project's information flyer: a PDF kept beside the project's entry and served at one
// stable URL per project, so the link the lab shares by email survives a replaced file.
import { existsSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";

// One file name under files/ (the CMS may write it with or without "./"): any name the CMS
// can produce, accents and other scripts included, but no slash or backslash and no leading
// dot, so it cannot climb out of that folder.
export const FLYER_PATH = /^(\.\/)?files\/[^/\\.][^/\\]*\.pdf$/iu;

export const flyerRoute = (id: string) => `projects/${id}-flyer.pdf`;

// `entryFile` is the entry's filePath from the glob loader, relative to the project root.
// Fails the build with the entry and the path it named when the file is not there.
export function flyerFile(entryFile: string, flyer: string) {
  const file = resolve(dirname(entryFile), flyer);
  if (!existsSync(file)) throw new Error(`${entryFile}: flyer ${flyer} not found`);
  return file;
}

const size = new Intl.NumberFormat("en-US", {
  style: "unit",
  unit: "megabyte",
  maximumFractionDigits: 1,
});
const smallSize = new Intl.NumberFormat("en-US", {
  style: "unit",
  unit: "kilobyte",
  maximumFractionDigits: 0,
});

// Decimal units, as the label "MB" promises: 3,035,516 bytes is "3 MB". The kB branch
// stops where it would round up to "1,000 kB".
export const formatFileSize = (bytes: number) =>
  bytes >= 999_500 ? size.format(bytes / 1_000_000) : smallSize.format(Math.max(1, bytes / 1000));

export const flyerSize = (entryFile: string, flyer: string) =>
  formatFileSize(statSync(flyerFile(entryFile, flyer)).size);
