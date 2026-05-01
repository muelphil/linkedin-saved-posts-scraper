#!/usr/bin/env node
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
const commander_1 = require("commander");
const context_1 = require("./browser/context");
const init_1 = require("./cli/init");
const configStore_1 = require("./config/configStore");
const program = new commander_1.Command();
program
    .name("linkedin-scraper")
    .description("Scrape LinkedIn saved posts to Obsidian Markdown files")
    .version("1.0.0");
program
    .command("init")
    .description("Interactive setup: configure directories, OpenAI settings, and session")
    .action(async () => {
    try {
        await (0, init_1.runInit)();
    }
    catch (err) {
        console.error(err.message);
        process.exit(1);
    }
});
program
    .command("auth")
    .description("Open browser for manual LinkedIn login (saves session)")
    .action(async () => {
    try {
        await (0, context_1.runLoginHelper)(configStore_1.authStatePath);
    }
    catch (err) {
        console.error(err.message);
        process.exit(1);
    }
});
program
    .command("scrape", { isDefault: true })
    .description("Scrape new saved posts and write Markdown files")
    .action(async () => {
    try {
        const { run } = await Promise.resolve().then(() => __importStar(require("./main")));
        await run();
    }
    catch (err) {
        console.error(err.message);
        process.exit(1);
    }
});
program
    .command("summarize")
    .description("Enrich existing Markdown posts with AI-generated title, summary, and tags")
    .option("--reenrich", "Re-enrich files that were already enriched in a previous run", false)
    .option("--keep-tags", "Don't overwrite existing tags blocks in the frontmatter")
    .option("--update-titles", "Sync ALL filenames to their current frontmatter title, even for files already enriched", false)
    .option("--concurrency <n>", "Number of parallel OpenAI requests (default: 5)", "5")
    .action(async (opts) => {
    try {
        const { runSummarize } = await Promise.resolve().then(() => __importStar(require("./summarize")));
        const concurrency = Math.max(1, parseInt(opts.concurrency, 10) || 5);
        await runSummarize(opts.reenrich, !opts.keepTags, opts.updateTitles, concurrency);
    }
    catch (err) {
        console.error(err.message);
        process.exit(1);
    }
});
program.parse();
//# sourceMappingURL=cli.js.map