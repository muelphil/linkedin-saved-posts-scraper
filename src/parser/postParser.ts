import {JSDOM} from "jsdom";
import {Post} from "../types";
import {selectors} from "./selectors";

function getFormattedText(el: ChildNode): string {
    return Array.from(el.childNodes)
        .map((node: ChildNode) => {
            if (node.nodeType === 3) { // Text Node
                return node.textContent;
            } else if (node.nodeName === 'BR') {
                return '\n';
            }
            // If there are nested elements (like <span>), recurse:
            return getFormattedText(node);
        })
        .join('');
}

/**
 * Extracts the activity ID from a LinkedIn URN string.
 * e.g. "urn:li:activity:7452762708673916928" → "7452762708673916928"
 */
function extractActivityId(urn: string): string {
    const match = urn.match(/urn:li:activity:(\d+)/);
    return match?.[1] ?? urn;
}

function decodeHexEntities(str: string): string {
    return str.replace(/&#x([0-9a-fA-F]+);/g, (_: string, hex: string) =>
        String.fromCodePoint(parseInt(hex, 16))
    );
}

/**
 * Cleans text content by removing HTML comment artifacts (<!---->) and
 * collapsing excess whitespace.
 */
function cleanText(htmlContent: string): string {
    let result = htmlContent
        .replace(/<button[\s\S]*?<\/button>/gi, "") // Entfernt Button inkl. Inhalt
        .replace(/<!---->/g, "")                    // Entfernt Kommentare
        .replace(/<br\s*\/?>/gi, "\n")              // Ersetzt <br> durch \n
        .replace(/<[^>]+>/g, "")                    // Entfernt restliche HTML-Tags
        .replace(/[ \t]+/g, " ");                    // Normalisiert Leerzeichen (erhält \n)
    result = decodeHexEntities(result)
    return result.replace(/#/g, "\\#")
        .trim();
}

/**
 * Lightweight extraction of post IDs from all container elements in the document.
 * Much cheaper than a full parse — only reads the URN attribute per element.
 */
export function extractPostIds(html: string): string[] {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const containers = Array.from(document.querySelectorAll(selectors.postContainer));
    const ids: string[] = [];
    for (const el of containers) {
        const urn = el.getAttribute(selectors.postUrnAttr) ?? "";
        const match = urn.match(/urn:li:activity:(\d+)/);
        ids.push(match?.[1] ?? urn);
    }
    return ids;
}

/**
 * Parses only the provided container elements into Post objects.
 * Each post is parsed individually — failures are caught and logged per-post.
 */
export function parsePostsFromContainers(containers: Element[]): Post[] {
    const posts: Post[] = [];
    for (const el of containers) {
        try {
            posts.push(parsePostElement(el));
        } catch (err) {
            const urn = el.getAttribute(selectors.postUrnAttr) ?? "unknown";
            console.warn(`[parser] Skipping post ${urn}:`, (err as Error).message);
        }
    }
    return posts;
}

/**
 * Parses a single post container element into a Post object.
 * Throws if the postId cannot be determined.
 */
function parsePostElement(el: Element): Post {
    const urn = el.getAttribute(selectors.postUrnAttr) ?? "";
    const postId = extractActivityId(urn);
    if (!postId) throw new Error("No postId found");

    // Post URL
    const postLinkEl = el.querySelector(selectors.postLink);
    const postUrl = postLinkEl?.getAttribute("href")?.split("?")[0] ?? "";

    // Author image
    const authorImageEl = el.querySelector(selectors.authorImage) as HTMLImageElement | null;
    const authorImage = authorImageEl?.src ?? authorImageEl?.getAttribute("src") ?? undefined;

    // Author link and name
    const authorLinkEl = el.querySelector(selectors.authorLink) as HTMLAnchorElement | null;
    const authorUrl = authorLinkEl?.href?.split("?")[0] ?? authorLinkEl?.getAttribute("href")?.split("?")[0] ?? "";
    const authorNameEl = el.querySelector(selectors.authorName);
    const authorName = cleanText(authorNameEl?.textContent ?? "");

    // Author headline
    const headlineEl = el.querySelector(selectors.authorHeadline);
    const authorDescription = headlineEl ? cleanText(headlineEl.textContent ?? "") : undefined;

    // Timestamp — grab the aria-hidden span text, strip trailing " •" and trailing icon text
    const timestampSpanEl = el.querySelector(selectors.timestampSpan);
    let relativeTimestamp = cleanText(timestampSpanEl?.textContent ?? "");
    // Keep only the first token (e.g. "4d") before the bullet separator
    relativeTimestamp = relativeTimestamp.split("•")[0].trim();

    // Content
    const contentEl: HTMLElement | null = el.querySelector(selectors.content);
    const content = contentEl ? cleanText(contentEl!.innerHTML) : "";

    // Media: try video first, then fall back to image thumbnail
    const videoEl = el.querySelector(selectors.mediaVideo) as HTMLSourceElement | HTMLVideoElement | null;
    const videoSrc = videoEl?.getAttribute("src") ?? videoEl?.getAttribute("src");
    const mediaImageEl = el.querySelector(selectors.mediaImage) as HTMLImageElement | null;
    const mediaImageSrc = mediaImageEl?.src ?? mediaImageEl?.getAttribute("src");
    const media: Post["media"] = videoSrc
        ? {type: "video", url: videoSrc}
        : mediaImageSrc
            ? {type: "image", url: mediaImageSrc}
            : undefined;

    return {
        postId,
        postUrl,
        author: {
            name: authorName,
            url: authorUrl,
            image: authorImage,
            description: authorDescription,
        },
        timestamp: {
            relative: relativeTimestamp,
            absolute: "", // filled by time utils
        },
        content,
        media,
    };
}

/**
 * Parses an HTML string (full page or fragment) and returns all Post objects found.
 * Each post is parsed individually — failures are caught and logged per-post.
 *
 * @deprecated Use {@link extractPostIds} + {@link parsePostsFromContainers}
 * for better performance when stopPostId filtering is needed upstream.
 */
export function parsePostsFromHtml(html: string): Post[] {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const containers = Array.from(document.querySelectorAll(selectors.postContainer));
    return parsePostsFromContainers(containers);
}
