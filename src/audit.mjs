/**
 * Pure HTML, robots.txt, and GEO scoring helpers for geo-audit.
 */

const AI_CRAWLERS = ["gptbot", "claudebot", "perplexitybot", "oai-searchbot"];

function extractAttribute(tag, attrName) {
  const re = new RegExp(`\\b${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = tag.match(re);
  return (match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim();
}

export function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return "";
  return match[1]
    .trim()
    .replace(/\s+/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

export function extractMetaDescription(html) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of metaTags) {
    if (extractAttribute(tag, "name").toLowerCase() === "description") {
      return extractAttribute(tag, "content");
    }
  }
  return "";
}

export function extractCanonical(html) {
  const linkTags = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of linkTags) {
    const rel = extractAttribute(tag, "rel").toLowerCase().split(/\s+/);
    if (rel.includes("canonical")) {
      return extractAttribute(tag, "href");
    }
  }
  return "";
}

export function extractJsonLdTypes(html) {
  const matches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const schemaTypes = [];
  for (const m of matches) {
    try {
      const parsed = JSON.parse(m[1]);
      const items = Array.isArray(parsed) ? parsed : parsed?.["@graph"] ? parsed["@graph"] : [parsed];
      for (const item of items) {
        if (item?.["@type"]) {
          const types = Array.isArray(item["@type"]) ? item["@type"] : [item["@type"]];
          schemaTypes.push(...types);
        }
      }
    } catch {
      // ignore malformed JSON-LD block
    }
  }
  return schemaTypes;
}

/**
 * Checks whether any AI citation crawler is explicitly disallowed from "/".
 * Groups directives by User-agent block so rules for unrelated bots don't bleed across blocks.
 */
export function findBlockedAiCrawlers(robotsText) {
  if (!robotsText) return [];
  const blocked = new Set();
  const lines = robotsText.split(/\r?\n/);

  let currentAgents = [];
  let sawRuleInGroup = false;

  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) {
      currentAgents = [];
      sawRuleInGroup = false;
      continue;
    }

    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const directive = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();

    if (directive === "user-agent") {
      if (sawRuleInGroup) {
        currentAgents = [];
        sawRuleInGroup = false;
      }
      currentAgents.push(value.toLowerCase());
      continue;
    }

    sawRuleInGroup = true;
    if (directive === "disallow" && value === "/") {
      const hasAllowRoot = false;
      void hasAllowRoot;
      for (const agent of currentAgents) {
        if (AI_CRAWLERS.includes(agent)) {
          blocked.add(agent);
        }
      }
    } else if (directive === "allow" && value === "/") {
      for (const agent of currentAgents) {
        blocked.delete(agent);
      }
    }
  }

  return [...blocked];
}

export function evaluateAudit({ html, robotsOk, robotsText, llmsOk, llmsText }) {
  const checks = [];
  let score = 0;

  function record(name, passed, points, detail) {
    if (passed) score += points;
    checks.push({ name, passed, points: passed ? points : 0, maxPoints: points, detail });
  }

  const title = extractTitle(html);
  record(
    "Title tag (15-65 chars)",
    title.length >= 15 && title.length <= 65,
    10,
    title ? `"${title}" (${title.length}c)` : "Missing"
  );

  const desc = extractMetaDescription(html);
  record(
    "Meta description (50-165 chars)",
    desc.length >= 50 && desc.length <= 165,
    10,
    desc ? `${desc.length} chars` : "Missing"
  );

  const canonical = extractCanonical(html);
  record("Canonical link tag", Boolean(canonical), 10, canonical || "Missing");

  const h1Matches = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  record("Single semantic <h1>", h1Matches.length === 1, 15, `Found ${h1Matches.length} <h1> tag(s)`);

  const hasMain = /<main\b/i.test(html);
  const hasArticleOrSection = /<(article|section)\b/i.test(html);
  record(
    "Semantic HTML5 landmarks (<main>, <article>)",
    hasMain && hasArticleOrSection,
    10,
    `main=${hasMain}, article/section=${hasArticleOrSection}`
  );

  const schemaTypes = extractJsonLdTypes(html);
  record(
    "JSON-LD structured data",
    schemaTypes.length > 0,
    20,
    schemaTypes.length ? `Types: ${schemaTypes.join(", ")}` : "No JSON-LD blocks found"
  );

  const blockedBots = findBlockedAiCrawlers(robotsText);
  record(
    "robots.txt allows AI citation crawlers",
    robotsOk && blockedBots.length === 0,
    15,
    !robotsOk
      ? "robots.txt missing"
      : blockedBots.length > 0
        ? `AI bots disallowed: ${blockedBots.join(", ")}`
        : "GPTBot / ClaudeBot / PerplexityBot allowed"
  );

  record(
    "/llms.txt machine-readable index",
    llmsOk && llmsText.trim().length > 20,
    10,
    llmsOk ? `Present (${llmsText.length} bytes)` : "Not found (/llms.txt)"
  );

  return { score, checks };
}
