/**
 * Returns true if ffmpeg is found on PATH (cached after first call).
 */
export declare function isFfmpegAvailable(): boolean;
/**
 * Returns true if ffprobe is found on PATH (cached after first call).
 */
export declare function isFfprobeAvailable(): boolean;
export interface ProbeResult {
    frames: number;
    codec: string;
    /** True when the file contains more than one frame (animated / video). */
    isMultiFrame: boolean;
}
/**
 * Uses ffprobe to determine the frame count and codec of a media file.
 * Resolves with frame info used to route single-frame vs multi-frame conversion.
 */
export declare function probeFrames(inputPath: string): Promise<ProbeResult>;
/**
 * Converts a still image to AVIF using ffmpeg (libaom-av1, still-picture mode).
 * Returns the output .avif path on success, rejects on failure.
 */
export declare function convertStillToAvif(inputPath: string): Promise<string>;
/** @deprecated Use convertStillToAvif */
export declare const convertToAvif: typeof convertStillToAvif;
/**
 * Encodes a multi-frame / video file as animated AVIF using libsvtav1.
 * Falls back gracefully if libsvtav1 is not installed (caller should catch).
 */
export declare function convertAnimatedToAvif(inputPath: string, fps?: number): Promise<string>;
/**
 * Encodes a multi-frame / video file as animated WebP.
 * Used as a fallback when animated AVIF encoding fails.
 */
export declare function convertAnimatedToWebp(inputPath: string, fps?: number): Promise<string>;
