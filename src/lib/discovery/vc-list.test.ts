import { describe, expect, it } from "vitest";
import { VC_LIST, getVcSources } from "./vc-list";

describe("VC_LIST", () => {
  it("has no duplicate slugs", () => {
    const slugs = VC_LIST.map((v) => v.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every entry has a usable URL (portfolio or homepage)", () => {
    for (const v of VC_LIST) {
      const url = v.portfolioUrl ?? v.homepage;
      expect(url).toMatch(/^https?:\/\//);
    }
  });

  it("slugs are lowercase, hyphen-or-dot-free kebab", () => {
    for (const v of VC_LIST) {
      expect(v.slug).toMatch(/^[a-z0-9][a-z0-9-]*$/);
    }
  });
});

describe("getVcSources", () => {
  it("filters to solana-relevant by default", () => {
    const def = getVcSources();
    expect(def.every((v) => v.solanaRelevant)).toBe(true);
  });

  it("returns all with { all: true }", () => {
    const all = getVcSources({ all: true });
    expect(all.length).toBe(VC_LIST.length);
  });
});
