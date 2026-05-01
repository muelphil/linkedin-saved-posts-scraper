"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enrichPost = enrichPost;
exports.enrichPosts = enrichPosts;
const openai_1 = __importDefault(require("openai"));
const prompt_1 = require("./prompt");
const clientCache = new Map();
function getClient(apiKey, baseURL) {
    const key = `${apiKey}|${baseURL ?? ""}`;
    if (!clientCache.has(key)) {
        clientCache.set(key, new openai_1.default({ apiKey, baseURL: baseURL || undefined }));
    }
    return clientCache.get(key);
}
/**
 * Enriches a post with an AI-generated title and summary.
 * Returns null if enrichment fails (never throws).
 */
async function enrichPost(post, apiKey, model, baseURL) {
    try {
        const openai = getClient(apiKey, baseURL);
        const response = await openai.chat.completions.create({
            model,
            messages: [
                { role: "system", content: (0, prompt_1.getSystemPrompt)() },
                { role: "user", content: `<!-- LinkedIn post content -->\n${post.content}` },
            ],
            temperature: 0.0,
            response_format: {
                type: "json_schema",
                json_schema: {
                    name: "enrichment",
                    schema: {
                        type: "object",
                        additionalProperties: false,
                        required: ["title", "summary", "tags"],
                        properties: {
                            title: {
                                type: "string",
                                maxLength: 128,
                            },
                            summary: {
                                type: "string",
                                maxLength: 768,
                            },
                            tags: {
                                type: "array",
                                minItems: 1,
                                maxItems: 4,
                                items: {
                                    type: "string",
                                    pattern: "^#.+",
                                    maxLength: 80,
                                },
                            },
                        },
                    },
                },
            },
        });
        const raw = response.choices[0]?.message?.content ?? "";
        const parsed = JSON.parse(raw);
        // Additional runtime guard (defensive)
        if (!parsed.title ||
            !parsed.summary ||
            !Array.isArray(parsed.tags) ||
            parsed.tags.length === 0) {
            throw new Error("Incomplete enrichment response");
        }
        return parsed;
    }
    catch (err) {
        console.warn(`[enrichment] Failed for post ${post.postId}:`, err.message);
        return null;
    }
}
/**
 * Enriches a batch of posts in sequence.
 *
 * @param onProgress - Optional callback invoked after each post with (done, total).
 */
async function enrichPosts(posts, apiKey, model, baseURL, onProgress) {
    const enriched = [];
    for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        const result = await enrichPost(post, apiKey, model, baseURL);
        enriched.push(result ? { ...post, enrichment: result } : post);
        onProgress?.(i + 1, posts.length);
    }
    return enriched;
}
//# sourceMappingURL=openai.js.map