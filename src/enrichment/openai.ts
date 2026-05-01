import OpenAI from "openai";
import { Post } from "../types";
import { getSystemPrompt } from "./prompt";

const clientCache = new Map<string, OpenAI>();

function getClient(apiKey: string, baseURL?: string): OpenAI {
  const key = `${apiKey}|${baseURL ?? ""}`;
  if (!clientCache.has(key)) {
    clientCache.set(key, new OpenAI({ apiKey, baseURL: baseURL || undefined }));
  }
  return clientCache.get(key)!;
}

export interface EnrichmentResult {
  title: string;
  summary: string;
  tags: string[];
}

/**
 * Enriches a post with an AI-generated title and summary.
 * Returns null if enrichment fails (never throws).
 */
export async function enrichPost(
    post: Post,
    apiKey: string,
    model: string,
    baseURL?: string
): Promise<EnrichmentResult | null> {
  try {
    const openai = getClient(apiKey, baseURL);

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: getSystemPrompt() },
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
    const parsed = JSON.parse(raw) as EnrichmentResult;

    // Additional runtime guard (defensive)
    if (
        !parsed.title ||
        !parsed.summary ||
        !Array.isArray(parsed.tags) ||
        parsed.tags.length === 0
    ) {
      throw new Error("Incomplete enrichment response");
    }

    return parsed;
  } catch (err) {
    console.warn(
        `[enrichment] Failed for post ${post.postId}:`,
        (err as Error).message
    );
    return null;
  }
}


/**
 * Enriches a batch of posts in sequence.
 *
 * @param onProgress - Optional callback invoked after each post with (done, total).
 */
export async function enrichPosts(
    posts: Post[],
    apiKey: string,
    model: string,
    baseURL?: string,
    onProgress?: (done: number, total: number) => void
): Promise<Post[]> {
  const enriched: Post[] = [];

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const result = await enrichPost(post, apiKey, model, baseURL);
    enriched.push(result ? { ...post, enrichment: result } : post);
    onProgress?.(i + 1, posts.length);
  }

  return enriched;
}