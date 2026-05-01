"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertToAvif = void 0;
exports.isFfmpegAvailable = isFfmpegAvailable;
exports.isFfprobeAvailable = isFfprobeAvailable;
exports.probeFrames = probeFrames;
exports.convertStillToAvif = convertStillToAvif;
exports.convertAnimatedToAvif = convertAnimatedToAvif;
exports.convertAnimatedToWebp = convertAnimatedToWebp;
const child_process_1 = require("child_process");
const logger_1 = require("../utils/logger");
let _ffmpegAvailable = null;
let _ffprobeAvailable = null;
/**
 * Returns true if ffmpeg is found on PATH (cached after first call).
 */
function isFfmpegAvailable() {
    if (_ffmpegAvailable !== null)
        return _ffmpegAvailable;
    try {
        (0, child_process_1.execSync)("ffmpeg -version", { stdio: "ignore" });
        _ffmpegAvailable = true;
    }
    catch {
        (0, logger_1.warn)("[ffmpeg] ffmpeg not found on PATH — media will not be converted to AVIF.");
        _ffmpegAvailable = false;
    }
    return _ffmpegAvailable;
}
/**
 * Returns true if ffprobe is found on PATH (cached after first call).
 */
function isFfprobeAvailable() {
    if (_ffprobeAvailable !== null)
        return _ffprobeAvailable;
    try {
        (0, child_process_1.execSync)("ffprobe -version", { stdio: "ignore" });
        _ffprobeAvailable = true;
    }
    catch {
        _ffprobeAvailable = false;
    }
    return _ffprobeAvailable;
}
// Codecs that are always multi-frame even when nb_frames is unavailable
const VIDEO_CODECS = new Set(["h264", "hevc", "vp8", "vp9", "av1", "mpeg4", "mpeg2video", "theora"]);
/**
 * Uses ffprobe to determine the frame count and codec of a media file.
 * Resolves with frame info used to route single-frame vs multi-frame conversion.
 */
function probeFrames(inputPath) {
    return new Promise((resolve, reject) => {
        (0, child_process_1.execFile)("ffprobe", ["-v", "quiet", "-show_streams", "-of", "json", inputPath], (err, stdout) => {
            if (err)
                return reject(err);
            try {
                const data = JSON.parse(stdout);
                const stream = data.streams?.[0] ?? {};
                const frames = parseInt(stream.nb_frames ?? "0", 10);
                const codec = stream.codec_name ?? "unknown";
                const isMultiFrame = frames > 1 || VIDEO_CODECS.has(codec);
                resolve({ frames: isNaN(frames) ? 0 : frames, codec, isMultiFrame });
            }
            catch (e) {
                reject(e);
            }
        });
    });
}
/**
 * Converts a still image to AVIF using ffmpeg (libaom-av1, still-picture mode).
 * Returns the output .avif path on success, rejects on failure.
 */
function convertStillToAvif(inputPath) {
    const outputPath = inputPath.replace(/\.[^.]+$/, "") + ".avif";
    return new Promise((resolve, reject) => {
        (0, child_process_1.execFile)("ffmpeg", ["-i", inputPath, "-c:v", "libaom-av1", "-still-picture", "1", "-crf", "30", "-b:v", "0", "-y", outputPath], (err) => {
            if (err)
                reject(err);
            else
                resolve(outputPath);
        });
    });
}
/** @deprecated Use convertStillToAvif */
exports.convertToAvif = convertStillToAvif;
/**
 * Encodes a multi-frame / video file as animated AVIF using libsvtav1.
 * Falls back gracefully if libsvtav1 is not installed (caller should catch).
 */
function convertAnimatedToAvif(inputPath, fps) {
    const outputPath = inputPath.replace(/\.[^.]+$/, "") + ".avif";
    const vfArgs = fps ? ["-vf", `fps=${fps}`] : [];
    return new Promise((resolve, reject) => {
        (0, child_process_1.execFile)("ffmpeg", ["-i", inputPath, ...vfArgs, "-c:v", "libsvtav1", "-preset", "8", "-crf", "35", "-b:v", "0", "-an", "-y", outputPath], (err) => {
            if (err)
                reject(err);
            else
                resolve(outputPath);
        });
    });
}
/**
 * Encodes a multi-frame / video file as animated WebP.
 * Used as a fallback when animated AVIF encoding fails.
 */
function convertAnimatedToWebp(inputPath, fps) {
    const outputPath = inputPath.replace(/\.[^.]+$/, "") + ".webp";
    const vfArgs = fps ? ["-vf", `fps=${fps}`] : [];
    return new Promise((resolve, reject) => {
        (0, child_process_1.execFile)("ffmpeg", ["-i", inputPath, ...vfArgs, "-vcodec", "libwebp", "-loop", "0", "-quality", "75", "-an", "-y", outputPath], (err) => {
            if (err)
                reject(err);
            else
                resolve(outputPath);
        });
    });
}
//# sourceMappingURL=ffmpeg.js.map