/**
 * Minimal logger.
 * debug() → only printed when the DEBUG environment variable is set.
 * warn()  → always printed to stderr.
 * error() → always printed to stderr.
 */

const DEBUG_ENABLED = !!process.env.DEBUG;

export function debug(msg: string): void {
  if (DEBUG_ENABLED) process.stderr.write(`[debug] ${msg}\n`);
}

export function warn(msg: string): void {
  process.stderr.write(`${msg}\n`);
}

export function logError(msg: string): void {
  process.stderr.write(`${msg}\n`);
}
