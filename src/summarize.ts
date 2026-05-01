import * as fs from "fs";
import * as path from "path";
import {config} from "./config";
import {parseMarkdownPost, hasSummary, escapeForYaml, renderFrontmatter, ParsedMarkdownPost} from "./parser/markdownParser";
import {enrichPost, EnrichmentResult} from "./enrichment/openai";
import {toSlug} from "./utils/slug";
import {Post} from "./types";
import {spinner, log, outro} from "@clack/prompts";

// ---------------------------------------------------------------------------
// Filename helpers
// ---------------------------------------------------------------------------

/** Returns true when `title` is a raw LinkedIn post ID (15+ digit number). */
function isPostId(title: string): boolean {
    return /^\d{15,}$/.test(title.trim());
}

/**
 * Resolves the first available path for `{dir}/{base}{ext}`, skipping the
 * source file itself so a file can be renamed without generating a spurious
 * ` (1)` suffix on re-runs.
 */
function resolveTarget(
    dir: string,
    base: string,
    ext: string,
    currentPath: string
): string {
    const candidate = (suffix: string) => path.join(dir, `${base}${suffix}${ext}`);
    const isFree = (p: string) =>
        !fs.existsSync(p) || path.resolve(p) === path.resolve(currentPath);

    if (isFree(candidate(""))) return candidate("");
    for (let i = 1; ; i++) {
        const p = candidate(` (${i})`);
        if (isFree(p)) return p;
    }
}

/**
 * Renames `filePath` so its filename matches `toSlug(title)`.
 * Returns the new path if a rename happened, or null if already correct / skipped.
 */
function syncFilename(filePath: string, title: string): string | null {
    const expectedBase = toSlug(title);
    if (!expectedBase) return null;

    const dir = path.dirname(filePath);
    const currentBase = path.basename(filePath, ".md");

    const exactMatch = currentBase === expectedBase;
    if (exactMatch) return null;

    const newPath = resolveTarget(dir, expectedBase, ".md", filePath);

    // Two-step rename for case-only changes on case-insensitive filesystems (Windows/macOS)
    const caseOnly = currentBase.toLowerCase() === expectedBase.toLowerCase();
    if (caseOnly) {
        const tmp = filePath + "._rename_tmp";
        fs.renameSync(filePath, tmp);
        fs.renameSync(tmp, newPath);
    } else {
        fs.renameSync(filePath, newPath);
    }

    return newPath;
}

// ---------------------------------------------------------------------------
// Surgical write-back
// ---------------------------------------------------------------------------

/**
 * Writes enrichment results back into a Markdown file.
 *
 * Uses renderFrontmatter for canonical YAML reconstruction — preserves all
 * user-added frontmatter fields. Tags are replaced only when writeTags=true.
 * The `> [!summary]` callout is prepended to the body (replacing any existing callout).
 */
function writeBackEnrichment(
    filePath: string,
    parsed: ParsedMarkdownPost,
    enrichment: EnrichmentResult,
    writeTags: boolean
): void {
    const tagUpdates = writeTags
        ? { tags: ["#linkedin", ...enrichment.tags.filter((t) => t !== "#linkedin")] }
        : {};

    const yaml = renderFrontmatter(parsed.data, {
        title: enrichment.title,
        summary: enrichment.summary,
        ...tagUpdates,
    });

    // Body: strip any existing callout (everything before ![[...]]), then prepend new one
    const imageLineIdx = parsed.rawBody.search(/!\[\[.*?\]\]/);
    const bodyFromImage =
        imageLineIdx >= 0 ? parsed.rawBody.substring(imageLineIdx) : parsed.rawBody;

    const newBody = `\n> [!summary]\n> ${escapeForYaml(enrichment.summary)}\n\n${bodyFromImage}`;

    fs.writeFileSync(filePath, `---\n${yaml}\n---\n${newBody}`, "utf-8");
}

// ---------------------------------------------------------------------------
// Concurrency helper
// ---------------------------------------------------------------------------

/**
 * Runs `fn` over `items` with at most `concurrency` simultaneous calls.
 * Failures inside `fn` are the responsibility of the caller (use try/catch).
 */
async function runPool<T>(
    items: T[],
    concurrency: number,
    fn: (item: T, index: number) => Promise<void>
): Promise<void> {
    let i = 0;

    async function worker() {
        while (i < items.length) {
            const idx = i++;
            await fn(items[idx], idx);
        }
    }

    const slots = Math.min(concurrency, items.length);
    if (slots > 0) await Promise.all(Array.from({length: slots}, worker));
}

// ---------------------------------------------------------------------------
// File job type
// ---------------------------------------------------------------------------

interface FileJob {
    filePath: string;
    parsed: ParsedMarkdownPost;
    /** Frontmatter title captured before any enrichment mutates it. */
    originalTitle: string;
    /** Filename base (without .md) captured before any rename. */
    filenameBase: string;
    needsEnrichment: boolean;
    enrichmentResult: EnrichmentResult | null;
    enrichmentFailed: boolean;
}

// ---------------------------------------------------------------------------
// Main orchestration
// ---------------------------------------------------------------------------

