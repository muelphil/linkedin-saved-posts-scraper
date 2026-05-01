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
exports.toSlug = toSlug;
exports.safeFilePath = safeFilePath;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Converts a string into a safe filename by removing or replacing
 * characters that are invalid in file paths on Windows and Unix.
 */
function toSlug(text) {
    return text
        .trim()
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, "") // remove invalid chars
        .replace(/\s+/g, " ") // collapse whitespace
        .replace(/\.+$/, "") // remove trailing dots
        .slice(0, 200) // max length
        .trim();
}
/**
 * Returns a non-conflicting file path, appending (1), (2), etc. if needed.
 * e.g. if "Title.md" exists, returns "Title (1).md", then "Title (2).md", etc.
 */
function safeFilePath(dir, base, ext) {
    const first = path.join(dir, `${base}${ext}`);
    if (!fs.existsSync(first))
        return first;
    let counter = 1;
    while (true) {
        const candidate = path.join(dir, `${base} (${counter})${ext}`);
        if (!fs.existsSync(candidate))
            return candidate;
        counter++;
    }
}
//# sourceMappingURL=slug.js.map