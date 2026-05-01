import {JSDOM} from "jsdom";
import * as fs from "fs";
import * as path from "path";
import { spinner, log, outro } from "@clack/prompts";
import { config } from "./config";
import { launchContext } from "./browser/context";
import { collectSavedPostsHtml } from "./browser/navigator";
import { extractPostIds, parsePostsFromContainers } from "./parser/postParser";
import { parseMarkdownPost } from "./parser/markdownParser";
import { relativeToAbsolute } from "./utils/time";
import { readCache, writeCache } from "./storage/cache";
import { writePosts } from "./storage/fileWriter";
import { Post } from "./types";

/**
 * Collects all post_id values from existing Markdown files in a directory.
 * Used as a cache fallback when no cache.json exists yet.
 */
function loadKnownPostIds(postsDir: string): Set<string> {
  const ids = new Set<string>();
  if (!fs.existsSync(postsDir)) return ids;
  for (const file of fs.readdirSync(postsDir)) {
    if (!file.endsWith(".md")) continue;
    try {
      const content = fs.readFileSync(path.join(postsDir, file), "utf-8");
      const parsed = parseMarkdownPost(content);
      if (parsed?.postId) ids.add(parsed.postId);
    } catch {
      // skip unreadable files
    }
  }
  return ids;
}

/**
 * Main scraping pipeline.
 */
export async function run(): Promise<void> {
  // 1. Load cache — fall back to scanning existing files
  const cache = readCache(config.cacheFilePath);
  let stopPostIds: Set<string>;

  if (cache.lastPostId) {
    stopPostIds = new Set([cache.lastPostId]);
    log.info(`Last scraped post: ${cache.lastPostId}`);
  } else {
    stopPostIds = loadKnownPostIds(config.postsOutputDir);
    if (stopPostIds.size > 0) {
      log.info(`No cache found — using ${stopPostIds.size} existing post ID${stopPostIds.size === 1 ? "" : "s"} as stop markers.`);
    } else {
      log.info("No cache and no existing posts — will scrape everything.");
    }
  }

  // 2. Launch browser
  const handle = await launchContext(config.authStatePath, true);

  let posts: Post[] = [];

  try {
    // 3. Scroll & collect DOM
    const s = spinner({
      frames: ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'],
    });
    s.start("Navigating to saved posts…");

    const html = await collectSavedPostsHtml(
      handle.context,
      config.linkedinSavedUrl,
      stopPostIds,
      config.maxScrollIterations,
      config.scrollDelayMin,
      config.scrollDelayMax,
      (count, iteration, max) => {
        s.message(`Scrolling saved posts… ${count} visible (scroll ${iteration}/${max})`);
      }
    );

    s.stop("Finished scrolling.");

    // 4. Extract all post IDs and find cutoff (first ID already known)
    const postIds = extractPostIds(html);
    const cutoffIndex = postIds.findIndex((id) => stopPostIds.has(id));

    const dom = new JSDOM(html);
    const containers = Array.from(dom.window.document.querySelectorAll("[data-chameleon-result-urn]"));

    posts = parsePostsFromContainers(
      cutoffIndex > -1 ? containers.slice(0, cutoffIndex) : containers
    );

    if (posts.length === 0) {
      log.info("No new posts found.");
      outro("Nothing to do.");
      return;
    }

    log.step(`${posts.length} new post${posts.length === 1 ? "" : "s"} to process.`);

    // 5. Resolve absolute timestamps
    posts = posts.map((p) => ({
      ...p,
      timestamp: { ...p.timestamp, absolute: relativeToAbsolute(p.timestamp.relative) },
    }));

    // 6. Write markdown + images
    const ws = spinner({
      frames: ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏']
    });
    ws.start(`Writing ${posts.length} file${posts.length === 1 ? "" : "s"}…`);
    let written = 0;
    await writePosts(
      posts,
      config.postsOutputDir,
      config.imagesOutputDir,
      () => { written++; ws.message(`Writing files… ${written}/${posts.length}`); },
    );
    ws.stop(`Wrote ${written} file${written === 1 ? "" : "s"}.`);

    // 7. Refresh auth state
    await handle.saveState();

  } finally {
    await handle.close();
  }

  // 8. Update cache (only after successful write)
  if (posts.length > 0) {
    writeCache(config.cacheFilePath, posts[0].postId);
  }

  outro(`Done — ${posts.length} post${posts.length === 1 ? "" : "s"} scraped.`);
}
