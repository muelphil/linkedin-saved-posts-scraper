import { BrowserContext } from "playwright";
/**
 * Navigates to the LinkedIn saved posts page and scrolls until:
 * - Any ID from `stopPostIds` is found in the DOM, OR
 * - No new content loads after a scroll, OR
 * - `maxIterations` scrolls have been performed.
 *
 * Returns the full page HTML after scrolling.
 *
 * @param onProgress - Optional callback invoked after each scroll with the current
 *                     post count, iteration index, and max iterations.
 */
export declare function collectSavedPostsHtml(context: BrowserContext, savedUrl: string, stopPostIds: Set<string>, maxIterations: number, scrollDelayMin: number, scrollDelayMax: number, onProgress?: (count: number, iteration: number, max: number) => void): Promise<string>;
