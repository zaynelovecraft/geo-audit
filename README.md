# geo-audit 🔍

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Case Study](https://img.shields.io/badge/Case_Study-zaynelovecraft.com-6366f1)](https://www.zaynelovecraft.com/work/geo-audit)
[![Article](https://img.shields.io/badge/Deep_Dive-Read_Post-10b981)](https://www.zaynelovecraft.com/articles/generative-engine-optimization-geo-audit-nextjs-cwv)

A zero-dependency CLI that scores any live URL out of 100 for **technical SEO** and **Generative Engine Optimization (GEO)**: title and meta, canonical, heading structure, JSON-LD, whether AI crawlers (`GPTBot`, `ClaudeBot`, `PerplexityBot`) are allowed, and `/llms.txt`.

> 📖 **Engineering write-up:** [Generative Engine Optimization (GEO) & CWV Gates in Next.js](https://www.zaynelovecraft.com/articles/generative-engine-optimization-geo-audit-nextjs-cwv)

## Requirements

- Node.js 18 or newer. Nothing else to install.

## Quick start

```bash
npx -y github:zaynelovecraft/geo-audit https://www.zaynelovecraft.com
```

Real output:

```text
GEO & Technical SEO Audit — https://www.zaynelovecraft.com/

  ✓ [10/10] Title tag (15-65 chars) — "Zayne Lovecraft | Full-Stack Engineer, AI & Technical SEO" (57c)
  ✓ [10/10] Meta description (50-165 chars) — 145 chars
  ✓ [10/10] Canonical link tag — https://www.zaynelovecraft.com
  ✓ [15/15] Single semantic <h1> — Found 1 <h1> tag(s)
  ✓ [10/10] Semantic HTML5 landmarks (<main>, <article>) — main=true, article/section=true
  ✓ [20/20] JSON-LD structured data — Types: Person, WebSite
  ✓ [15/15] robots.txt allows AI citation crawlers — GPTBot / ClaudeBot / PerplexityBot allowed
  ✓ [10/10] /llms.txt machine-readable index — Present (8820 bytes)

Overall GEO Score: 100/100
```

You can pass a bare domain too: `npx -y github:zaynelovecraft/geo-audit example.com`.

## Options

| Flag | What it does |
|------|--------------|
| `--json` | Print the score and every check as JSON (good for scripts and coding agents) |
| `--min=<n>` | Exit with code `1` if the score is below `n` |

## What it checks

| Check | Points | Why it matters |
|-------|--------|----------------|
| Title tag, 15–65 characters | 10 | Avoids truncated titles in search results |
| Meta description, 50–165 characters | 10 | Controls the snippet shown in results |
| Canonical link | 10 | Prevents duplicate URLs competing with each other |
| Exactly one `<h1>` | 15 | Clear page topic for crawlers and content extractors |
| `<main>` plus `<article>` or `<section>` | 10 | Lets parsers find the real content |
| JSON-LD structured data | 20 | Declares who/what the page is about (`Person`, `Organization`, `Article`, ...) |
| `robots.txt` doesn't block AI crawlers | 15 | Lets ChatGPT, Claude and Perplexity read and cite you |
| `/llms.txt` exists | 10 | A plain-text map of your site for AI tools |

It checks the single URL you pass, plus that site's `/robots.txt` and `/llms.txt`. It reads raw HTML and doesn't run JavaScript, so content rendered only in the browser won't be seen (most crawlers behave the same way).

## Use it in CI

```yaml
# .github/workflows/seo.yml
name: SEO check
on: [deployment_status]
jobs:
  geo-audit:
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npx -y github:zaynelovecraft/geo-audit "${{ github.event.deployment_status.target_url }}" --min=80
```

## License

MIT
