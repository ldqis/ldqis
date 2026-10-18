import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { GET } from "../../src/pages/admin/config.yml";
import {
  LAB_FIRST_YEAR,
  PRESENT,
  PROFILE_PATTERNS,
  formatYears,
  initialsOf,
  labYears,
} from "../../src/lib/profile-fields";

describe("formatYears", () => {
  it("shows a range, an open range, or a single year", () => {
    expect(formatYears(2015, 2018)).toBe("2015–2018");
    expect(formatYears(2021, PRESENT)).toBe("2021–present");
    expect(formatYears(2019, 2019)).toBe("2019");
    expect(formatYears(2019)).toBe("2019");
  });

  it("shows nothing without a start year", () => {
    expect(formatYears()).toBe("");
    expect(formatYears(undefined, 2019)).toBe("");
    expect(formatYears(undefined, PRESENT)).toBe("");
  });

  it("puts a reversed pair in order", () => {
    expect(formatYears(2020, 2018)).toBe("2018–2020");
  });
});

describe("initialsOf", () => {
  it("takes the first and last name, without the title", () => {
    expect(initialsOf("Dr. Leon Reznik")).toBe("LR");
    expect(initialsOf("Deepak Naidu Talapaneni")).toBe("DT");
    expect(initialsOf("prof Ada")).toBe("A");
  });
});

describe("labYears", () => {
  it("runs from this year back to the lab's first year", () => {
    const years = labYears(new Date("2026-10-18T12:00:00Z"));
    expect(years[0]).toBe(2026);
    expect(years.at(-1)).toBe(LAB_FIRST_YEAR);
    expect(years).toHaveLength(2026 - LAB_FIRST_YEAR + 1);
  });
});

describe("the CMS people form", () => {
  const config = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the endpoint only reads `site`
    const res = await GET({ site: new URL("https://dataqualitylabs.com") } as any);
    const doc = parse(await res.text());
    const people = doc.collections.find((c: { name: string }) => c.name === "people");
    return Object.fromEntries(people.fields.map((f: { name: string }) => [f.name, f]));
  };

  it("offers every lab year, newest first, and Present to end a range", async () => {
    const fields = await config();
    const from = fields.years_from.options.map((o: { value: number }) => o.value);
    expect(from).toEqual(labYears());
    expect(fields.years_to.options[0]).toEqual({ label: "Present", value: PRESENT });
  });

  it("checks each link field with the build's own pattern and message", async () => {
    const fields = await config();
    for (const [key, rule] of Object.entries(PROFILE_PATTERNS)) {
      expect(fields[key].pattern, key).toEqual([rule.pattern.source, rule.message]);
    }
  });
});

describe("the profile form intake", () => {
  const script = "scripts/profile_intake.py";
  const parse = (text: string) =>
    execFileSync(
      "python3",
      [
        "-c",
        "import json,sys; sys.path.insert(0,'scripts'); import profile_intake as p; " +
          "print(json.dumps(p.parse_years(sys.argv[1], 2026)))",
        text,
      ],
      { encoding: "utf8" },
    ).trim();

  it("reads a year range typed in any common form", () => {
    expect(parse("2018–2022")).toBe("[2018, 2022]");
    expect(parse("2018-2022")).toBe("[2018, 2022]");
    expect(parse("2021 to present")).toBe('[2021, "present"]');
    expect(parse("since 2021")).toBe('[2021, "present"]');
    expect(parse("2019")).toBe("[2019, null]");
  });

  it("keeps a closed range closed when the text mentions a later job", () => {
    expect(parse("2016–2019 (now at Google)")).toBe("[2016, 2019]");
    expect(parse("2016-2019, currently at IBM")).toBe("[2016, 2019]");
  });

  it("reads a card's single-quoted and double-quoted values", () => {
    const unquote = (raw: string) =>
      execFileSync(
        "python3",
        [
          "-c",
          "import json,sys; sys.path.insert(0,'scripts'); import profile_intake as p; " +
            "print(json.dumps(p.unquote(sys.argv[1])))",
          raw,
        ],
        { encoding: "utf8" },
      ).trim();
    expect(unquote("''")).toBe('""');
    expect(unquote("'Dr. Jane O''Brien'")).toBe(`"Dr. Jane O'Brien"`);
    expect(unquote('"say \\"hi\\""')).toBe('"say \\"hi\\""');
    expect(unquote("plain")).toBe('"plain"');
  });

  it("refuses a count, a reversed range, or a year outside the lab's span", () => {
    expect(parse("5")).toBe("null");
    expect(parse("2022–2018")).toBe("null");
    expect(parse("1999")).toBe("null");
  });

  it("starts the lab where the CMS does", () => {
    expect(readFileSync(script, "utf8")).toContain(`LAB_FIRST_YEAR = ${LAB_FIRST_YEAR}`);
  });
});
