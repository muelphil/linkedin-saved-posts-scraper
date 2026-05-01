import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { spawn } from "child_process";
import {
  intro,
  outro,
  text,
  password,
  confirm,
  spinner,
  note,
  cancel,
  isCancel,
} from "@clack/prompts";
import pc from "picocolors";
import {
  readConfig,
  writeConfig,
  encryptApiKey,
  getApiKey,
  authStatePath,
  configFilePath,
  systemPromptPath,
  postTemplatePath,
} from "../config/configStore";
import { runLoginHelper } from "../browser/context";
import { ensureSystemPromptFile } from "../enrichment/prompt";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Append current-value label to a prompt message */
function currentLabel(current: string | undefined): string {
  return current ? pc.dim(`  [current: ${current}]`) : "";
}

/** Return trimmed string if non-empty, otherwise fallback */
function nonEmpty(
  v: string | symbol,
  fallback: string | undefined
): string | undefined {
  if (isCancel(v)) return undefined;
  const s = (v as string).trim();
  return s.length > 0 ? s : fallback;
}

// ---------------------------------------------------------------------------
// Editor helpers
// ---------------------------------------------------------------------------

/** Opens a file using the OS "Open With" chooser so the user can pick any editor. */
function openInEditor(filePath: string): void {
  let cmd: string;
  let args: string[];

  if (process.platform === "win32") {
    // rundll32 OpenAs_RunDLL shows the Windows "Open with" dialog for any file
    cmd = "rundll32.exe";
    args = ["shell32.dll,OpenAs_RunDLL", filePath];
  } else if (process.platform === "darwin") {
    cmd = "open";
    args = [filePath];
  } else {
    cmd = "xdg-open";
    args = [filePath];
  }

  const child = spawn(cmd, args, { detached: true, stdio: "ignore" });
  child.unref();
}

