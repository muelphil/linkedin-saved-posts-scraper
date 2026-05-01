import { Post } from "../types";
/**
 * Lightweight extraction of post IDs from all container elements in the document.
 * Much cheaper than a full parse — only reads the URN attribute per element.
 */
export declare function extractPostIds(html: string): string[];
/**
 * Parses only the provided container elements into Post objects.
 * Each post is parsed individually — failures are caught and logged per-post.
 */
export declare function parsePostsFromContainers(containers: Element[]): Post[];
/**
 * Parses an HTML string (full page or fragment) and returns all Post objects found.
 * Each post is parsed individually — failures are caught and logged per-post.
 *
 * @deprecated Use {@link extractPostIds} + {@link parsePostsFromContainers}
 * for better performance when stopPostId filtering is needed upstream.
 */
export declare function parsePostsFromHtml(html: string): Post[];
