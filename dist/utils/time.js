"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.relativeToAbsolute = relativeToAbsolute;
/**
 * Converts LinkedIn relative timestamps to absolute ISO date strings.
 *
 * LinkedIn uses formats like: "4d", "1w", "2mo", "1yr"
 * Sometimes also: "just now", "1h", "30m"
 */
function relativeToAbsolute(relative, now = new Date()) {
    const rel = relative.trim().toLowerCase();
    // "just now" or empty
    if (!rel || rel === "just now") {
        return now.toISOString();
    }
    const match = rel.match(/^(\d+)\s*(s|m|h|d|w|mo|yr|year|month|week|day|hour|min|sec)s?$/);
    if (!match) {
        // Cannot parse — return today as fallback
        return now.toISOString();
    }
    const amount = parseInt(match[1], 10);
    const unit = match[2];
    const result = new Date(now);
    switch (unit) {
        case "s":
        case "sec":
            result.setSeconds(result.getSeconds() - amount);
            break;
        case "m":
        case "min":
            result.setMinutes(result.getMinutes() - amount);
            break;
        case "h":
        case "hour":
            result.setHours(result.getHours() - amount);
            break;
        case "d":
        case "day":
            result.setDate(result.getDate() - amount);
            break;
        case "w":
        case "week":
            result.setDate(result.getDate() - amount * 7);
            break;
        case "mo":
        case "month":
            result.setMonth(result.getMonth() - amount);
            break;
        case "yr":
        case "year":
            result.setFullYear(result.getFullYear() - amount);
            break;
    }
    return result.toISOString();
}
//# sourceMappingURL=time.js.map