import * as fs from "fs";
import * as path from "path";
import { debug, warn } from "../utils/logger";

interface Cache {
  lastPostId: string | null;
}

/**
 * Reads the cache file, returning the last scraped post ID or null.
 */
export function readCache(cacheFilePath: string): Cache {
  if (!fs.existsSync(cacheFilePath)) {
    return { lastPostId: null };
  }
  try {
    const raw = fs.readFileSync(cacheFilePath, "utf-8");
    return JSON.parse(raw) as Cache;
  } catch {
    warn("[cache] Failed to read cache, starting fresh.");
    return { lastPostId: null };
  }
}

/**
 * Writes the latest post ID to the cache file.
 * Should only be called after a fully successful run.
 */
export function writeCache(cacheFilePath: string, lastPostId: string): void {
  const dir = path.dirname(cacheFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const cache: Cache = { lastPostId };
  fs.writeFileSync(cacheFilePath, JSON.stringify(cache, null, 2), "utf-8");
  debug(`[cache] Saved lastPostId: ${lastPostId}`);
}
