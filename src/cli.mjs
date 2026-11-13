#!/usr/bin/env node
/**
 * geo-audit — Technical SEO & Generative Engine Optimization (GEO) CLI Auditor
 * Scores any live URL on JSON-LD structured data, llms.txt, AI crawler rules,
 * canonicals, and semantic heading hierarchy.
 */

import { evaluateAudit } from "./audit.mjs";

const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";

const target = process.argv.slice(2).find((a) => !a.startsWith("-"));
const jsonFlag = process.argv.includes("--json");
const minRaw = process.argv.find((a) => a.startsWith("--min="))?.split("=")[1];
const minScore = minRaw === undefined ? 0 : Number(minRaw);

if (process.argv.includes("--help") || process.argv.includes("-h") || !target) {
  console.log(`${BOLD}geo-audit${RESET} — Technical SEO & AI Search (GEO) Readiness CLI

${BOLD}Usage:${RESET}
  npx github:zaynelovecraft/geo-audit <https://example.com> [--json] [--min=80]

${BOLD}Options:${RESET}
  --json      Print results as JSON
  --min=<n>   Exit with code 1 if the score is below <n> (for CI)
`);
  process.exit(target ? 0 : 1);
}

if (!Number.isFinite(minScore) || minScore < 0 || minScore > 100) {
  console.error(`${RED}Invalid --min value: "${minRaw}". Expected a number between 0 and 100.${RESET}`);
  process.exit(1);
}

const url = new URL(target.startsWith("http") ? target : `https://${target}`);
const origin = url.origin;

async function safeText(u) {
  try {
    const res = await fetch(u, {
      headers: { "User-Agent": "geo-audit/0.2 (+https://github.com/zaynelovecraft/geo-audit)" },
      signal: AbortSignal.timeout(10_000),
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

const { score, checks } = evaluateAudit({
  html: page.text,
  robotsOk: robots.ok,
  robotsText: robots.text,
  llmsOk: llms.ok,
  llmsText: llms.text,
});

const belowMin = score < minScore;

if (jsonFlag) {
  console.log(JSON.stringify({ url: url.href, score, checks }, null, 2));
  process.exit(belowMin ? 1 : 0);
}

console.log(`\n${BOLD}GEO & Technical SEO Audit${RESET} — ${CYAN}${url.href}${RESET}\n`);
for (const c of checks) {
  const icon = c.passed ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
  const pts = `${DIM}[${c.points}/${c.maxPoints}]${RESET}`;
  console.log(`  ${icon} ${pts} ${BOLD}${c.name}${RESET} — ${DIM}${c.detail}${RESET}`);
}

const color = score >= 80 ? GREEN : score >= 55 ? YELLOW : RED;
console.log(`\n${BOLD}Overall GEO Score:${RESET} ${color}${BOLD}${score}/100${RESET}\n`);

if (belowMin) {
  console.error(`${RED}✗ Score ${score} is below the minimum of ${minScore}.${RESET}`);
  process.exit(1);
}
