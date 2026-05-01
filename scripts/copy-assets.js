const fs = require("fs");
const path = require("path");

const src = path.resolve(__dirname, "../src/enrichment/default_system_prompt.md");
const dest = path.resolve(__dirname, "../dist/enrichment/default_system_prompt.md");

// ensure destination folder exists
fs.mkdirSync(path.dirname(dest), { recursive: true });

// copy file
fs.copyFileSync(src, dest);

console.log("Copied system prompt to dist/enrichment");