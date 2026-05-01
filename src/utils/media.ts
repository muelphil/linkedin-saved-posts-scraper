import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  isFfmpegAvailable,
  isFfprobeAvailable,
  probeFrames,
  convertStillToAvif as ffmpegConvertStill,
  convertAnimatedToAvif,
  convertAnimatedToWebp,
} from "./ffmpeg";
import { isSharpAvailable, convertStillToAvif as sharpConvertStill } from "./sharp";
import { debug, warn } from "./logger";

export interface MediaConvertOptions {
  /** Target frame rate for animated output (default: 12). */
  fps?: number;
}

// ─── Semaphore ──────────────────────────────────────────────────────────────

class Semaphore {
  private count: number;
  private readonly queue: Array<() => void> = [];

  constructor(max: number) {
    this.count = max;
  }

  acquire(): Promise<void> {
    if (this.count > 0) {
      this.count--;
      return Promise.resolve();
    }
    return new Promise((resolve) => this.queue.push(resolve));
  }

  release(): void {
    if (this.queue.length > 0) {
      this.queue.shift()!();
    } else {
      this.count++;
    }
  }
}

let _semaphore: Semaphore | null = null;

function getSemaphore(): Semaphore {
  if (!_semaphore) {
    const max = Math.max(1, os.cpus().length - 1);
    _semaphore = new Semaphore(max);
  }
  return _semaphore;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns the first already-converted path that exists, or null. */
function findExistingConversion(inputPath: string): string | null {
  const base = inputPath.replace(/\.[^.]+$/, "");
  for (const ext of [".avif", ".webp"]) {
    const candidate = base + ext;
    if (candidate !== inputPath && fs.existsSync(candidate)) return candidate;
  }
  return null;
}

// ─── Main API ────────────────────────────────────────────────────────────────

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
export async function convertMedia(
  inputPath: string,
  opts: MediaConvertOptions = {},
): Promise<string> {
  const { fps = 12 } = opts;

  // Fast-path: a previous run already converted this file
  const existing = findExistingConversion(inputPath);
  if (existing) {
    debug(`[media] Already converted: ${path.basename(existing)}`);
    return existing;
  }

  if (!isFfmpegAvailable() && !isSharpAvailable()) {
    warn("[media] Neither ffmpeg nor sharp is available — media will not be converted.");
    return inputPath;
  }

  // Probe to determine single vs multi-frame
  let isMultiFrame = false;
  if (isFfprobeAvailable()) {
    try {
      const probe = await probeFrames(inputPath);
      isMultiFrame = probe.isMultiFrame;
      debug(
        `[media] Probe: ${path.basename(inputPath)} codec=${probe.codec} frames=${probe.frames} multi=${isMultiFrame}`,
      );
    } catch (probeErr) {
      warn(`[media] ffprobe failed for ${path.basename(inputPath)}: ${(probeErr as Error).message}`);
      // Assume single-frame on probe failure
    }
  }

  if (!isMultiFrame) {
    return convertSingleFrame(inputPath);
  }

  return convertMultiFrame(inputPath, fps);
}

async function convertSingleFrame(inputPath: string): Promise<string> {
  // Prefer sharp — much faster than libaom-av1
  if (isSharpAvailable()) {
    try {
      const out = await sharpConvertStill(inputPath);
      fs.unlinkSync(inputPath);
      debug(`[media] sharp → AVIF: ${path.basename(out)}`);
      return out;
    } catch (sharpErr) {
      warn(`[media] sharp failed, falling back to ffmpeg: ${(sharpErr as Error).message}`);
    }
  }

  if (!isFfmpegAvailable()) return inputPath;

  try {
    const out = await ffmpegConvertStill(inputPath);
    fs.unlinkSync(inputPath);
    debug(`[media] ffmpeg still → AVIF: ${path.basename(out)}`);
    return out;
  } catch (err) {
    warn(`[media] ffmpeg still conversion failed: ${(err as Error).message}`);
    return inputPath;
  }
}

async function convertMultiFrame(inputPath: string, fps: number): Promise<string> {
  if (!isFfmpegAvailable()) return inputPath;

  const sem = getSemaphore();
  await sem.acquire();
  try {
    const out = await convertAnimatedToAvif(inputPath, fps);
    fs.unlinkSync(inputPath);
    debug(`[media] ffmpeg animated → AVIF: ${path.basename(out)}`);
    return out;
  } catch (avifErr) {
    debug(`[media] animated AVIF failed, trying WebP: ${(avifErr as Error).message}`);
    try {
      const out = await convertAnimatedToWebp(inputPath, fps);
      fs.unlinkSync(inputPath);
      debug(`[media] ffmpeg animated → WebP: ${path.basename(out)}`);
      return out;
    } catch (webpErr) {
      warn(`[media] animated WebP fallback also failed: ${(webpErr as Error).message}`);
      return inputPath;
    }
  } finally {
    sem.release();
  }
}
