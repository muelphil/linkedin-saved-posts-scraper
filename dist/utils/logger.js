"use strict";
/**
 * Minimal logger.
 * debug() → only printed when the DEBUG environment variable is set.
 * warn()  → always printed to stderr.
 * error() → always printed to stderr.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.debug = debug;
exports.warn = warn;
exports.logError = logError;
const DEBUG_ENABLED = !!process.env.DEBUG;
function debug(msg) {
    if (DEBUG_ENABLED)
        process.stderr.write(`[debug] ${msg}\n`);
}
function warn(msg) {
    process.stderr.write(`${msg}\n`);
}
function logError(msg) {
    process.stderr.write(`${msg}\n`);
}
//# sourceMappingURL=logger.js.map