import * as path from "path";
import * as fs from "fs";
import {
  readConfig,
  authStatePath,
  getApiKey,
} from "./config/configStore";

function requireCfg(key: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required config: "${key}". Run "linkedin-scraper init" to configure.`
    );
  }
  return value;
}

const cfg = readConfig();

export const config = {
  authStatePath,
  linkedinSavedUrl: "https://www.linkedin.com/my-items/saved-posts/",
  postsOutputDir: path.resolve(
    requireCfg("postsOutputDir", cfg.postsOutputDir)
  ),
  imagesOutputDir: path.resolve(
    requireCfg("imagesOutputDir", cfg.imagesOutputDir)
  ),
  cacheFilePath: path.join(
    path.resolve(requireCfg("cacheDir", cfg.cacheDir)),
    "cache.json"
  ),
  openaiApiKey: getApiKey(),
  openaiModel: cfg.openaiModel ?? "gpt-4o-mini",
  openaiEndpoint: cfg.openaiEndpoint || undefined,
  maxScrollIterations: 50,
  scrollDelayMin: 800,
  scrollDelayMax: 2000,
};

// Ensure output directories exist
for (const dir of [
  config.postsOutputDir,
  config.imagesOutputDir,
  path.dirname(config.cacheFilePath),
]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

