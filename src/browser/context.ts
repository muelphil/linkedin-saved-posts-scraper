import { chromium, BrowserContext } from "playwright";
import * as fs from "fs";
import * as path from "path";

export interface BrowserHandle {
  context: BrowserContext;
  /** Persists current cookies + storage to authStatePath (call after a successful run). */
  saveState(): Promise<void>;
  /** Closes the browser context and the underlying browser instance. */
  close(): Promise<void>;
}

/**
 * Launches a browser and creates a context seeded with the saved auth state.
 * The auth state (cookies + localStorage + IndexedDB) is read from `authStatePath`
 * when the file exists; a fresh unauthenticated context is used otherwise.
 *
 * Pass `headless: false` for the login helper flow; `headless: true` for scraping.
 * Pass `quiet: true` to suppress all console output (useful when called from an
 * interactive wizard that manages its own progress UI).
 */
export async function launchContext(
  authStatePath: string,
  headless = true,
  quiet = false
): Promise<BrowserHandle> {
  const hasAuth = fs.existsSync(authStatePath);
  if (!hasAuth && !quiet) {
    console.warn(
      `[auth] No auth state found at ${authStatePath}. Run "npm run login" first.`
    );
  }

  let storageState: string | undefined;
  if (hasAuth) {
    try {
      JSON.parse(fs.readFileSync(authStatePath, "utf-8"));
      storageState = authStatePath;
    } catch {
      if (!quiet) console.warn("[auth] auth.json is corrupt — ignoring and starting fresh.");
    }
  }

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    ...(storageState ? { storageState } : {}),
    viewport: { width: 1280, height: 900 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "en-US",
    timezoneId: "Europe/Berlin",
  });

  return {
    context,
    async saveState() {
      const dir = path.dirname(authStatePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      await context.storageState({ path: authStatePath, indexedDB: true });
    },
    async close() {
      await context.close();
      await browser.close();
    },
  };
}

/**
 * Interactive login helper. Opens a visible browser so the user can log in manually.
 * Waits until the LinkedIn feed is visible, then saves the session and closes.
 *
 * @param quiet When true, suppresses all console output (for use inside interactive wizards).
 */
export async function runLoginHelper(authStatePath: string, quiet = false): Promise<void> {
  if (!quiet) console.log("[auth] Opening browser for manual login...");
  const handle = await launchContext(authStatePath, false, quiet);
  const page = await handle.context.newPage();
  await page.goto("https://www.linkedin.com/login");

  if (!quiet) {
    console.log("[auth] Please log in manually in the browser window.");
    console.log("[auth] Waiting for LinkedIn feed to appear...");
  }

  // Wait up to 5 minutes for the user to complete login
  await page.waitForURL(/linkedin\.com\/feed/, { timeout: 300_000 });

  // Wait for the nav to settle so all post-login tokens are written
  await page.waitForSelector(".global-nav__me", { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(2_000);

  if (!quiet) console.log("[auth] Login detected. Saving session...");
  await handle.saveState();
  await handle.close();
  if (!quiet) console.log("[auth] Session saved to:", authStatePath);
}
