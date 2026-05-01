/**
 * Minimal logger.
 * debug() → only printed when the DEBUG environment variable is set.
 * warn()  → always printed to stderr.
 * error() → always printed to stderr.
 */
export declare function debug(msg: string): void;
export declare function warn(msg: string): void;
export declare function logError(msg: string): void;
