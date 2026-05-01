import * as fs from "fs";
import * as path from "path";
import { systemPromptPath } from "../config/configStore";

/**
 * Creates ~/.linkedin-scraper/system_prompt.md with default content if it doesn't exist.
 */
export function ensureSystemPromptFile(): void {
  const dir = path.dirname(systemPromptPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(systemPromptPath)) {
    const defaultPrompt = fs.readFileSync(
      path.join(__dirname, "default_system_prompt.md"),
      "utf-8"
    );
    fs.writeFileSync(systemPromptPath, defaultPrompt, "utf-8");
  }
}

/**
 * Returns the system prompt text.
 * Reads from ~/.linkedin-scraper/system_prompt.md, creating the file with
 * default content if it does not yet exist.
 */
export function getSystemPrompt(): string {
  ensureSystemPromptFile();
  return fs.readFileSync(systemPromptPath, "utf-8").trim();
}