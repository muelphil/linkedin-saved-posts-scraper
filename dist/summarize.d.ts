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
export declare function runSummarize(reenrich: boolean, writeTags: boolean, updateTitles: boolean, concurrency?: number): Promise<void>;
