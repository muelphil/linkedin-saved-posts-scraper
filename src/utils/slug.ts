import * as fs from "fs";
import * as path from "path";

/**
 * Converts a string into a safe filename by removing or replacing
 * characters that are invalid in file paths on Windows and Unix.
 */
export function toSlug(text: string): string {
  return text
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "") // remove invalid chars
    .replace(/\s+/g, " ")                    // collapse whitespace
    .replace(/\.+$/, "")                     // remove trailing dots
    .slice(0, 200)                           // max length
    .trim();
}

/**
 * Returns a non-conflicting file path, appending (1), (2), etc. if needed.
 * e.g. if "Title.md" exists, returns "Title (1).md", then "Title (2).md", etc.
 */
export function safeFilePath(dir: string, base: string, ext: string): string {
  const first = path.join(dir, `${base}${ext}`);
  if (!fs.existsSync(first)) return first;

  let counter = 1;
  while (true) {
    const candidate = path.join(dir, `${base} (${counter})${ext}`);
    if (!fs.existsSync(candidate)) return candidate;
    counter++;
  }
}
