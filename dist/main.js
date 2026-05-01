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
exports.run = run;
const jsdom_1 = require("jsdom");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const prompts_1 = require("@clack/prompts");
const config_1 = require("./config");
const context_1 = require("./browser/context");
const navigator_1 = require("./browser/navigator");
const postParser_1 = require("./parser/postParser");
const markdownParser_1 = require("./parser/markdownParser");
const time_1 = require("./utils/time");
const cache_1 = require("./storage/cache");
const fileWriter_1 = require("./storage/fileWriter");
/**
 * Collects all post_id values from existing Markdown files in a directory.
 * Used as a cache fallback when no cache.json exists yet.
 */
function loadKnownPostIds(postsDir) {
    const ids = new Set();
    if (!fs.existsSync(postsDir))
        return ids;
    for (const file of fs.readdirSync(postsDir)) {
        if (!file.endsWith(".md"))
            continue;
        try {
            const content = fs.readFileSync(path.join(postsDir, file), "utf-8");
            const parsed = (0, markdownParser_1.parseMarkdownPost)(content);
            if (parsed?.postId)
                ids.add(parsed.postId);
        }
        catch {
            // skip unreadable files
        }
    }
    return ids;
}
/**
 * Main scraping pipeline.
 */
async function run() {
    // 1. Load cache — fall back to scanning existing files
    const cache = (0, cache_1.readCache)(config_1.config.cacheFilePath);
    let stopPostIds;
    if (cache.lastPostId) {
        stopPostIds = new Set([cache.lastPostId]);
        prompts_1.log.info(`Last scraped post: ${cache.lastPostId}`);
    }
    else {
        stopPostIds = loadKnownPostIds(config_1.config.postsOutputDir);
        if (stopPostIds.size > 0) {
            prompts_1.log.info(`No cache found — using ${stopPostIds.size} existing post ID${stopPostIds.size === 1 ? "" : "s"} as stop markers.`);
        }
        else {
            prompts_1.log.info("No cache and no existing posts — will scrape everything.");
        }
    }
    // 2. Launch browser
    const handle = await (0, context_1.launchContext)(config_1.config.authStatePath, true);
    let posts = [];
    try {
        // 3. Scroll & collect DOM
        const s = (0, prompts_1.spinner)({
            frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
        });
        s.start("Navigating to saved posts…");
        const html = await (0, navigator_1.collectSavedPostsHtml)(handle.context, config_1.config.linkedinSavedUrl, stopPostIds, config_1.config.maxScrollIterations, config_1.config.scrollDelayMin, config_1.config.scrollDelayMax, (count, iteration, max) => {
            s.message(`Scrolling saved posts… ${count} visible (scroll ${iteration}/${max})`);
        });
        s.stop("Finished scrolling.");
        // 4. Extract all post IDs and find cutoff (first ID already known)
        const postIds = (0, postParser_1.extractPostIds)(html);
        const cutoffIndex = postIds.findIndex((id) => stopPostIds.has(id));
        const dom = new jsdom_1.JSDOM(html);
        const containers = Array.from(dom.window.document.querySelectorAll("[data-chameleon-result-urn]"));
        posts = (0, postParser_1.parsePostsFromContainers)(cutoffIndex > -1 ? containers.slice(0, cutoffIndex) : containers);
        if (posts.length === 0) {
            prompts_1.log.info("No new posts found.");
            (0, prompts_1.outro)("Nothing to do.");
            return;
        }
        prompts_1.log.step(`${posts.length} new post${posts.length === 1 ? "" : "s"} to process.`);
        // 5. Resolve absolute timestamps
        posts = posts.map((p) => ({
            ...p,
            timestamp: { ...p.timestamp, absolute: (0, time_1.relativeToAbsolute)(p.timestamp.relative) },
        }));
        // 6. Write markdown + images
        const ws = (0, prompts_1.spinner)({
            frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
        });
        ws.start(`Writing ${posts.length} file${posts.length === 1 ? "" : "s"}…`);
        let written = 0;
        await (0, fileWriter_1.writePosts)(posts, config_1.config.postsOutputDir, config_1.config.imagesOutputDir, () => { written++; ws.message(`Writing files… ${written}/${posts.length}`); });
        ws.stop(`Wrote ${written} file${written === 1 ? "" : "s"}.`);
        // 7. Refresh auth state
        await handle.saveState();
    }
    finally {
        await handle.close();
    }
    // 8. Update cache (only after successful write)
    if (posts.length > 0) {
        (0, cache_1.writeCache)(config_1.config.cacheFilePath, posts[0].postId);
    }
    (0, prompts_1.outro)(`Done — ${posts.length} post${posts.length === 1 ? "" : "s"} scraped.`);
}
//# sourceMappingURL=main.js.map