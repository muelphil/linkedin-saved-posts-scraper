interface Cache {
    lastPostId: string | null;
}
/**
 * Reads the cache file, returning the last scraped post ID or null.
 */
export declare function readCache(cacheFilePath: string): Cache;
/**
 * Writes the latest post ID to the cache file.
 * Should only be called after a fully successful run.
 */
export declare function writeCache(cacheFilePath: string, lastPostId: string): void;
export {};
