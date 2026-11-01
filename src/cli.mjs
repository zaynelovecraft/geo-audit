#!/usr/bin/env node
/**
 * geo-audit — Technical SEO & Generative Engine Optimization (GEO) CLI Auditor
 * Scores any live URL on JSON-LD structured data, llms.txt, AI crawler rules,
 * canonicals, and semantic heading hierarchy.
 */

const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";

const target = process.argv[2];
const jsonFlag = process.argv.includes("--json");

if (!target || target === "--help" || target === "-h") {
  console.log(`${BOLD}geo-audit${RESET} — Technical SEO & AI Search (GEO) Readiness CLI

${BOLD}Usage:${RESET}
  npx geo-audit <https://example.com> [--json]
`);
  process.exit(target ? 0 : 1);
}

const url = new URL(target.startsWith("http") ? target : `https://${target}`);
const origin = url.origin;

async function safeText(u) {
  try {
    const res = await fetch(u, {
      headers: { "User-Agent": "geo-audit/0.1 (+https://github.com/zaynelovecraft/geo-audit)" },
    });
    return { ok: res.ok, status: res.status, text: res.ok ? await res.text() : "" };
  } catch {
    return { ok: false, status: 0, text: "" };
  }
}

const [page, robots, llms] = await Promise.all([
  safeText(url.href),
  safeText(`${origin}/robots.txt`),
  safeText(`${origin}/llms.txt`),
]);

if (!page.ok) {
  console.error(`${RED}Failed to fetch ${url.href} (HTTP ${page.status})${RESET}`);
  process.exit(1);
}

const html = page.text;
const checks = [];
let score = 0;

function record(name, passed, points, detail) {
  if (passed) score += points;
  checks.push({ name, passed, points: passed ? points : 0, maxPoints: points, detail });
}

// 1. Title & Meta Description
const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
const title = titleMatch ? titleMatch[1].trim() : "";
record("Title tag (15-65 chars)", title.length >= 15 && title.length <= 65, 10, title ? `"${title}" (${title.length}c)` : "Missing");

const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
  || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
const desc = descMatch ? descMatch[1].trim() : "";
record("Meta description (50-165 chars)", desc.length >= 50 && desc.length <= 165, 10, desc ? `${desc.length} chars` : "Missing");

// 2. Canonical URL
const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
record("Canonical link tag", Boolean(canonicalMatch), 10, canonicalMatch ? canonicalMatch[1] : "Missing");

// 3. Single H1 + Semantic Landmarks
const h1Matches = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
record("Single semantic <h1>", h1Matches.length === 1, 15, `Found ${h1Matches.length} <h1> tag(s)`);

const hasMain = /<main\b/i.test(html);
const hasArticleOrSection = /<(article|section)\b/i.test(html);
record("Semantic HTML5 landmarks (<main>, <article>)", hasMain && hasArticleOrSection, 10, `main=${hasMain}, article/section=${hasArticleOrSection}`);

// 4. JSON-LD Structured Data (critical for GEO entity graphs)
const jsonLdMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
const schemaTypes = [];
for (const m of jsonLdMatches) {
  try {
    const parsed = JSON.parse(m[1]);
    const items = Array.isArray(parsed) ? parsed : parsed["@graph"] ? parsed["@graph"] : [parsed];
    for (const item of items) {
      if (item?.["@type"]) schemaTypes.push(item["@type"]);
    }
  } catch {
    // ignore malformed block
  }
}
record("JSON-LD structured data", schemaTypes.length > 0, 20, schemaTypes.length ? `Types: ${schemaTypes.flat().join(", ")}` : "No JSON-LD blocks found");

// 5. robots.txt + AI crawler posture (GPTBot, ClaudeBot, PerplexityBot)
const aiBotsBlocked = /User-agent:\s*(GPTBot|ClaudeBot|PerplexityBot|OAI-SearchBot)[\s\S]*?Disallow:\s*\/\s*$/im.test(robots.text);
record("robots.txt allows AI citation crawlers", robots.ok && !aiBotsBlocked, 15, !robots.ok ? "robots.txt missing" : aiBotsBlocked ? "AI bots disallowed" : "GPTBot / ClaudeBot / PerplexityBot allowed");

// 6. /llms.txt presence
record("/llms.txt machine-readable index", llms.ok && llms.text.length > 20, 10, llms.ok ? `Present (${llms.text.length} bytes)` : "Not found (/llms.txt)");

if (jsonFlag) {
  console.log(JSON.stringify({ url: url.href, score, checks }, null, 2));
  process.exit(0);
}

console.log(`\n${BOLD}GEO & Technical SEO Audit${RESET} — ${CYAN}${url.href}${RESET}\n`);
for (const c of checks) {
  const icon = c.passed ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
  const pts = `${DIM}[${c.points}/${c.maxPoints}]${RESET}`;
  console.log(`  ${icon} ${pts} ${BOLD}${c.name}${RESET} — ${DIM}${c.detail}${RESET}`);
}

const color = score >= 80 ? GREEN : score >= 55 ? YELLOW : RED;
console.log(`\n${BOLD}Overall GEO Score:${RESET} ${color}${BOLD}${score}/100${RESET}\n`);