/** Copies the bundled post.hbs to the user config dir if it doesn't exist there yet. */
function ensurePostTemplateFile(): void {
  if (!fs.existsSync(postTemplatePath)) {
    const bundled = path.join(__dirname, "../templates/post.hbs");
    const dir = path.dirname(postTemplatePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(bundled, postTemplatePath);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function runInit(): Promise<void> {
  const cfg = readConfig();

  intro(pc.bold("  linkedin-scraper") + pc.dim("  setup wizard"));

  // -------------------------------------------------------------------------
  // Step 1: Authentication
  // -------------------------------------------------------------------------

  const hasSession = fs.existsSync(authStatePath);

  if (hasSession) {
    const reuse = await confirm({
      message: "Session found — use existing LinkedIn session?",
      initialValue: true,
    });
    if (isCancel(reuse)) {
      cancel("Setup cancelled.");
      process.exit(0);
    }
    if (!reuse) {
      await doAuth();
    } else {
      console.log(pc.dim("  ✓ Keeping existing session."));
    }
  } else {
    note(
      "No LinkedIn session found.\nYou must log in before scraping.",
      "Authentication required"
    );
    await doAuth();
  }

  // -------------------------------------------------------------------------
  // Step 2: Directory configuration
  // -------------------------------------------------------------------------

  const defaultPosts = path.join(os.homedir(), "Documents", "LinkedIn");

  const postsDir = await text({
    message: "Posts output directory" + currentLabel(cfg.postsOutputDir),
    placeholder: cfg.postsOutputDir ?? defaultPosts,
    validate: () => undefined,
  });
  if (isCancel(postsDir)) {
    cancel("Setup cancelled.");
    process.exit(0);
  }

  const resolvedPostsDir = nonEmpty(postsDir, cfg.postsOutputDir);

  const imagesDir = await text({
    message: "Images output directory" + currentLabel(cfg.imagesOutputDir),
    placeholder: cfg.imagesOutputDir ?? resolvedPostsDir ?? defaultPosts,
    validate: () => undefined,
  });
  if (isCancel(imagesDir)) {
    cancel("Setup cancelled.");
    process.exit(0);
  }

  note(
    "Stores a cache.json tracking the last scraped post.\n" +
      pc.dim(
        "Each run uses this to avoid re-scraping posts you already have."
      ),
    "Cache directory"
  );

  const cacheDir = await text({
    message: "Cache directory" + currentLabel(cfg.cacheDir),
    placeholder: cfg.cacheDir ?? path.dirname(configFilePath),
    validate: () => undefined,
  });
  if (isCancel(cacheDir)) {
    cancel("Setup cancelled.");
    process.exit(0);
  }

  // -------------------------------------------------------------------------
  // Step 3: OpenAI configuration
  // -------------------------------------------------------------------------

  const endpointInput = await text({
    message:
      "OpenAI API endpoint" +
      (cfg.openaiEndpoint
        ? currentLabel(cfg.openaiEndpoint)
        : pc.dim("  (leave blank for https://api.openai.com/v1)")),
    placeholder: cfg.openaiEndpoint ?? "",
    validate: () => undefined,
  });
  if (isCancel(endpointInput)) {
    cancel("Setup cancelled.");
    process.exit(0);
  }

  const currentApiKey = getApiKey();
  const apiKeyMsg =
    "OpenAI API key" +
    (currentApiKey
      ? pc.dim("  (Enter to keep current)")
      : pc.dim("  (required for summarize)"));

  const apiKeyInput = await password({
    message: apiKeyMsg,
    validate: (v: string | undefined) => {
      if (!v?.trim() && !currentApiKey) {
        return "Enter an API key, or press Ctrl+C to skip (summarize won't work without one)";
      }
      return undefined;
    },
  });
  if (isCancel(apiKeyInput)) {
    cancel("Setup cancelled.");
    process.exit(0);
  }

  const modelInput = await text({
    message:
      "OpenAI model" + currentLabel(cfg.openaiModel ?? "gpt-4o-mini"),
    placeholder: cfg.openaiModel ?? "gpt-4o-mini",
    validate: () => undefined,
  });
  if (isCancel(modelInput)) {
    cancel("Setup cancelled.");
    process.exit(0);
  }

  // -------------------------------------------------------------------------
  // Step 4: Custom templates (optional)
  // -------------------------------------------------------------------------

  note(
    "You can customize the AI system prompt and the Markdown post template.\n" +
      pc.dim("Files are stored in ~/.linkedin-scraper/ and persist across runs."),
    "Optional customization"
  );

  const openPrompt = await confirm({
    message: "Open AI system prompt for editing?",
    initialValue: false,
  });
  if (isCancel(openPrompt)) {
    cancel("Setup cancelled.");
    process.exit(0);
  }
  if (openPrompt) {
    ensureSystemPromptFile();
    openInEditor(systemPromptPath);
    await text({
      message: pc.dim(`Editing: ${systemPromptPath}`) + "\n  Press Enter when done…",
      validate: () => undefined,
    });
  }

  const openTemplate = await confirm({
    message: "Open post.hbs template for editing?",
    initialValue: false,
  });
  if (isCancel(openTemplate)) {
    cancel("Setup cancelled.");
    process.exit(0);
  }
  if (openTemplate) {
    ensurePostTemplateFile();
    openInEditor(postTemplatePath);
    await text({
      message: pc.dim(`Editing: ${postTemplatePath}`) + "\n  Press Enter when done…",
      validate: () => undefined,
    });
  }

  // -------------------------------------------------------------------------
  // Step 5: Persist
  // -------------------------------------------------------------------------

  const resolvedImagesDir =
    nonEmpty(imagesDir, cfg.imagesOutputDir) ?? resolvedPostsDir;
  const resolvedCacheDir =
    nonEmpty(cacheDir, cfg.cacheDir) ?? path.dirname(configFilePath);
  const resolvedModel =
    nonEmpty(modelInput, cfg.openaiModel ?? "gpt-4o-mini") ?? "gpt-4o-mini";
  const resolvedEndpoint = nonEmpty(endpointInput, cfg.openaiEndpoint);

  const newApiKeyPlain = ((apiKeyInput as string) ?? "").trim();
  const resolvedApiKey = newApiKeyPlain
    ? encryptApiKey(newApiKeyPlain)
    : cfg.openaiApiKey;

  // Ensure all configured dirs exist
  for (const dir of [resolvedPostsDir, resolvedImagesDir, resolvedCacheDir]) {
    if (dir && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  writeConfig({
    ...(resolvedPostsDir ? { postsOutputDir: resolvedPostsDir } : {}),
    ...(resolvedImagesDir ? { imagesOutputDir: resolvedImagesDir } : {}),
    ...(resolvedCacheDir ? { cacheDir: resolvedCacheDir } : {}),
    openaiModel: resolvedModel,
    openaiEndpoint: resolvedEndpoint ?? "",
    ...(resolvedApiKey ? { openaiApiKey: resolvedApiKey } : {}),
  });

  outro(
    pc.green("✓ Configuration saved.") +
      "\n\n" +
      pc.dim("  Run  ") +
      pc.bold("linkedin-scraper scrape") +
      pc.dim("  to begin scraping.\n") +
      pc.dim("  Run  ") +
      pc.bold("linkedin-scraper summarize") +
      pc.dim("  to enrich posts with AI.\n") +
      pc.dim("  Run  ") +
      pc.bold("linkedin-scraper --help") +
      pc.dim("  for all commands, or  ") +
      pc.bold("linkedin-scraper <command> --help") +
      pc.dim("  for command options.")
  );
}

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

async function doAuth(): Promise<void> {
  const s = spinner({
    frames: ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏']
  });
  s.start("Opening browser for LinkedIn login…");
  s.stop("Browser opening — please log in in the window that appears.");
  try {
    await runLoginHelper(authStatePath, true);
    console.log(pc.green("  ✓ Session saved."));
  } catch (err) {
    console.error(pc.red("  ✗ Auth failed: " + (err as Error).message));
    process.exit(1);
  }
}
