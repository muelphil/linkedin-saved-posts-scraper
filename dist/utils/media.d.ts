export interface MediaConvertOptions {
    /** Target frame rate for animated output (default: 12). */
    fps?: number;
}
/**
 * Converts a downloaded media file to AVIF (or animated WebP for multi-frame on failure).
 *
 * Routing:
 *  - Single-frame  → sharp (fast AVIF, effort 4) or ffmpeg still fallback
 *  - Multi-frame   → ffmpeg libsvtav1 animated AVIF (semaphore-capped) → WebP fallback
 *
 * If ffmpeg is unavailable or all conversion paths fail, returns the original path unchanged.
 * Deletes the original file on successful conversion.
 */
export declare function convertMedia(inputPath: string, opts?: MediaConvertOptions): Promise<string>;
