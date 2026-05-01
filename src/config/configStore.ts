import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

export const configDir = path.join(os.homedir(), ".linkedin-scraper");
export const configFilePath = path.join(configDir, "config.json");
export const authStatePath = path.join(configDir, "auth.json");
export const systemPromptPath = path.join(configDir, "system_prompt.md");
export const postTemplatePath = path.join(configDir, "post.hbs");

// ---------------------------------------------------------------------------
// Stored config shape
// ---------------------------------------------------------------------------

export interface StoredEncryptedKey {
  iv: string;
  data: string;
}

export interface StoredConfig {
  postsOutputDir?: string;
  imagesOutputDir?: string;
  cacheDir?: string;
  openaiModel?: string;
  openaiEndpoint?: string;
  openaiApiKey?: StoredEncryptedKey;
}

// ---------------------------------------------------------------------------
// AES-256-CBC encryption using a machine-derived key
// ---------------------------------------------------------------------------

function getMachineKey(): Buffer {
  const fingerprint =
    os.hostname() + os.userInfo().username + process.platform;
  return crypto.createHash("sha256").update(fingerprint).digest();
}

export function encryptApiKey(plain: string): StoredEncryptedKey {
  const key = getMachineKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  return { iv: iv.toString("hex"), data: encrypted.toString("hex") };
}

export function decryptApiKey(stored: StoredEncryptedKey): string {
  const key = getMachineKey();
  const iv = Buffer.from(stored.iv, "hex");
  const data = Buffer.from(stored.data, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8"
  );
}

// ---------------------------------------------------------------------------
// Read / write
// ---------------------------------------------------------------------------

export function readConfig(): StoredConfig {
  if (!fs.existsSync(configFilePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(configFilePath, "utf-8")) as StoredConfig;
  } catch {
    return {};
  }
}

export function writeConfig(partial: StoredConfig): void {
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
  const current = readConfig();
  const merged = { ...current, ...partial };
  fs.writeFileSync(configFilePath, JSON.stringify(merged, null, 2), "utf-8");
}

// ---------------------------------------------------------------------------
// Convenience: get decrypted API key or empty string
// ---------------------------------------------------------------------------

export function getApiKey(): string {
  const cfg = readConfig();
  if (!cfg.openaiApiKey) return "";
  try {
    return decryptApiKey(cfg.openaiApiKey);
  } catch {
    return "";
  }
}
