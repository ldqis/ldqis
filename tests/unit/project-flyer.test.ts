import { describe, expect, it } from "vitest";
import { FLYER_PATH, flyerFile, flyerRoute, formatFileSize } from "../../src/lib/project-flyer";

describe("formatFileSize", () => {
  it("labels megabytes in decimal units", () => {
    expect(formatFileSize(3_035_516)).toBe("3 MB");
    expect(formatFileSize(2_450_000)).toBe("2.5 MB");
  });

  it("never rounds a small file up to 1,000 kB", () => {
    expect(formatFileSize(999_499)).toBe("999 kB");
    expect(formatFileSize(999_500)).toBe("1 MB");
    expect(formatFileSize(120)).toBe("1 kB");
  });
});

describe("FLYER_PATH", () => {
  // The last four are names the CMS writes for "Résumé du projet.pdf", "Флаер InteFL.pdf",
  // "flyer–final.pdf" and "_draft.pdf".
  it.each([
    "./files/intefl-flyer.pdf",
    "files/intefl-flyer.pdf",
    "./files/InteFL_Pitch-2.PDF",
    "./files/résumé-du-projet.pdf",
    "./files/флаер-intefl.pdf",
    "./files/flyer–final.pdf",
    "./files/_draft.pdf",
  ])("accepts %s", (path) => expect(FLYER_PATH.test(path)).toBe(true));

  it.each([
    "./files/../../../package.json",
    "./files/../secret.pdf",
    "./files/sub/flyer.pdf",
    "/files/flyer.pdf",
    "./files/flyer.pdf.exe",
    "./files/.pdf",
    "./files/.hidden.pdf",
    "./files/..\\secret.pdf",
    "./files/a\\..\\..\\b.pdf",
    "https://example.com/flyer.pdf",
  ])("rejects %s", (path) => expect(FLYER_PATH.test(path)).toBe(false));
});

describe("flyer locations", () => {
  it("resolves the file beside the entry", () => {
    expect(flyerFile("src/content/projects/intefl.md", "./files/intefl-flyer.pdf")).toMatch(
      /src\/content\/projects\/files\/intefl-flyer\.pdf$/,
    );
  });

  it("names the entry and the path when the file is missing", () => {
    expect(() => flyerFile("src/content/projects/intefl.md", "./files/missing.pdf")).toThrow(
      "src/content/projects/intefl.md: flyer ./files/missing.pdf not found",
    );
  });

  it("gives each project one URL, whatever the file is called", () => {
    expect(flyerRoute("intefl")).toBe("projects/intefl-flyer.pdf");
  });
});
