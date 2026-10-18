import { describe, expect, it } from "vitest";

import { formatTag, formatTags } from "../../src/lib/news";

describe("formatTag", () => {
  it("turns a slug into sentence case", () => {
    expect(formatTag("federated-learning")).toBe("Federated learning");
    expect(formatTag("talks")).toBe("Talks");
    expect(formatTag("data_quality")).toBe("Data quality");
  });

  it("keeps acronyms readable", () => {
    expect(formatTag("ai-security")).toBe("AI security");
    expect(formatTag("iot")).toBe("IoT");
    expect(formatTag("federated-llm")).toBe("Federated LLM");
  });

  it("reads an empty tag as nothing", () => {
    expect(formatTag("")).toBe("");
    expect(formatTag(" - ")).toBe("");
  });
});

describe("formatTags", () => {
  it("joins tags and skips blank ones", () => {
    expect(formatTags(["talks", "", "federated-learning"])).toBe("Talks, Federated learning");
    expect(formatTags([])).toBe("");
  });
});
