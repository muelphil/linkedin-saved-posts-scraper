/**
 * Converts a string into a safe filename by removing or replacing
 * characters that are invalid in file paths on Windows and Unix.
 */
export declare function toSlug(text: string): string;
/**
 * Returns a non-conflicting file path, appending (1), (2), etc. if needed.
 * e.g. if "Title.md" exists, returns "Title (1).md", then "Title (2).md", etc.
 */
export declare function safeFilePath(dir: string, base: string, ext: string): string;
