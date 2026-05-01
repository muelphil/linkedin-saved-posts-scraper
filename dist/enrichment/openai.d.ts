import { Post } from "../types";
export interface EnrichmentResult {
    title: string;
    summary: string;
    tags: string[];
}
/**
 * Enriches a post with an AI-generated title and summary.
 * Returns null if enrichment fails (never throws).
 */
export declare function enrichPost(post: Post, apiKey: string, model: string, baseURL?: string): Promise<EnrichmentResult | null>;
/**
 * Enriches a batch of posts in sequence.
 *
 * @param onProgress - Optional callback invoked after each post with (done, total).
 */
export declare function enrichPosts(posts: Post[], apiKey: string, model: string, baseURL?: string, onProgress?: (done: number, total: number) => void): Promise<Post[]>;
