import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";
import Handlebars from "handlebars";
import { Post } from "../types";
import { toSlug, safeFilePath } from "../utils/slug";
import { convertMedia } from "../utils/media";
import { postTemplatePath } from "../config/configStore";
import { debug } from "../utils/logger";

// Load and compile the Handlebars template once.
// Prefer user-customized template at ~/.linkedin-scraper/post.hbs if present.
const bundledTemplatePath = path.join(__dirname, "../templates/post.hbs");
const templateSource = fs.existsSync(postTemplatePath)
  ? fs.readFileSync(postTemplatePath, "utf-8")
  : fs.readFileSync(bundledTemplatePath, "utf-8");
const template = Handlebars.compile(templateSource);

/**
 * Downloads a URL to a local file path. Returns the local path on success.
 */
function downloadFile(url: string, destPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const protocol = url.startsWith("https") ? https : http;
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const location = response.headers.location;
        if (location) {
          file.close();
          downloadFile(location, destPath).then(resolve).catch(reject);
          return;
        }
      }
      response.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve(destPath);
      });
    }).on("error", (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

/**
 * Derives a safe filename base from the post.
 * Uses enrichment title if available, otherwise falls back to author name + postId snippet.
 */
function getFileBase(post: Post): string {
  if (post.enrichment?.title) {
    return toSlug(post.enrichment.title);
  }
  return toSlug(`${post.author.name} - ${post.postId.slice(-8)}`);
}

/**
 * Writes the markdown file and optionally downloads the media image for a single post.
 * Returns the path of the written markdown file.
 */
export async function writePost(
  post: Post,
  postsDir: string,
  imagesDir: string,
): Promise<string> {
  // Download image and optionally convert to AVIF
  if (post.media?.url) {
    try {
      const ext = path.extname(new URL(post.media.url).pathname).split("?")[0] || ".jpg";
      const rawPath = path.join(imagesDir, `${post.postId}${ext}`);

      // Skip download+conversion entirely if already processed on a previous run
      const alreadyConverted = [".avif", ".webp"].map((e) =>
        path.join(imagesDir, `${post.postId}${e}`),
      ).find((p) => fs.existsSync(p));

      let finalPath: string;
      if (alreadyConverted) {
        finalPath = alreadyConverted;
      } else {
        if (!fs.existsSync(rawPath)) {
          await downloadFile(post.media.url, rawPath);
        }
        finalPath = await convertMedia(rawPath);
      }

      post = { ...post, media: { ...post.media!, localPath: finalPath } };
    } catch (err) {
      process.stderr.write(`[writer] Failed to download/convert media for ${post.postId}: ${(err as Error).message}\n`);
    }
  }

  // Render markdown — pass mediaFilename separately so the template uses the real extension
  const mediaFilename = post.media?.localPath ? path.basename(post.media.localPath) : `${post.postId}.jpg`;
  const markdown = template({ ...post, mediaFilename });

  // Determine output path
  const base = getFileBase(post);
  const mdPath = safeFilePath(postsDir, base, ".md");

  fs.writeFileSync(mdPath, markdown, "utf-8");
  debug(`[writer] Wrote: ${mdPath}`);

  return mdPath;
}

/**
 * Writes markdown files for a batch of posts.
 *
 * @param onWritten - Optional callback invoked with each written file's path.
 */
export async function writePosts(
  posts: Post[],
  postsDir: string,
  imagesDir: string,
  onWritten?: (filePath: string) => void,
): Promise<void> {
  for (const post of posts) {
    try {
      const filePath = await writePost(post, postsDir, imagesDir);
      onWritten?.(filePath);
    } catch (err) {
      process.stderr.write(`[writer] Failed to write post ${post.postId}: ${(err as Error).message}\n`);
    }
  }
}
