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
exports.ensureSystemPromptFile = ensureSystemPromptFile;
exports.getSystemPrompt = getSystemPrompt;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const configStore_1 = require("../config/configStore");
/**
 * Creates ~/.linkedin-scraper/system_prompt.md with default content if it doesn't exist.
 */
function ensureSystemPromptFile() {
    const dir = path.dirname(configStore_1.systemPromptPath);
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(configStore_1.systemPromptPath)) {
        const defaultPrompt = fs.readFileSync(path.join(__dirname, "default_system_prompt.md"), "utf-8");
        fs.writeFileSync(configStore_1.systemPromptPath, defaultPrompt, "utf-8");
    }
}
/**
 * Returns the system prompt text.
 * Reads from ~/.linkedin-scraper/system_prompt.md, creating the file with
 * default content if it does not yet exist.
 */
function getSystemPrompt() {
    ensureSystemPromptFile();
    return fs.readFileSync(configStore_1.systemPromptPath, "utf-8").trim();
}
//# sourceMappingURL=prompt.js.map