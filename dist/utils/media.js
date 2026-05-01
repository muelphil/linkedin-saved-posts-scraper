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
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertMedia = convertMedia;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const ffmpeg_1 = require("./ffmpeg");
const sharp_1 = require("./sharp");
const logger_1 = require("./logger");
// ─── Semaphore ──────────────────────────────────────────────────────────────
class Semaphore {
    count;
    queue = [];
    constructor(max) {
        this.count = max;
    }
    acquire() {
        if (this.count > 0) {
            this.count--;
            return Promise.resolve();
        }
        return new Promise((resolve) => this.queue.push(resolve));
    }
    release() {
        if (this.queue.length > 0) {
            this.queue.shift()();
        }
        else {
            this.count++;
        }
    }
}
let _semaphore = null;
function getSemaphore() {
    if (!_semaphore) {
        const max = Math.max(1, os.cpus().length - 1);
        _semaphore = new Semaphore(max);
    }
    return _semaphore;
}
// ─── Helpers ─────────────────────────────────────────────────────────────────
/** Returns the first already-converted path that exists, or null. */
function findExistingConversion(inputPath) {
    const base = inputPath.replace(/\.[^.]+$/, "");
    for (const ext of [".avif", ".webp"]) {
        const candidate = base + ext;
        if (candidate !== inputPath && fs.existsSync(candidate))
            return candidate;
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
async function convertMedia(inputPath, opts = {}) {
    const { fps = 12 } = opts;
    // Fast-path: a previous run already converted this file
    const existing = findExistingConversion(inputPath);
    if (existing) {
        (0, logger_1.debug)(`[media] Already converted: ${path.basename(existing)}`);
        return existing;
    }
    if (!(0, ffmpeg_1.isFfmpegAvailable)() && !(0, sharp_1.isSharpAvailable)()) {
        (0, logger_1.warn)("[media] Neither ffmpeg nor sharp is available — media will not be converted.");
        return inputPath;
    }
    // Probe to determine single vs multi-frame
    let isMultiFrame = false;
    if ((0, ffmpeg_1.isFfprobeAvailable)()) {
        try {
            const probe = await (0, ffmpeg_1.probeFrames)(inputPath);
            isMultiFrame = probe.isMultiFrame;
            (0, logger_1.debug)(`[media] Probe: ${path.basename(inputPath)} codec=${probe.codec} frames=${probe.frames} multi=${isMultiFrame}`);
        }
        catch (probeErr) {
            (0, logger_1.warn)(`[media] ffprobe failed for ${path.basename(inputPath)}: ${probeErr.message}`);
            // Assume single-frame on probe failure
        }
    }
    if (!isMultiFrame) {
        return convertSingleFrame(inputPath);
    }
    return convertMultiFrame(inputPath, fps);
}
async function convertSingleFrame(inputPath) {
    // Prefer sharp — much faster than libaom-av1
    if ((0, sharp_1.isSharpAvailable)()) {
        try {
            const out = await (0, sharp_1.convertStillToAvif)(inputPath);
            fs.unlinkSync(inputPath);
            (0, logger_1.debug)(`[media] sharp → AVIF: ${path.basename(out)}`);
            return out;
        }
        catch (sharpErr) {
            (0, logger_1.warn)(`[media] sharp failed, falling back to ffmpeg: ${sharpErr.message}`);
        }
    }
    if (!(0, ffmpeg_1.isFfmpegAvailable)())
        return inputPath;
    try {
        const out = await (0, ffmpeg_1.convertStillToAvif)(inputPath);
        fs.unlinkSync(inputPath);
        (0, logger_1.debug)(`[media] ffmpeg still → AVIF: ${path.basename(out)}`);
        return out;
    }
    catch (err) {
        (0, logger_1.warn)(`[media] ffmpeg still conversion failed: ${err.message}`);
        return inputPath;
    }
}
async function convertMultiFrame(inputPath, fps) {
    if (!(0, ffmpeg_1.isFfmpegAvailable)())
        return inputPath;
    const sem = getSemaphore();
    await sem.acquire();
    try {
        const out = await (0, ffmpeg_1.convertAnimatedToAvif)(inputPath, fps);
        fs.unlinkSync(inputPath);
        (0, logger_1.debug)(`[media] ffmpeg animated → AVIF: ${path.basename(out)}`);
        return out;
    }
    catch (avifErr) {
        (0, logger_1.debug)(`[media] animated AVIF failed, trying WebP: ${avifErr.message}`);
        try {
            const out = await (0, ffmpeg_1.convertAnimatedToWebp)(inputPath, fps);
            fs.unlinkSync(inputPath);
            (0, logger_1.debug)(`[media] ffmpeg animated → WebP: ${path.basename(out)}`);
            return out;
        }
        catch (webpErr) {
            (0, logger_1.warn)(`[media] animated WebP fallback also failed: ${webpErr.message}`);
            return inputPath;
        }
    }
    finally {
        sem.release();
    }
}
//# sourceMappingURL=media.js.map