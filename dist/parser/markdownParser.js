"use strict";
/**
 * Robust parser for Obsidian Markdown files produced by src/templates/post.hbs.
 * Uses gray-matter for YAML frontmatter parsing (handles CRLF, Date types, etc.).
 * Designed for round-trip: parse → enrich → renderFrontmatter → write back.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeForYaml = escapeForYaml;
exports.renderFrontmatter = renderFrontmatter;
exports.parseMarkdownPost = parseMarkdownPost;
exports.hasSummary = hasSummary;
const gray_matter_1 = __importDefault(require("gray-matter"));
// ---------------------------------------------------------------------------
// YAML helpers
// ---------------------------------------------------------------------------
/** Escapes a string for safe use inside YAML double-quoted scalars. */
function escapeForYaml(str) {
    return str
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r");
}
/**
 * Renders frontmatter data + optional enrichment updates into a canonical YAML string
 * (without the surrounding `---` delimiters).
 *
 * Field order: title, source, author, author_url, post_id, timestamp, tags (block),
 * image, summary (if present), then any extra user-added fields appended at end.
 */
function renderFrontmatter(data, updates = {}) {
    const str = (key) => escapeForYaml(String(data[key] ?? ""));
    const title = updates.title !== undefined ? updates.title : String(data.title ?? "");
    const summary = updates.summary !== undefined
        ? updates.summary
        : data.summary
            ? String(data.summary)
            : null;
    // gray-matter parses unquoted ISO timestamps as JS Date objects
    const rawTs = data.timestamp;
    const timestamp = rawTs instanceof Date
        ? rawTs.toISOString()
        : String(rawTs ?? "");
    const rawTags = updates.tags !== undefined ? updates.tags : data.tags;
    const tags = Array.isArray(rawTags)
        ? rawTags.map(String)
        : ["#linkedin"];
    const lines = [
        `title: "${escapeForYaml(title)}"`,
        `source: "${str("source")}"`,
        `author: "${str("author")}"`,
        `author_url: "${str("author_url")}"`,
        `post_id: "${str("post_id")}"`,
        `timestamp: ${timestamp}`,
        "tags:",
        ...tags.map((t) => `  - "${escapeForYaml(t)}"`),
        `image: "${str("image")}"`,
    ];
    if (summary !== null && summary !== undefined) {
        lines.push(`summary: "${escapeForYaml(summary)}"`);
    }
    // Append any extra user-added fields not in the known set
    const known = new Set(["title", "source", "author", "author_url", "post_id", "timestamp", "tags", "image", "summary"]);
    for (const [key, value] of Object.entries(data)) {
        if (known.has(key))
            continue;
        if (value instanceof Date) {
            lines.push(`${key}: ${value.toISOString()}`);
        }
        else if (typeof value === "string") {
            lines.push(`${key}: "${escapeForYaml(value)}"`);
        }
        else {
            lines.push(`${key}: ${JSON.stringify(value)}`);
        }
    }
    return lines.join("\n");
}
// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------
/**
 * Parses an Obsidian Markdown file produced by post.hbs.
 * Returns null if gray-matter cannot parse the frontmatter or post_id is missing.
 */
function parseMarkdownPost(fileContent) {
    // Normalize CRLF → LF (git core.autocrlf = true produces CRLF on Windows checkout)
    const normalized = fileContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    let file;
    try {
        file = (0, gray_matter_1.default)(normalized);
    }
    catch {
        return null;
    }
    const data = file.data;
    // Require post_id to confirm this is a valid post file
    if (!data.post_id)
        return null;
    const str = (key) => String(data[key] ?? "");
    // gray-matter parses unquoted ISO timestamps as JS Date objects
    const rawTs = data.timestamp;
    const timestamp = rawTs instanceof Date ? rawTs.toISOString() : str("timestamp");
    const tags = Array.isArray(data.tags)
        ? data.tags.map(String)
        : ["#linkedin"];
    const summary = data.summary ? String(data.summary) : null;
    // rawBody: gray-matter strips the frontmatter block (file.content starts with \n or the body)
    const rawBody = file.content;
    // Content: everything after the ![[image]] embed line (strip leading callout if present)
    const imageEmbedMatch = rawBody.match(/!\[\[.*?\]\]\n+([\s\S]*)/);
    const content = imageEmbedMatch ? imageEmbedMatch[1].trimEnd() : "";
    return {
        title: str("title"),
        source: str("source"),
        author: str("author"),
        authorUrl: str("author_url"),
        postId: str("post_id"),
        timestamp,
        tags,
        image: str("image"),
        summary,
        content,
        rawBody,
        data,
    };
}
function hasSummary(parsed) {
    return parsed.summary !== null;
}
//# sourceMappingURL=markdownParser.js.map