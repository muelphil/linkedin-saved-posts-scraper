"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.launchContext = launchContext;
exports.runLoginHelper = runLoginHelper;
const playwright_1 = require("playwright");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Launches a browser and creates a context seeded with the saved auth state.
 * The auth state (cookies + localStorage + IndexedDB) is read from `authStatePath`
 * when the file exists; a fresh unauthenticated context is used otherwise.
 *
 * Pass `headless: false` for the login helper flow; `headless: true` for scraping.
 * Pass `quiet: true` to suppress all console output (useful when called from an
 * interactive wizard that manages its own progress UI).
 */
async function launchContext(authStatePath, headless = true, quiet = false) {
    const hasAuth = fs.existsSync(authStatePath);
    if (!hasAuth && !quiet) {
        console.warn(`[auth] No auth state found at ${authStatePath}. Run "npm run login" first.`);
    }
    let storageState;
    if (hasAuth) {
        try {
            JSON.parse(fs.readFileSync(authStatePath, "utf-8"));
            storageState = authStatePath;
        }
        catch {
            if (!quiet)
                console.warn("[auth] auth.json is corrupt — ignoring and starting fresh.");
        }
    }
    const browser = await playwright_1.chromium.launch({ headless });
    const context = await browser.newContext({
        ...(storageState ? { storageState } : {}),
        viewport: { width: 1280, height: 900 },
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        locale: "en-US",
        timezoneId: "Europe/Berlin",
    });
    return {
        context,
        async saveState() {
            const dir = path.dirname(authStatePath);
            if (!fs.existsSync(dir))
                fs.mkdirSync(dir, { recursive: true });
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
async function runLoginHelper(authStatePath, quiet = false) {
    if (!quiet)
        console.log("[auth] Opening browser for manual login...");
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
    await page.waitForSelector(".global-nav__me", { timeout: 10_000 }).catch(() => { });
    await page.waitForTimeout(2_000);
    if (!quiet)
        console.log("[auth] Login detected. Saving session...");
    await handle.saveState();
    await handle.close();
    if (!quiet)
        console.log("[auth] Session saved to:", authStatePath);
}
//# sourceMappingURL=context.js.map