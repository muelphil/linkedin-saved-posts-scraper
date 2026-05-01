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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runInit = runInit;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const child_process_1 = require("child_process");
const prompts_1 = require("@clack/prompts");
const picocolors_1 = __importDefault(require("picocolors"));
const configStore_1 = require("../config/configStore");
const context_1 = require("../browser/context");
const prompt_1 = require("../enrichment/prompt");
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Append current-value label to a prompt message */
function currentLabel(current) {
    return current ? picocolors_1.default.dim(`  [current: ${current}]`) : "";
}
/** Return trimmed string if non-empty, otherwise fallback */
function nonEmpty(v, fallback) {
    if ((0, prompts_1.isCancel)(v))
        return undefined;
    const s = v.trim();
    return s.length > 0 ? s : fallback;
}
// ---------------------------------------------------------------------------
// Editor helpers
// ---------------------------------------------------------------------------
/** Opens a file using the OS "Open With" chooser so the user can pick any editor. */
function openInEditor(filePath) {
    let cmd;
    let args;
    if (process.platform === "win32") {
        // rundll32 OpenAs_RunDLL shows the Windows "Open with" dialog for any file
        cmd = "rundll32.exe";
        args = ["shell32.dll,OpenAs_RunDLL", filePath];
    }
    else if (process.platform === "darwin") {
        cmd = "open";
        args = [filePath];
    }
    else {
        cmd = "xdg-open";
        args = [filePath];
    }
    const child = (0, child_process_1.spawn)(cmd, args, { detached: true, stdio: "ignore" });
    child.unref();
}
/** Copies the bundled post.hbs to the user config dir if it doesn't exist there yet. */
function ensurePostTemplateFile() {
    if (!fs.existsSync(configStore_1.postTemplatePath)) {
        const bundled = path.join(__dirname, "../templates/post.hbs");
        const dir = path.dirname(configStore_1.postTemplatePath);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        fs.copyFileSync(bundled, configStore_1.postTemplatePath);
    }
}
// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function runInit() {
    const cfg = (0, configStore_1.readConfig)();
    (0, prompts_1.intro)(picocolors_1.default.bold("  linkedin-scraper") + picocolors_1.default.dim("  setup wizard"));
    // -------------------------------------------------------------------------
    // Step 1: Authentication
    // -------------------------------------------------------------------------
    const hasSession = fs.existsSync(configStore_1.authStatePath);
    if (hasSession) {
        const reuse = await (0, prompts_1.confirm)({
            message: "Session found — use existing LinkedIn session?",
            initialValue: true,
        });
        if ((0, prompts_1.isCancel)(reuse)) {
            (0, prompts_1.cancel)("Setup cancelled.");
            process.exit(0);
        }
        if (!reuse) {
            await doAuth();
        }
        else {
            console.log(picocolors_1.default.dim("  ✓ Keeping existing session."));
        }
    }
    else {
        (0, prompts_1.note)("No LinkedIn session found.\nYou must log in before scraping.", "Authentication required");
        await doAuth();
    }
    // -------------------------------------------------------------------------
    // Step 2: Directory configuration
    // -------------------------------------------------------------------------
    const defaultPosts = path.join(os.homedir(), "Documents", "LinkedIn");
    const postsDir = await (0, prompts_1.text)({
        message: "Posts output directory" + currentLabel(cfg.postsOutputDir),
        placeholder: cfg.postsOutputDir ?? defaultPosts,
        validate: () => undefined,
    });
    if ((0, prompts_1.isCancel)(postsDir)) {
        (0, prompts_1.cancel)("Setup cancelled.");
        process.exit(0);
    }
    const resolvedPostsDir = nonEmpty(postsDir, cfg.postsOutputDir);
    const imagesDir = await (0, prompts_1.text)({
        message: "Images output directory" + currentLabel(cfg.imagesOutputDir),
        placeholder: cfg.imagesOutputDir ?? resolvedPostsDir ?? defaultPosts,
        validate: () => undefined,
    });
    if ((0, prompts_1.isCancel)(imagesDir)) {
        (0, prompts_1.cancel)("Setup cancelled.");
        process.exit(0);
    }
    (0, prompts_1.note)("Stores a cache.json tracking the last scraped post.\n" +
        picocolors_1.default.dim("Each run uses this to avoid re-scraping posts you already have."), "Cache directory");
    const cacheDir = await (0, prompts_1.text)({
        message: "Cache directory" + currentLabel(cfg.cacheDir),
        placeholder: cfg.cacheDir ?? path.dirname(configStore_1.configFilePath),
        validate: () => undefined,
    });
    if ((0, prompts_1.isCancel)(cacheDir)) {
        (0, prompts_1.cancel)("Setup cancelled.");
        process.exit(0);
    }
    // -------------------------------------------------------------------------
    // Step 3: OpenAI configuration
    // -------------------------------------------------------------------------
    const endpointInput = await (0, prompts_1.text)({
        message: "OpenAI API endpoint" +
            (cfg.openaiEndpoint
                ? currentLabel(cfg.openaiEndpoint)
                : picocolors_1.default.dim("  (leave blank for https://api.openai.com/v1)")),
        placeholder: cfg.openaiEndpoint ?? "",
        validate: () => undefined,
    });
    if ((0, prompts_1.isCancel)(endpointInput)) {
        (0, prompts_1.cancel)("Setup cancelled.");
        process.exit(0);
    }
    const currentApiKey = (0, configStore_1.getApiKey)();
    const apiKeyMsg = "OpenAI API key" +
        (currentApiKey
            ? picocolors_1.default.dim("  (Enter to keep current)")
            : picocolors_1.default.dim("  (required for summarize)"));
    const apiKeyInput = await (0, prompts_1.password)({
        message: apiKeyMsg,
        validate: (v) => {
            if (!v?.trim() && !currentApiKey) {
                return "Enter an API key, or press Ctrl+C to skip (summarize won't work without one)";
            }
            return undefined;
        },
    });
    if ((0, prompts_1.isCancel)(apiKeyInput)) {
        (0, prompts_1.cancel)("Setup cancelled.");
        process.exit(0);
    }
    const modelInput = await (0, prompts_1.text)({
        message: "OpenAI model" + currentLabel(cfg.openaiModel ?? "gpt-4o-mini"),
        placeholder: cfg.openaiModel ?? "gpt-4o-mini",
        validate: () => undefined,
    });
    if ((0, prompts_1.isCancel)(modelInput)) {
        (0, prompts_1.cancel)("Setup cancelled.");
        process.exit(0);
    }
    // -------------------------------------------------------------------------
    // Step 4: Custom templates (optional)
    // -------------------------------------------------------------------------
    (0, prompts_1.note)("You can customize the AI system prompt and the Markdown post template.\n" +
        picocolors_1.default.dim("Files are stored in ~/.linkedin-scraper/ and persist across runs."), "Optional customization");
    const openPrompt = await (0, prompts_1.confirm)({
        message: "Open AI system prompt for editing?",
        initialValue: false,
    });
    if ((0, prompts_1.isCancel)(openPrompt)) {
        (0, prompts_1.cancel)("Setup cancelled.");
        process.exit(0);
    }
    if (openPrompt) {
        (0, prompt_1.ensureSystemPromptFile)();
        openInEditor(configStore_1.systemPromptPath);
        await (0, prompts_1.text)({
            message: picocolors_1.default.dim(`Editing: ${configStore_1.systemPromptPath}`) + "\n  Press Enter when done…",
            validate: () => undefined,
        });
    }
    const openTemplate = await (0, prompts_1.confirm)({
        message: "Open post.hbs template for editing?",
        initialValue: false,
    });
    if ((0, prompts_1.isCancel)(openTemplate)) {
        (0, prompts_1.cancel)("Setup cancelled.");
        process.exit(0);
    }
    if (openTemplate) {
        ensurePostTemplateFile();
        openInEditor(configStore_1.postTemplatePath);
        await (0, prompts_1.text)({
            message: picocolors_1.default.dim(`Editing: ${configStore_1.postTemplatePath}`) + "\n  Press Enter when done…",
            validate: () => undefined,
        });
    }
    // -------------------------------------------------------------------------
    // Step 5: Persist
    // -------------------------------------------------------------------------
    const resolvedImagesDir = nonEmpty(imagesDir, cfg.imagesOutputDir) ?? resolvedPostsDir;
    const resolvedCacheDir = nonEmpty(cacheDir, cfg.cacheDir) ?? path.dirname(configStore_1.configFilePath);
    const resolvedModel = nonEmpty(modelInput, cfg.openaiModel ?? "gpt-4o-mini") ?? "gpt-4o-mini";
    const resolvedEndpoint = nonEmpty(endpointInput, cfg.openaiEndpoint);
    const newApiKeyPlain = (apiKeyInput ?? "").trim();
    const resolvedApiKey = newApiKeyPlain
        ? (0, configStore_1.encryptApiKey)(newApiKeyPlain)
        : cfg.openaiApiKey;
    // Ensure all configured dirs exist
    for (const dir of [resolvedPostsDir, resolvedImagesDir, resolvedCacheDir]) {
        if (dir && !fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
    (0, configStore_1.writeConfig)({
        ...(resolvedPostsDir ? { postsOutputDir: resolvedPostsDir } : {}),
        ...(resolvedImagesDir ? { imagesOutputDir: resolvedImagesDir } : {}),
        ...(resolvedCacheDir ? { cacheDir: resolvedCacheDir } : {}),
        openaiModel: resolvedModel,
        openaiEndpoint: resolvedEndpoint ?? "",
        ...(resolvedApiKey ? { openaiApiKey: resolvedApiKey } : {}),
    });
    (0, prompts_1.outro)(picocolors_1.default.green("✓ Configuration saved.") +
        "\n\n" +
        picocolors_1.default.dim("  Run  ") +
        picocolors_1.default.bold("linkedin-scraper scrape") +
        picocolors_1.default.dim("  to begin scraping.\n") +
        picocolors_1.default.dim("  Run  ") +
        picocolors_1.default.bold("linkedin-scraper summarize") +
        picocolors_1.default.dim("  to enrich posts with AI.\n") +
        picocolors_1.default.dim("  Run  ") +
        picocolors_1.default.bold("linkedin-scraper --help") +
        picocolors_1.default.dim("  for all commands, or  ") +
        picocolors_1.default.bold("linkedin-scraper <command> --help") +
        picocolors_1.default.dim("  for command options."));
}
// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------
async function doAuth() {
    const s = (0, prompts_1.spinner)({
        frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
    });
    s.start("Opening browser for LinkedIn login…");
    s.stop("Browser opening — please log in in the window that appears.");
    try {
        await (0, context_1.runLoginHelper)(configStore_1.authStatePath, true);
        console.log(picocolors_1.default.green("  ✓ Session saved."));
    }
    catch (err) {
        console.error(picocolors_1.default.red("  ✗ Auth failed: " + err.message));
        process.exit(1);
    }
}
//# sourceMappingURL=init.js.map