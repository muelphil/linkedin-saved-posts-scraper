import { BrowserContext, Page } from "playwright";

/** Returns a random delay in milliseconds between min and max. */
function randomDelay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
export async function collectSavedPostsHtml(
  context: BrowserContext,
  savedUrl: string,
  stopPostIds: Set<string>,
  maxIterations: number,
  scrollDelayMin: number,
  scrollDelayMax: number,
  onProgress?: (count: number, iteration: number, max: number) => void
): Promise<string> {
  const page = await context.newPage();

  try {
    await page.goto(savedUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });

    // Check for login redirect
    if (page.url().includes("/login") || page.url().includes("/authwall")) {
      await page.close();
      throw new Error("Not authenticated — please run `linkedin-scraper auth` first.");
    }

    await page.waitForSelector("[data-chameleon-result-urn]", { timeout: 15_000 });

    let previousCount = 0;
    let noNewContentStreak = 0;

    const stopIdsArray = Array.from(stopPostIds);

    for (let i = 0; i < maxIterations; i++) {
      // Check if any known post ID is already visible
      if (stopIdsArray.length > 0) {
        const found = await page.evaluate((ids: string[]) => {
          return ids.some((id) =>
            !!document.querySelector(`[data-chameleon-result-urn*="${id}"]`)
          );
        }, stopIdsArray);
        if (found) break;
      }

      // Count current posts
      const currentCount = await page.evaluate(() =>
        document.querySelectorAll("[data-chameleon-result-urn]").length
      );

      onProgress?.(currentCount, i + 1, maxIterations);

      if (currentCount === previousCount) {
        noNewContentStreak++;
        if (noNewContentStreak >= 3) break;
      } else {
        noNewContentStreak = 0;
        previousCount = currentCount;
      }

      // Scroll to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await randomDelay(scrollDelayMin, scrollDelayMax);
    }

    const html = await page.content();
    return html;
  } finally {
    await page.close();
  }
}
