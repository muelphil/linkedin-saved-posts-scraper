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
exports.postTemplatePath = exports.systemPromptPath = exports.authStatePath = exports.configFilePath = exports.configDir = void 0;
exports.encryptApiKey = encryptApiKey;
exports.decryptApiKey = decryptApiKey;
exports.readConfig = readConfig;
exports.writeConfig = writeConfig;
exports.getApiKey = getApiKey;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
exports.configDir = path.join(os.homedir(), ".linkedin-scraper");
exports.configFilePath = path.join(exports.configDir, "config.json");
exports.authStatePath = path.join(exports.configDir, "auth.json");
exports.systemPromptPath = path.join(exports.configDir, "system_prompt.md");
exports.postTemplatePath = path.join(exports.configDir, "post.hbs");
// ---------------------------------------------------------------------------
// AES-256-CBC encryption using a machine-derived key
// ---------------------------------------------------------------------------
function getMachineKey() {
    const fingerprint = os.hostname() + os.userInfo().username + process.platform;
    return crypto.createHash("sha256").update(fingerprint).digest();
}
function encryptApiKey(plain) {
    const key = getMachineKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    const encrypted = Buffer.concat([
        cipher.update(plain, "utf8"),
        cipher.final(),
    ]);
    return { iv: iv.toString("hex"), data: encrypted.toString("hex") };
}
function decryptApiKey(stored) {
    const key = getMachineKey();
    const iv = Buffer.from(stored.iv, "hex");
    const data = Buffer.from(stored.data, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
// ---------------------------------------------------------------------------
// Read / write
// ---------------------------------------------------------------------------
function readConfig() {
    if (!fs.existsSync(exports.configFilePath))
        return {};
    try {
        return JSON.parse(fs.readFileSync(exports.configFilePath, "utf-8"));
    }
    catch {
        return {};
    }
}
function writeConfig(partial) {
    if (!fs.existsSync(exports.configDir))
        fs.mkdirSync(exports.configDir, { recursive: true });
    const current = readConfig();
    const merged = { ...current, ...partial };
    fs.writeFileSync(exports.configFilePath, JSON.stringify(merged, null, 2), "utf-8");
}
// ---------------------------------------------------------------------------
// Convenience: get decrypted API key or empty string
// ---------------------------------------------------------------------------
function getApiKey() {
    const cfg = readConfig();
    if (!cfg.openaiApiKey)
        return "";
    try {
        return decryptApiKey(cfg.openaiApiKey);
    }
    catch {
        return "";
    }
}
//# sourceMappingURL=configStore.js.map