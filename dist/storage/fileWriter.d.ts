import { Post } from "../types";
/**
 * Writes the markdown file and optionally downloads the media image for a single post.
 * Returns the path of the written markdown file.
 */
export declare function writePost(post: Post, postsDir: string, imagesDir: string): Promise<string>;
/**
 * Writes markdown files for a batch of posts.
 *
 * @param onWritten - Optional callback invoked with each written file's path.
 */
export declare function writePosts(posts: Post[], postsDir: string, imagesDir: string, onWritten?: (filePath: string) => void): Promise<void>;
