/**
 * Returns true if the `sharp` native module is available in this environment.
 */
export declare function isSharpAvailable(): boolean;
/**
 * Converts a single-frame image to AVIF using sharp (libvips).
 * Fast encoding with effort 3–4. Returns the output .avif path.
 */
export declare function convertStillToAvif(inputPath: string, effort?: number, quality?: number): Promise<string>;