/**
 * Reads all .md files in postsOutputDir and enriches them via OpenAI.
 * Runs enrichment concurrently (up to `concurrency` simultaneous requests),
 * then applies write-back and renames sequentially.
 *
 * @param reenrich    Re-enrich files that were already enriched in a previous run.
 * @param writeTags   When false, the tags block in the frontmatter is left untouched.
 * @param updateTitles When true, syncs ALL filenames to their current frontmatter title.
 *                    When false (default), only renames files that were just enriched
 *                    AND whose original frontmatter title was an auto-generated post ID.
 * @param concurrency Maximum number of simultaneous OpenAI requests (default 5).
 */
export async function runSummarize(
    reenrich: boolean,
    writeTags: boolean,
    updateTitles: boolean,
    concurrency: number = 5
): Promise<void> {
    const {postsOutputDir, openaiApiKey, openaiModel, openaiEndpoint} = config;

    if (!openaiApiKey) {
        log.error("OpenAI API key is not configured. Run `linkedin-scraper init` to set it up.");
        process.exit(1);
    }

    const files = fs
        .readdirSync(postsOutputDir)
        .filter((f) => f.endsWith(".md"))
        .sort()
        .map((f) => path.join(postsOutputDir, f));

    if (files.length === 0) {
        log.warn(`No Markdown files found in ${postsOutputDir}`);
        return;
    }

    // --- Phase 1: Parse all files and build job list ---
    const jobs: FileJob[] = [];
    let parseFailures = 0;

    for (const filePath of files) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed = parseMarkdownPost(raw);
        if (!parsed) {
            log.warn(`Could not parse ${path.basename(filePath)} — skipping.`);
            parseFailures++;
            continue;
        }
        jobs.push({
            filePath,
            parsed,
            originalTitle: parsed.title,
            filenameBase: path.basename(filePath, ".md"),
            needsEnrichment: !hasSummary(parsed) || reenrich,
            enrichmentResult: null,
            enrichmentFailed: false,
        });
    }

    const toEnrich = jobs.filter((j) => j.needsEnrichment);
    const toSkip = jobs.filter((j) => !j.needsEnrichment);

    log.info(
        `${jobs.length} file${jobs.length === 1 ? "" : "s"} found — ` +
        `${toEnrich.length} to enrich, ${toSkip.length} to skip.`
    );

    // --- Phase 2: Concurrent enrichment ---
    if (toEnrich.length > 0) {
        const s = spinner({
            frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
        });
        s.start(`Summarizing Post Content… 0/${toEnrich.length}`);
        let done = 0;

        await runPool(toEnrich, Math.max(1, concurrency), async (job) => {
            try {
                const stub: Post = {
                    postId: "",
                    postUrl: "",
                    author: {name: job.parsed.author, url: job.parsed.authorUrl},
                    timestamp: {relative: "", absolute: job.parsed.timestamp},
                    content: job.parsed.content.replace(/\\#/g, "#"),
                };
                job.enrichmentResult = await enrichPost(stub, openaiApiKey, openaiModel, openaiEndpoint);
                if (!job.enrichmentResult) job.enrichmentFailed = true;
            } catch {
                job.enrichmentFailed = true;
            }
            s.message(`Summarizing Post Content… ${++done}/${toEnrich.length}`);
        });

        s.stop(`Enrichment complete.`);
    }

    // --- Phase 3: Sequential write-back + rename ---
    let enriched = 0;
    let skipped = 0;
    let renamed = 0;
    let failed = parseFailures;
    const renameLog: string[] = [];
    const failLog: string[] = [];

    for (const job of jobs) {
        let currentFilePath = job.filePath;
        let currentTitle = job.parsed.title;
        let enrichmentRan = false;

        if (job.needsEnrichment) {
            if (job.enrichmentFailed || !job.enrichmentResult) {
                failLog.push(path.basename(job.filePath));
                failed++;
                continue;
            }
            try {
                writeBackEnrichment(currentFilePath, job.parsed, job.enrichmentResult, writeTags);
                currentTitle = job.enrichmentResult.title;
                enrichmentRan = true;
                enriched++;
            } catch (err) {
                failLog.push(`${path.basename(job.filePath)} (write error: ${(err as Error).message})`);
                failed++;
                continue;
            }
        } else {
            skipped++;
        }

        // Rename: always when --update-titles; otherwise only for newly enriched files
        // whose original title was an auto-generated post ID (user hasn't customised it).
        const shouldRename = updateTitles || (enrichmentRan && isPostId(job.originalTitle));

        if (shouldRename) {
            try {
                const newPath = syncFilename(currentFilePath, currentTitle);
                if (newPath) {
                    const from = path.basename(currentFilePath, ".md");
                    const to = path.basename(newPath, ".md");
                    renameLog.push(`${from}  →  ${to}`);
                    renamed++;
                }
            } catch (err) {
                failLog.push(`${path.basename(currentFilePath)} (rename error: ${(err as Error).message})`);
            }
        }
    }

    // Log notable events
    for (const msg of renameLog) log.info(msg);
    for (const msg of failLog) log.warn(`Failed: ${msg}`);

    const parts: string[] = [
        `enriched: ${enriched}`,
        `skipped: ${skipped}`,
        renamed > 0 ? `renamed: ${renamed}` : "",
        failed > 0 ? `failed: ${failed}` : "",
    ].filter(Boolean);

    outro(`Done — ${parts.join(", ")}.`);
}

