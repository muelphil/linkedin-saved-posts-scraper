import { BrowserContext } from "playwright";
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
export declare function launchContext(authStatePath: string, headless?: boolean, quiet?: boolean): Promise<BrowserHandle>;
/**
 * Interactive login helper. Opens a visible browser so the user can log in manually.
 * Waits until the LinkedIn feed is visible, then saves the session and closes.
 *
 * @param quiet When true, suppresses all console output (for use inside interactive wizards).
 */
export declare function runLoginHelper(authStatePath: string, quiet?: boolean): Promise<void>;
