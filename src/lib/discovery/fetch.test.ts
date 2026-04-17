import { describe, expect, it } from "vitest";
import { condenseForLLM, looksJsHeavy } from "./fetch";

describe("looksJsHeavy", () => {
  it("flags shell-only SPA HTML", () => {
    const spa = `<!doctype html><html><head><script src="/app.js"></script></head><body><div id="root"></div></body></html>`;
    expect(looksJsHeavy(spa)).toBe(true);
  });

  it("accepts server-rendered HTML with meaningful text", () => {
    const paragraphs: string[] = [];
    for (let i = 0; i < 20; i++) {
      paragraphs.push(
        `<p>This is a portfolio company with real content about its Solana product. ` +
          `It has investors, a description, and meaningful body copy for the reader.</p>`
      );
    }
    const ssr = `<html><body><h1>Portfolio</h1>${paragraphs.join("")}</body></html>`;
    expect(looksJsHeavy(ssr)).toBe(false);
  });

  it("ignores large inline <script> bundles when counting text", () => {
    const bigScript = `<script>${"a".repeat(50_000)}</script>`;
    const tinyBody = `<body>${bigScript}<div>tiny</div></body>`;
    expect(looksJsHeavy(tinyBody)).toBe(true);
  });
});

describe("condenseForLLM", () => {
  it("strips script, style, head, svg", () => {
    const html = `<html><head><title>T</title></head><body><script>var x=1</script><style>.x{}</style><svg><circle/></svg><p>keep</p></body></html>`;
    const out = condenseForLLM(html);
    expect(out).toContain("keep");
    expect(out).not.toContain("var x=1");
    expect(out).not.toContain(".x{}");
    expect(out).not.toContain("<circle");
    expect(out).not.toContain("<title");
  });

  it("collapses whitespace", () => {
    const html = "<p>a    b\n\n\t\tc</p>";
    expect(condenseForLLM(html)).toBe("<p>a b c</p>");
  });

  it("truncates beyond maxChars with a marker", () => {
    const html = `<p>${"x".repeat(5_000)}</p>`;
    const out = condenseForLLM(html, 500);
    expect(out.length).toBeLessThanOrEqual(500 + "…[truncated]".length);
    expect(out.endsWith("…[truncated]")).toBe(true);
  });
});
