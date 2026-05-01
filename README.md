# linkedin-scraper

A CLI tool that scrapes your LinkedIn **saved posts** and converts them into [Obsidian](https://obsidian.md)-compatible Markdown files — complete with YAML frontmatter, image downloads, and optional AI-generated titles, summaries, and tags.

---

## What it does

LinkedIn offers no official export for saved posts. This tool automates a headless browser session to scroll through your saved posts page, parse each post, download attached images, and write a clean `.md` file per post — ready to drop into an Obsidian vault.

If you configure an OpenAI API key, the tool can enrich every post with:
- A **precise, human-readable title** (used as the filename)
- A **1–2 sentence summary** surfaced as an Obsidian callout block
- **1–4 content tags** (e.g. `#rag`, `#llm`, `#paper`) written into the frontmatter

Enrichment can run automatically during scraping, or separately on an entire folder of existing posts with the `summarize` command.

---

## Installation

### From GitHub (recommended)

```bash
npm install -g github:muelphil/linkedin-saved-posts-scraper
```

This compiles the TypeScript and registers the `linkedin-scraper` binary globally. After that, all four commands are available system-wide:

```bash
linkedin-saved-posts-scraper init
linkedin-saved-posts-scraper auth
linkedin-saved-posts-scraper scrape
linkedin-saved-posts-scraper summarize
```

### For local development (after `git clone`)

```bash
git clone https://github.com/muelphil/linkedin-scraper.git
cd linkedin-saved-posts-scraper
npm install
npm run build
```

To use the commands via `npx` without a global install, link the package locally:

```bash
npm link
```

This registers the `linkedin-scraper` binary from your local checkout into your system PATH, so you can run `linkedin-scraper init` (and all other commands) directly. To unlink later:

```bash
npm unlink -g linkedin-scraper
```

Alternatively, run commands directly without linking:

```bash
npx ts-node src/cli.ts init
npx ts-node src/cli.ts scrape
```

---

## Quick start

```bash
# 1. First-time setup
linkedin-saved-posts-scraper init

# 2. Scrape your saved posts
linkedin-saved-posts-scraper scrape

# 3. (Optional) AI-enrich posts without re-scraping
linkedin-saved-posts-scraper summarize
```

---

## Commands

### `init` — Interactive setup wizard

Sets up all configuration interactively. Run this first, or any time you want to update your settings.

```bash
linkedin-saved-posts-scraper init
```

**What it does:**

1. **Authentication** — Checks whether a LinkedIn session is already saved.
   - If a session exists: asks whether to keep it or re-authenticate.
   - If no session exists: authentication is mandatory — opens a visible browser window for you to log in manually.

2. **Configures the 6 settings** one by one (see [Configuration](#configuration) below):
   - Posts output directory
   - Images output directory
   - Cache directory
   - OpenAI API key *(masked input, stored encrypted)*
   - OpenAI API endpoint *(optional)*
   - OpenAI model

3. **Optional customization** — offers to open two files in your system's default editor:
   - `~/.linkedin-scraper/system_prompt.md` — the AI system prompt (created with defaults on first open)
   - `~/.linkedin-scraper/post.hbs` — the Markdown output template (copied from bundled default on first open)

   The wizard waits for you to finish editing and press Enter before continuing, so changes take effect in the same session.

**Pressing Enter** on any prompt keeps the current value (shown dimmed). **Ctrl+C** cancels cleanly at any point.

---

### `auth` — Re-authenticate

Opens a visible Chromium browser and navigates to the LinkedIn login page. Log in manually; the tool waits for the feed to appear, then saves the session and closes the browser.

```bash
linkedin-saved-posts-scraper auth
```

The session is saved to `~/.linkedin-scraper/auth.json`. You typically only need to re-run this when LinkedIn rotates or invalidates your cookies.

---

### `scrape` — Scrape saved posts

Runs the full scraping pipeline headlessly.

```bash
linkedin-saved-posts-scraper scrape
```

**Pipeline:**

1. Reads `cache.json` from the configured cache directory to find the last scraped post ID.
2. Opens a headless Chromium browser with your saved session.
3. Scrolls through `linkedin.com/my-items/saved-posts/`, stopping as soon as it sees the last known post (incremental) or after a configurable scroll limit.
4. Parses each new post: author, content, timestamp, media URL.
5. Resolves relative timestamps (e.g. `"4d"`, `"2w"`) to absolute ISO dates.
6. If an OpenAI API key is configured, enriches each post with an AI-generated title, summary, and tags.
7. Downloads attached images into the images output directory. If `ffmpeg` is available, converts them to AVIF (smaller, better quality).
8. Writes one `.md` file per post into the posts output directory.
9. Saves the newest post ID to `cache.json` so the next run is incremental.

---

### `summarize` — AI-enrich existing posts

Reads all `.md` files in the posts output directory and runs OpenAI enrichment on them. Does **not** require a browser or LinkedIn session. After enriching a file it also renames it to match the (new) frontmatter `title:` — keeping your vault clean without any extra steps.

```bash
linkedin-saved-posts-scraper summarize
```

**Flags:**

| Flag | Effect |
|------|--------|
| *(none)* | Enriches files that don't yet have a `summary:` field; renames them if their original title was an auto-generated post ID |
| `--reenrich` | Re-enriches all files, replacing existing titles, summaries, and tags |
| `--keep-tags` | Enriches but leaves the `tags:` block in the frontmatter untouched |
| `--update-titles` | Syncs ALL filenames to their current frontmatter title, including already-enriched files whose filename is out of sync |
| `--concurrency <n>` | Number of parallel OpenAI requests (default: `5`) |

**Filename sync behaviour:**

- After a file is enriched the filename is updated to match the new `title:` — but only if the original title was an auto-generated post ID (i.e. the user hasn't customised it).
- For files that were *skipped* (already have a summary), no rename occurs unless `--update-titles` is passed.
- Use `--update-titles` to bulk-sync filenames after enrichment ran without it.
- Re-running is safe and idempotent: if the filename already matches the title no rename occurs.
- Rename conflicts are resolved automatically by appending ` (1)`, ` (2)`, etc.

**Write-back is surgical** — only the `title:`, `summary:`, and `tags:` fields are touched. Any properties you added to the frontmatter manually (e.g. `rating:`, `read:`) are preserved verbatim. The post content and image embed are never modified.

---

## Configuration

All configuration lives in `~/.linkedin-scraper/config.json`. Run `linkedin-saved-posts-scraper init` to set values interactively. The file is never meant to be edited by hand.

| Setting | Description |
|---------|-------------|
| `postsOutputDir` | Directory where `.md` files are written |
| `imagesOutputDir` | Directory where downloaded images are saved |
| `cacheDir` | Directory holding `cache.json` (tracks the last scraped post ID) |
| `openaiApiKey` | Your OpenAI API key — stored **AES-256-CBC encrypted**, never plain text |
| `openaiEndpoint` | Custom API endpoint (optional — leave blank to use `api.openai.com`) |
| `openaiModel` | Model to use for enrichment (default: `gpt-4o-mini`) |

The LinkedIn session is stored separately in `~/.linkedin-scraper/auth.json` as a Playwright storage state (cookies + localStorage).

### API key security

The OpenAI API key is encrypted using AES-256-CBC before being written to disk. The encryption key is derived from a hash of your machine's hostname, username, and OS platform — meaning the ciphertext is specific to your machine and cannot be decrypted on a different device. It is never stored in plain text anywhere on disk.

---

## Output format

Each post produces a single `.md` file with Obsidian-compatible YAML frontmatter:

```markdown
---
title: "Understanding RAG Pipelines for Production"
source: "https://www.linkedin.com/feed/update/urn:li:activity:..."
author: "Jane Smith"
author_url: "https://www.linkedin.com/in/janesmith"
timestamp: 2024-11-03T00:00:00.000Z
tags:
  - "#linkedin"
  - "#rag"
  - "#llm"
image: "7301234567890.avif"
summary: "Jane walks through production RAG patterns, covering chunking strategies and retrieval evaluation. Relevant for understanding practical trade-offs in RAG system design."
---
> [!summary]
> Jane walks through production RAG patterns, covering chunking strategies and retrieval
> evaluation. Relevant for understanding practical trade-offs in RAG system design.

![[7301234567890.avif]]

<post content>
```

- **Filename**: derived from the AI-generated title (slugified). Falls back to `{Author Name} - {postId[-8:]}` if enrichment is unavailable.
- **Filename conflicts**: automatically resolved by appending ` (1)`, ` (2)`, etc.
- **`#` in post content**: escaped to `\#` so Obsidian doesn't interpret hashtags as headings.
- **Image embed**: Obsidian wikilink style (`![[filename]]`) — Obsidian resolves these globally within the vault.
- **Callout block**: rendered as an Obsidian `[!summary]` callout, only present when enrichment ran.

---

## Customizing the post template

The Markdown template used to render each post is a [Handlebars](https://handlebarsjs.com/) file. By default the bundled `dist/templates/post.hbs` is used. To customize it:

1. Run `linkedin-saved-posts-scraper init` and choose **"Open post.hbs template for editing?"**, or
2. Copy the template manually and edit it:

```bash
# First copy the bundled template
cp $(npm root -g)/linkedin-scraper/dist/templates/post.hbs ~/.linkedin-scraper/post.hbs
# Then edit as desired
$EDITOR ~/.linkedin-scraper/post.hbs
```

Once `~/.linkedin-scraper/post.hbs` exists, it takes precedence over the bundled template on every run. Available template variables:

| Variable | Description |
|----------|-------------|
| `postId` | Unique LinkedIn activity ID |
| `postUrl` | Full URL of the post |
| `author.name` | Author display name |
| `author.url` | Author profile URL |
| `timestamp.absolute` | ISO 8601 timestamp |
| `content` | Post text (`#` escaped to `\#`) |
| `mediaFilename` | Filename of the downloaded image (with extension) |
| `enrichment.title` | AI-generated title |
| `enrichment.summary` | AI-generated summary |
| `enrichment.tags` | Array of tag strings (e.g. `["#rag", "#llm"]`) |

---

If `ffmpeg` is available on your `PATH`, downloaded images are automatically converted to AVIF format using `libaom-av1` (CRF 30, still-picture mode) and the original file is deleted. AVIF typically achieves significantly smaller file sizes than JPEG at equivalent quality.

If `ffmpeg` is not found, a one-time warning is printed and images are kept in their original format.

---

## AI enrichment details

Enrichment uses the OpenAI Chat API with structured JSON output (`response_format: json_schema`) to guarantee parseable responses.

### System prompt

The AI system prompt lives in `~/.linkedin-scraper/system_prompt.md`. On first use (or via `linkedin-saved-posts-scraper init`), this file is created with sensible defaults tailored to a research context (LLMs, RAG, visualization, didactics). **You can edit this file freely** — every enrichment call reads it fresh, so changes take effect on the next run. The file contains only the system instructions; post content is always appended separately as a user message.

To edit your system prompt at any time without running `init`, open the file directly:

```bash
# Windows
notepad %USERPROFILE%\.linkedin-scraper\system_prompt.md

# macOS
open ~/.linkedin-scraper/system_prompt.md

# Linux
$EDITOR ~/.linkedin-scraper/system_prompt.md
```

The default prompt instructs the model to:

- Generate a **title** ≤ 80 characters using concrete identifiers when available (model names, paper names, tool names)
- Write a **summary** of 1–2 sentences describing the content, optionally with a relevance note
- Assign **1–4 tags** only when directly evidenced by the post content — never inferred loosely
- Always include `#paper` for posts that describe scientific papers

The `#linkedin` tag is always present in the frontmatter regardless of enrichment.

---

## Requirements

- **Node.js** 20+ (tested on Node 24)
- **npm** 8+
- A LinkedIn account with saved posts
- *(Optional)* OpenAI API key for enrichment
- *(Optional)* `ffmpeg` on PATH for AVIF conversion

Playwright downloads a Chromium browser automatically on first install.

---

## Development

```bash
git clone https://github.com/muelphil/linkedin-scraper.git
cd linkedin-scraper/linkedin
npm install
npm run build          # compile TypeScript → dist/
npm run dev            # run CLI with ts-node (no build needed)
npm run test:parser    # smoke-test the HTML parser (must yield 10 posts)
```

### Project structure

```
src/
  cli.ts                  Entry point — Commander command definitions
  config.ts               Loads config from configStore
  config/
    configStore.ts        Read/write ~/.linkedin-scraper/config.json + AES encryption
  cli/
    init.ts               Interactive init wizard (@clack/prompts)
  browser/
    context.ts            Playwright browser launch + auth helper
    navigator.ts          Scroll & collect saved posts page
  parser/
    postParser.ts         HTML → Post (JSDOM)
    markdownParser.ts     .md → ParsedMarkdownPost (regex, for summarize)
    selectors.ts          All LinkedIn CSS selectors (single source of truth)
  enrichment/
    openai.ts             OpenAI chat completions (title + summary + tags)
    prompt.ts             System prompt helpers (file-based, editable)
  storage/
    cache.ts              Read/write cache.json (lastPostId)
    fileWriter.ts         Download images, AVIF conversion, render .md
  templates/
    post.hbs              Handlebars template for .md output
  utils/
    ffmpeg.ts             ffmpeg availability check + AVIF conversion
    slug.ts               Filename sanitization + conflict resolution
    time.ts               Relative → absolute timestamp conversion
  types.ts                Post type definition
```

User config files (created at runtime in `~/.linkedin-scraper/`):

```
~/.linkedin-scraper/
  config.json             Encrypted configuration (managed by init)
  auth.json               LinkedIn session (cookies / localStorage)
  system_prompt.md        Editable AI system prompt
  post.hbs                User-customized post template (overrides bundled)
```
