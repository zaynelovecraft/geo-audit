# geo-audit 🔍

Zero-dependency CLI auditor for **Technical SEO** and **Generative Engine Optimization (GEO)** — scores any URL out of 100 on JSON-LD entity graphs, AI crawler directives (`GPTBot`, `ClaudeBot`, `PerplexityBot`), `/llms.txt`, canonical tags, and semantic HTML5 landmarks.

```text
$ npx github:zaynelovecraft/geo-audit https://zaynelovecraft.com

GEO & Technical SEO Audit — https://zaynelovecraft.com/

  ✓ [10/10] Title tag (15-65 chars) — "Zayne Lovecraft — Software Engineer" (35c)
  ✓ [10/10] Meta description (50-165 chars) — 142 chars
  ✓ [10/10] Canonical link tag — https://www.zaynelovecraft.com
  ✓ [15/15] Single semantic <h1> — Found 1 <h1> tag(s)
  ✓ [10/10] Semantic HTML5 landmarks (<main>, <article>) — main=true, article/section=true
  ✓ [20/20] JSON-LD structured data — Types: Person, WebSite
  ✓ [15/15] robots.txt allows AI citation crawlers — GPTBot / ClaudeBot / PerplexityBot allowed
  ✗ [0/10]  /llms.txt machine-readable index — Not found (/llms.txt)

Overall GEO Score: 90/100
```

## What It Checks

| Signal | Weight | Why it matters for AI / Search |
|--------|--------|--------------------------------|
| **JSON-LD (`@graph`)** | 20 pts | Grounds entity relationships (`Person`, `Organization`, `SoftwareApplication`, `FAQPage`) for LLMs and Google Rich Results |
| **Single `<h1>` + Landmarks** | 25 pts | Clean DOM extraction for RAG chunkers and readability parsers |
| **AI Crawler Access (`robots.txt`)** | 15 pts | Ensures `OAI-SearchBot`, `ClaudeBot`, and `PerplexityBot` aren't accidentally blocked |
| **Title, Meta & Canonical** | 30 pts | Prevents duplicate indexing and truncation in SERP snippets |
| **`/llms.txt`** | 10 pts | Gives coding agents and answer engines a clean Markdown map of your site |

## Usage

```bash
# Terminal summary
npx github:zaynelovecraft/geo-audit https://example.com

# Machine-readable JSON output for CI or coding agents
npx github:zaynelovecraft/geo-audit https://example.com --json
```

## License

MIT
