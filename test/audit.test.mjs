import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateAudit,
  extractCanonical,
  extractMetaDescription,
  findBlockedAiCrawlers,
} from "../src/audit.mjs";

const GOOD_HTML = `<!doctype html>
<html lang="en">
<head>
  <title>Next.js Performance & GEO Guide</title>
  <meta content="Learn how to ship fast Next.js applications with clean structured data and AI search readiness." name="description" />
  <link href="https://example.com/guide" rel="canonical" />
  <script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebSite"},{"@type":"Article"}]}</script>
</head>
<body>
  <main>
    <article>
      <h1>Next.js Performance &amp; GEO Guide</h1>
    </article>
  </main>
</body>
</html>`;

describe("attribute order tolerance", () => {
  it("extracts meta description when content precedes name", () => {
    assert.match(extractMetaDescription(GOOD_HTML), /ship fast Next\.js/);
  });

  it("extracts canonical href when href precedes rel", () => {
    assert.equal(extractCanonical(GOOD_HTML), "https://example.com/guide");
  });
});

describe("robots.txt AI crawler scoping", () => {
  it("does not bleed Disallow: / from an unrelated User-agent block", () => {
    const robots = [
      "User-agent: GPTBot",
      "Allow: /",
      "",
      "User-agent: BadScraper",
      "Disallow: /",
    ].join("\n");

    assert.deepEqual(findBlockedAiCrawlers(robots), []);
  });

  it("detects when an AI crawler is explicitly disallowed", () => {
    const robots = [
      "User-agent: ClaudeBot",
      "Disallow: /",
      "",
      "User-agent: GPTBot",
      "Allow: /",
      "",
      "User-agent: Google-Extended",
      "Disallow: /",
    ].join("\n");

    assert.deepEqual(findBlockedAiCrawlers(robots), ["claudebot", "google-extended"]);
  });
});

describe("evaluateAudit", () => {
  it("scores 100 when all SEO and GEO signals pass", () => {
    const result = evaluateAudit({
      html: GOOD_HTML,
      robotsOk: true,
      robotsText: "User-agent: *\nAllow: /\n",
      llmsOk: true,
      llmsText: "# Example\n\n> Machine-readable index for LLMs.\n",
    });

    assert.equal(result.score, 100);
    assert.equal(result.checks.every((c) => c.passed), true);
  });

  it("deducts points for missing llms.txt and blocked AI crawlers", () => {
    const result = evaluateAudit({
      html: GOOD_HTML,
      robotsOk: true,
      robotsText: "User-agent: GPTBot\nDisallow: /\n",
      llmsOk: false,
      llmsText: "",
    });

    assert.equal(result.score, 75);
  });
});
