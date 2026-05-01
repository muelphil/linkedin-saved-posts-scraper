import { execSync, execFile } from "child_process";
import { warn } from "../utils/logger";

let _ffmpegAvailable: boolean | null = null;
let _ffprobeAvailable: boolean | null = null;

/**
 * Returns true if ffmpeg is found on PATH (cached after first call).
 */
export function isFfmpegAvailable(): boolean {
  if (_ffmpegAvailable !== null) return _ffmpegAvailable;
  try {
    execSync("ffmpeg -version", { stdio: "ignore" });
    _ffmpegAvailable = true;
  } catch {
    warn("[ffmpeg] ffmpeg not found on PATH — media will not be converted to AVIF.");
    _ffmpegAvailable = false;
  }
  return _ffmpegAvailable;
}

/**
 * Returns true if ffprobe is found on PATH (cached after first call).
 */
export function isFfprobeAvailable(): boolean {
  if (_ffprobeAvailable !== null) return _ffprobeAvailable;
  try {
    execSync("ffprobe -version", { stdio: "ignore" });
    _ffprobeAvailable = true;
  } catch {
    _ffprobeAvailable = false;
  }
  return _ffprobeAvailable;
}

export interface ProbeResult {
  frames: number;
  codec: string;
  /** True when the file contains more than one frame (animated / video). */
  isMultiFrame: boolean;
}

// Codecs that are always multi-frame even when nb_frames is unavailable
const VIDEO_CODECS = new Set(["h264", "hevc", "vp8", "vp9", "av1", "mpeg4", "mpeg2video", "theora"]);

/**
 * Uses ffprobe to determine the frame count and codec of a media file.
 * Resolves with frame info used to route single-frame vs multi-frame conversion.
 */
export function probeFrames(inputPath: string): Promise<ProbeResult> {
  return new Promise((resolve, reject) => {
    execFile(
      "ffprobe",
      ["-v", "quiet", "-show_streams", "-of", "json", inputPath],
      (err, stdout) => {
        if (err) return reject(err);
        try {
          const data = JSON.parse(stdout);
          const stream = data.streams?.[0] ?? {};
          const frames = parseInt(stream.nb_frames ?? "0", 10);
          const codec: string = stream.codec_name ?? "unknown";
          const isMultiFrame = frames > 1 || VIDEO_CODECS.has(codec);
          resolve({ frames: isNaN(frames) ? 0 : frames, codec, isMultiFrame });
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

/**
 * Converts a still image to AVIF using ffmpeg (libaom-av1, still-picture mode).
 * Returns the output .avif path on success, rejects on failure.
 */
export function convertStillToAvif(inputPath: string): Promise<string> {
  const outputPath = inputPath.replace(/\.[^.]+$/, "") + ".avif";
  return new Promise((resolve, reject) => {
    execFile(
      "ffmpeg",
      ["-i", inputPath, "-c:v", "libaom-av1", "-still-picture", "1", "-crf", "30", "-b:v", "0", "-y", outputPath],
      (err) => {
        if (err) reject(err);
        else resolve(outputPath);
      }
    );
  });
}

/** @deprecated Use convertStillToAvif */
export const convertToAvif = convertStillToAvif;

/**
 * Encodes a multi-frame / video file as animated AVIF using libsvtav1.
 * Falls back gracefully if libsvtav1 is not installed (caller should catch).
 */
export function convertAnimatedToAvif(inputPath: string, fps?: number): Promise<string> {
  const outputPath = inputPath.replace(/\.[^.]+$/, "") + ".avif";
  const vfArgs: string[] = fps ? ["-vf", `fps=${fps}`] : [];
  return new Promise((resolve, reject) => {
    execFile(
      "ffmpeg",
      ["-i", inputPath, ...vfArgs, "-c:v", "libsvtav1", "-preset", "8", "-crf", "35", "-b:v", "0", "-an", "-y", outputPath],
      (err) => {
        if (err) reject(err);
        else resolve(outputPath);
      }
    );
  });
}

/**
 * Encodes a multi-frame / video file as animated WebP.
 * Used as a fallback when animated AVIF encoding fails.
 */
export function convertAnimatedToWebp(inputPath: string, fps?: number): Promise<string> {
  const outputPath = inputPath.replace(/\.[^.]+$/, "") + ".webp";
  const vfArgs: string[] = fps ? ["-vf", `fps=${fps}`] : [];
  return new Promise((resolve, reject) => {
    execFile(
      "ffmpeg",
      ["-i", inputPath, ...vfArgs, "-vcodec", "libwebp", "-loop", "0", "-quality", "75", "-an", "-y", outputPath],
      (err) => {
        if (err) reject(err);
        else resolve(outputPath);
      }
    );
  });
}
