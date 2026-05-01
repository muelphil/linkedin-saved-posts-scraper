"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writePost = writePost;
exports.writePosts = writePosts;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const https = __importStar(require("https"));
const http = __importStar(require("http"));
const handlebars_1 = __importDefault(require("handlebars"));
const slug_1 = require("../utils/slug");
const media_1 = require("../utils/media");
const configStore_1 = require("../config/configStore");
const logger_1 = require("../utils/logger");
// Load and compile the Handlebars template once.
// Prefer user-customized template at ~/.linkedin-scraper/post.hbs if present.
const bundledTemplatePath = path.join(__dirname, "../templates/post.hbs");
const templateSource = fs.existsSync(configStore_1.postTemplatePath)
    ? fs.readFileSync(configStore_1.postTemplatePath, "utf-8")
    : fs.readFileSync(bundledTemplatePath, "utf-8");
const template = handlebars_1.default.compile(templateSource);
/**
 * Downloads a URL to a local file path. Returns the local path on success.
 */
function downloadFile(url, destPath) {
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
            fs.unlink(destPath, () => { });
            reject(err);
        });
    });
}
/**
 * Derives a safe filename base from the post.
 * Uses enrichment title if available, otherwise falls back to author name + postId snippet.
 */
function getFileBase(post) {
    if (post.enrichment?.title) {
        return (0, slug_1.toSlug)(post.enrichment.title);
    }
    return (0, slug_1.toSlug)(`${post.author.name} - ${post.postId.slice(-8)}`);
}
/**
 * Writes the markdown file and optionally downloads the media image for a single post.
 * Returns the path of the written markdown file.
 */
async function writePost(post, postsDir, imagesDir) {
    // Download image and optionally convert to AVIF
    if (post.media?.url) {
        try {
            const ext = path.extname(new URL(post.media.url).pathname).split("?")[0] || ".jpg";
            const rawPath = path.join(imagesDir, `${post.postId}${ext}`);
            // Skip download+conversion entirely if already processed on a previous run
            const alreadyConverted = [".avif", ".webp"].map((e) => path.join(imagesDir, `${post.postId}${e}`)).find((p) => fs.existsSync(p));
            let finalPath;
            if (alreadyConverted) {
                finalPath = alreadyConverted;
            }
            else {
                if (!fs.existsSync(rawPath)) {
                    await downloadFile(post.media.url, rawPath);
                }
                finalPath = await (0, media_1.convertMedia)(rawPath);
            }
            post = { ...post, media: { ...post.media, localPath: finalPath } };
        }
        catch (err) {
            process.stderr.write(`[writer] Failed to download/convert media for ${post.postId}: ${err.message}\n`);
        }
    }
    // Render markdown — pass mediaFilename separately so the template uses the real extension
    const mediaFilename = post.media?.localPath ? path.basename(post.media.localPath) : `${post.postId}.jpg`;
    const markdown = template({ ...post, mediaFilename });
    // Determine output path
    const base = getFileBase(post);
    const mdPath = (0, slug_1.safeFilePath)(postsDir, base, ".md");
    fs.writeFileSync(mdPath, markdown, "utf-8");
    (0, logger_1.debug)(`[writer] Wrote: ${mdPath}`);
    return mdPath;
}
/**
 * Writes markdown files for a batch of posts.
 *
 * @param onWritten - Optional callback invoked with each written file's path.
 */
async function writePosts(posts, postsDir, imagesDir, onWritten) {
    for (const post of posts) {
        try {
            const filePath = await writePost(post, postsDir, imagesDir);
            onWritten?.(filePath);
        }
        catch (err) {
            process.stderr.write(`[writer] Failed to write post ${post.postId}: ${err.message}\n`);
        }
    }
}
//# sourceMappingURL=fileWriter.js.map