/**
 * Creates ~/.linkedin-scraper/system_prompt.md with default content if it doesn't exist.
 */
export declare function ensureSystemPromptFile(): void;
/**
 * Returns the system prompt text.
 * Reads from ~/.linkedin-scraper/system_prompt.md, creating the file with
 * default content if it does not yet exist.
 */
export declare function getSystemPrompt(): string;
