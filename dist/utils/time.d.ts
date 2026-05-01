/**
 * Converts LinkedIn relative timestamps to absolute ISO date strings.
 *
 * LinkedIn uses formats like: "4d", "1w", "2mo", "1yr"
 * Sometimes also: "just now", "1h", "30m"
 */
export declare function relativeToAbsolute(relative: string, now?: Date): string;
