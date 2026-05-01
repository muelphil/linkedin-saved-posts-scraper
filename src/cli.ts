#!/usr/bin/env node
import { Command } from "commander";
import { runLoginHelper } from "./browser/context";
import { runInit } from "./cli/init";
import { authStatePath } from "./config/configStore";

const program = new Command();

program
  .name("linkedin-scraper")
  .description("Scrape LinkedIn saved posts to Obsidian Markdown files")
  .version("1.0.0");

program
  .command("init")
  .description("Interactive setup: configure directories, OpenAI settings, and session")
  .action(async () => {
    try {
      await runInit();
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
  });

program
  .command("auth")
  .description("Open browser for manual LinkedIn login (saves session)")
  .action(async () => {
    try {
      await runLoginHelper(authStatePath);
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
  });

program
  .command("scrape", { isDefault: true })
  .description("Scrape new saved posts and write Markdown files")
  .action(async () => {
    try {
      const { run } = await import("./main");
      await run();
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
  });

program
  .command("summarize")
  .description("Enrich existing Markdown posts with AI-generated title, summary, and tags")
  .option("--reenrich", "Re-enrich files that were already enriched in a previous run", false)
  .option("--keep-tags", "Don't overwrite existing tags blocks in the frontmatter")
  .option(
    "--update-titles",
    "Sync ALL filenames to their current frontmatter title, even for files already enriched",
    false
  )
  .option(
    "--concurrency <n>",
    "Number of parallel OpenAI requests (default: 5)",
    "5"
  )
  .action(async (opts: { reenrich: boolean; keepTags: boolean; updateTitles: boolean; concurrency: string }) => {
    try {
      const { runSummarize } = await import("./summarize");
      const concurrency = Math.max(1, parseInt(opts.concurrency, 10) || 5);
      await runSummarize(opts.reenrich, !opts.keepTags, opts.updateTitles, concurrency);
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
  });

program.parse();
