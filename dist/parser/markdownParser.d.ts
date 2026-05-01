/**
 * Robust parser for Obsidian Markdown files produced by src/templates/post.hbs.
 * Uses gray-matter for YAML frontmatter parsing (handles CRLF, Date types, etc.).
 * Designed for round-trip: parse → enrich → renderFrontmatter → write back.
 */
export interface ParsedMarkdownPost {
    title: string;
    source: string;
    author: string;
    authorUrl: string;
    postId: string;
    timestamp: string;
    tags: string[];
    image: string;
    summary: string | null;
    /** Post body text (after ![[image]] line), trimmed */
    content: string;
    /** Raw body text as returned by gray-matter (content after closing ---) */
    rawBody: string;
    /** Parsed frontmatter data object — used by renderFrontmatter for write-back */
    data: Record<string, unknown>;
}
/** Escapes a string for safe use inside YAML double-quoted scalars. */
export declare function escapeForYaml(str: string): string;
/**
 * Renders frontmatter data + optional enrichment updates into a canonical YAML string
 * (without the surrounding `---` delimiters).
 *
 * Field order: title, source, author, author_url, post_id, timestamp, tags (block),
 * image, summary (if present), then any extra user-added fields appended at end.
 */
export declare function renderFrontmatter(data: Record<string, unknown>, updates?: {
    title?: string;
    summary?: string | null;
    tags?: string[];
}): string;
/**
 * Parses an Obsidian Markdown file produced by post.hbs.
 * Returns null if gray-matter cannot parse the frontmatter or post_id is missing.
 */
export declare function parseMarkdownPost(fileContent: string): ParsedMarkdownPost | null;
export declare function hasSummary(parsed: ParsedMarkdownPost): boolean;
