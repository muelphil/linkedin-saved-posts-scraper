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
exports.readCache = readCache;
exports.writeCache = writeCache;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const logger_1 = require("../utils/logger");
/**
 * Reads the cache file, returning the last scraped post ID or null.
 */
function readCache(cacheFilePath) {
    if (!fs.existsSync(cacheFilePath)) {
        return { lastPostId: null };
    }
    try {
        const raw = fs.readFileSync(cacheFilePath, "utf-8");
        return JSON.parse(raw);
    }
    catch {
        (0, logger_1.warn)("[cache] Failed to read cache, starting fresh.");
        return { lastPostId: null };
    }
}
/**
 * Writes the latest post ID to the cache file.
 * Should only be called after a fully successful run.
 */
function writeCache(cacheFilePath, lastPostId) {
    const dir = path.dirname(cacheFilePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const cache = { lastPostId };
    fs.writeFileSync(cacheFilePath, JSON.stringify(cache, null, 2), "utf-8");
    (0, logger_1.debug)(`[cache] Saved lastPostId: ${lastPostId}`);
}
//# sourceMappingURL=cache.js.map