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
exports.config = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const configStore_1 = require("./config/configStore");
function requireCfg(key, value) {
    if (!value) {
        throw new Error(`Missing required config: "${key}". Run "linkedin-scraper init" to configure.`);
    }
    return value;
}
const cfg = (0, configStore_1.readConfig)();
exports.config = {
    authStatePath: configStore_1.authStatePath,
    linkedinSavedUrl: "https://www.linkedin.com/my-items/saved-posts/",
    postsOutputDir: path.resolve(requireCfg("postsOutputDir", cfg.postsOutputDir)),
    imagesOutputDir: path.resolve(requireCfg("imagesOutputDir", cfg.imagesOutputDir)),
    cacheFilePath: path.join(path.resolve(requireCfg("cacheDir", cfg.cacheDir)), "cache.json"),
    openaiApiKey: (0, configStore_1.getApiKey)(),
    openaiModel: cfg.openaiModel ?? "gpt-4o-mini",
    openaiEndpoint: cfg.openaiEndpoint || undefined,
    maxScrollIterations: 50,
    scrollDelayMin: 800,
    scrollDelayMax: 2000,
};
// Ensure output directories exist
for (const dir of [
    exports.config.postsOutputDir,
    exports.config.imagesOutputDir,
    path.dirname(exports.config.cacheFilePath),
]) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}
//# sourceMappingURL=config.js.map