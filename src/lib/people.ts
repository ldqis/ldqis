import { getCollection, type CollectionEntry } from "astro:content";

export type Person = CollectionEntry<"people">["data"] & { id: string };

// Leading honorific ignored, so "Dr. Chuprov" files under C.
const sortName = (name: string) => name.replace(/^(Dr|Prof)\.?\s+/i, "");

// The current team in its curated `order`, and alumni alphabetically by name so a new
// graduate slots in without inheriting an arbitrary `order`.
export async function loadPeople(): Promise<{ current: Person[]; alumni: Person[] }> {
  const entries = (await getCollection("people")).map((e) => ({ ...e.data, id: e.id }));
  return {
    current: entries.filter((p) => p.cohort === "current").sort((a, b) => a.order - b.order),
    alumni: entries
      .filter((p) => p.cohort === "past")
      .sort((a, b) => sortName(a.name).localeCompare(sortName(b.name))),
  };
}
