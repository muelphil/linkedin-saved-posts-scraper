Here’s the updated README with the **global npm install removed** and replaced with the **working `npx github:muelphil/linkedin-saved-posts-scraper ...` workflow throughout**.

---

<!-- README.md -->

# linkedin-scraper

A CLI tool that scrapes your LinkedIn **saved posts** and converts them into [Obsidian](https://obsidian.md)-compatible Markdown files — complete with YAML frontmatter, image downloads, and optional AI-generated titles, summaries, and tags.

---

## What it does

LinkedIn offers no official export for saved posts. This tool automates a headless browser session to scroll through your saved posts page, parse each post, download attached images, and write a clean `.md` file per post — ready to drop into an Obsidian vault.

If you configure an OpenAI API key, the tool can enrich every post with:

* A **precise, human-readable title** (used as the filename)
* A **1–2 sentence summary** surfaced as an Obsidian callout block
* **1–4 content tags** (e.g. `#rag`, `#llm`, `#paper`) written into the frontmatter

Enrichment can run automatically during scraping, or separately on an entire folder of existing posts with the `summarize` command.

---

## Installation

### Recommended (no global install required)

You can run the tool directly using `npx` from GitHub:

```bash
npx github:muelphil/linkedin-saved-posts-scraper init
```

This will automatically download, compile, and run the CLI without installing anything globally.

All commands are available via the same pattern:

```bash
# 1. First-time setup
npx github:muelphil/linkedin-saved-posts-scraper init
# 2. Scrape your saved posts
npx github:muelphil/linkedin-saved-posts-scraper scrape
# 3. (Optional) AI-enrich posts without re-scraping
npx github:muelphil/linkedin-saved-posts-scraper summarize
```

---

### For local development (after `git clone`)

```bash
git clone https://github.com/muelphil/linkedin-saved-posts-scraper.git
cd linkedin-saved-posts-scraper
npm install
npm run build
```

Run commands locally:

```bash
npm run dev init
npm run dev scrape
```

Or directly via ts-node:

```bash
npx ts-node src/cli.ts init
npx ts-node src/cli.ts scrape
```

---

## Commands

### `init` — Interactive setup wizard

```bash
npx github:muelphil/linkedin-saved-posts-scraper init
```

Sets up configuration, authentication, and optional AI enrichment.

---

### `auth` — Re-authenticate

```bash
npx github:muelphil/linkedin-saved-posts-scraper auth
```

Opens a browser for manual LinkedIn login and stores session cookies.

---

### `scrape` — Scrape saved posts

```bash
npx github:muelphil/linkedin-saved-posts-scraper scrape
```

Runs the full scraping pipeline.

---

### `summarize` — AI-enrich existing posts

```bash
npx github:muelphil/linkedin-saved-posts-scraper summarize
```

Enriches existing markdown files without re-scraping LinkedIn.

---

## Configuration

All configuration lives in `~/.linkedin-scraper/config.json`.

| Setting           | Description                             |
| ----------------- | --------------------------------------- |
| `postsOutputDir`  | Directory where `.md` files are written |
| `imagesOutputDir` | Directory where images are saved        |
| `cacheDir`        | Stores scraping progress                |
| `openaiApiKey`    | Encrypted OpenAI API key                |
| `openaiEndpoint`  | Optional custom endpoint                |
| `openaiModel`     | Model used for enrichment               |

---

## Output format

Each post becomes a Markdown file with YAML frontmatter and optional AI enrichment.

```markdown
---
title: "Understanding RAG Pipelines for Production"
source: "https://www.linkedin.com/feed/update/urn:li:activity:..."
author: "Jane Smith"
timestamp: 2024-11-03T00:00:00.000Z
tags:
  - "#linkedin"
  - "#rag"
summary: "Jane walks through production RAG patterns..."
---

> [!summary]
> Jane walks through production RAG patterns...

![[image.avif]]

<post content>
```

---

## Requirements

* Node.js 20+
* npm 8+
* LinkedIn account
* (Optional) OpenAI API key
* (Optional) ffmpeg for AVIF conversion