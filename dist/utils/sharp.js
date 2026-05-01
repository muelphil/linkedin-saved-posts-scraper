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
exports.isSharpAvailable = isSharpAvailable;
exports.convertStillToAvif = convertStillToAvif;
const path = __importStar(require("path"));
let _sharp = undefined;
function getSharp() {
    if (_sharp !== undefined)
        return _sharp;
    try {
        // Dynamic require so the module stays optional — callers should guard with isSharpAvailable()
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        _sharp = require("sharp");
    }
    catch {
        _sharp = null;
    }
    return _sharp;
}
/**
 * Returns true if the `sharp` native module is available in this environment.
 */
function isSharpAvailable() {
    return getSharp() !== null;
}
/**
 * Converts a single-frame image to AVIF using sharp (libvips).
 * Fast encoding with effort 3–4. Returns the output .avif path.
 */
async function convertStillToAvif(inputPath, effort = 4, quality = 50) {
    const sharp = getSharp();
    if (!sharp)
        throw new Error("sharp is not available");
    const outputPath = path.join(path.dirname(inputPath), path.basename(inputPath, path.extname(inputPath)) + ".avif");
    await sharp(inputPath).avif({ effort, quality }).toFile(outputPath);
    return outputPath;
}
//# sourceMappingURL=sharp.js.map