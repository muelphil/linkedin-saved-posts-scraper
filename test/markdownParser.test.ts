/**
 * Round-trip tests for src/parser/markdownParser.ts.
 *
 * Run with: npm run test:markdown
 *
 * Tests:
 * 1. Parse unenriched post (CRLF fixture) — assert all fields
 * 2. Parse enriched post — assert summary, tags, content excludes callout
 * 3. Parse post with extra user-added frontmatter fields
 * 4. Round-trip: parse unenriched → apply mock enrichment → write to temp → re-parse → verify
 * 5. renderFrontmatter preserves extra user fields
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { parseMarkdownPost, hasSummary, renderFrontmatter } from "../src/parser/markdownParser";

const FIXTURES = path.join(__dirname, "fixtures");

let pass = 0;
let fail = 0;

function assert(label: string, condition: boolean, detail?: string): void {
  if (condition) {
    console.log(`  ✓ ${label}`);
    pass++;
  } else {
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
    fail++;
  }
}

function assertEq<T>(label: string, actual: T, expected: T): void {
  assert(label, actual === expected, `got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
}

function section(title: string): void {
  console.log(`\n${title}`);
}

// ---------------------------------------------------------------------------
// Test 1: Parse unenriched post (CRLF in source, LF in fixture after copy)
// ---------------------------------------------------------------------------
section("1. Unenriched post (LF fixture)");
{
  // Read with explicit CRLF simulation to ensure parser handles both
  const lf = fs.readFileSync(path.join(FIXTURES, "unenriched-post.md"), "utf-8");
  const crlf = lf.replace(/\n/g, "\r\n");

  for (const [label, content] of [["LF", lf], ["CRLF", crlf]] as [string, string][]) {
    const p = parseMarkdownPost(content);
    assert(`parse succeeds (${label})`, p !== null);
    if (!p) continue;
    assertEq(`title (${label})`, p.title, "7424746195719258112");
    assertEq(`postId (${label})`, p.postId, "7424746195719258112");
    assertEq(`author (${label})`, p.author, "Zain Hasan");
    assertEq(`summary is null (${label})`, p.summary, null);
    assertEq(`hasSummary false (${label})`, hasSummary(p), false);
    assert(`tags includes #linkedin (${label})`, p.tags.includes("#linkedin"));
    assert(`content not empty (${label})`, p.content.length > 0);
    assert(`content does not include callout (${label})`, !p.content.includes("> [!summary]"));
    assert(`content does not include image embed (${label})`, !p.content.includes("![["));
    assert(`timestamp is ISO string (${label})`, /^\d{4}-\d{2}-\d{2}T/.test(p.timestamp));
  }
}

// ---------------------------------------------------------------------------
// Test 2: Parse enriched post
// ---------------------------------------------------------------------------
section("2. Enriched post");
{
  const raw = fs.readFileSync(path.join(FIXTURES, "enriched-post.md"), "utf-8");
  const p = parseMarkdownPost(raw);
  assert("parse succeeds", p !== null);
  if (p) {
    assertEq("title", p.title, "Deepseek R1 RL Training Oddities");
    assertEq("summary present", hasSummary(p), true);
    assert("summary not empty", (p.summary?.length ?? 0) > 0);
    assert("tags include #llm", p.tags.includes("#llm"));
    assert("tags include #research", p.tags.includes("#research"));
    assert("content does not contain callout", !p.content.includes("> [!summary]"));
    assert("content does not contain image embed", !p.content.includes("![["));
    assert("content contains actual text", p.content.includes("RL"));
  }
}

// ---------------------------------------------------------------------------
// Test 3: Parse post with extra user fields
// ---------------------------------------------------------------------------
section("3. Extra user-added frontmatter fields");
{
  const raw = fs.readFileSync(path.join(FIXTURES, "extra-fields-post.md"), "utf-8");
  const p = parseMarkdownPost(raw);
  assert("parse succeeds", p !== null);
  if (p) {
    assertEq("custom field preserved in data", p.data["custom"] as string, "user-added-field");
    assertEq("rating field preserved in data", p.data["rating"] as number, 5);
  }
}

// ---------------------------------------------------------------------------
// Test 4: Round-trip — parse → enrich → write → re-parse
// ---------------------------------------------------------------------------
section("4. Round-trip write-back");
{
  const raw = fs.readFileSync(path.join(FIXTURES, "unenriched-post.md"), "utf-8");
  const parsed = parseMarkdownPost(raw);
  assert("initial parse succeeds", parsed !== null);

  if (parsed) {
    const mockEnrichment = {
      title: "Mock Enriched Title",
      summary: "A mock summary about RL and LLMs.",
      tags: ["#llm", "#research"],
    };

    // Simulate writeBackEnrichment logic
    const { escapeForYaml: esc } = require("../src/parser/markdownParser");
    const yaml = renderFrontmatter(parsed.data, {
      title: mockEnrichment.title,
      summary: mockEnrichment.summary,
      tags: ["#linkedin", ...mockEnrichment.tags.filter((t) => t !== "#linkedin")],
    });

    const imageLineIdx = parsed.rawBody.search(/!\[\[.*?\]\]/);
    const bodyFromImage =
      imageLineIdx >= 0 ? parsed.rawBody.substring(imageLineIdx) : parsed.rawBody;
    const newBody = `\n> [!summary]\n> ${esc(mockEnrichment.summary)}\n\n${bodyFromImage}`;

    const tmpPath = path.join(os.tmpdir(), `markdownParser-test-${Date.now()}.md`);
    fs.writeFileSync(tmpPath, `---\n${yaml}\n---\n${newBody}`, "utf-8");

    const reread = fs.readFileSync(tmpPath, "utf-8");
    const reparsed = parseMarkdownPost(reread);
    assert("re-parse succeeds", reparsed !== null);

    if (reparsed) {
      assertEq("title updated", reparsed.title, mockEnrichment.title);
      assertEq("summary updated", reparsed.summary, mockEnrichment.summary);
      assertEq("hasSummary true", hasSummary(reparsed), true);
      assertEq("postId preserved", reparsed.postId, parsed.postId);
      assertEq("author preserved", reparsed.author, parsed.author);
      assertEq("timestamp preserved", reparsed.timestamp, parsed.timestamp);
      assert("tags include #linkedin", reparsed.tags.includes("#linkedin"));
      assert("tags include #llm", reparsed.tags.includes("#llm"));
      assert("content preserved", reparsed.content === parsed.content);
      assert("content does not contain callout", !reparsed.content.includes("> [!summary]"));
    }

    fs.unlinkSync(tmpPath);
    assert("temp file cleaned up", !fs.existsSync(tmpPath));
  }
}

// ---------------------------------------------------------------------------
// Test 5: renderFrontmatter preserves extra user fields
// ---------------------------------------------------------------------------
section("5. renderFrontmatter preserves extra fields");
{
  const raw = fs.readFileSync(path.join(FIXTURES, "extra-fields-post.md"), "utf-8");
  const parsed = parseMarkdownPost(raw);
  assert("parse succeeds", parsed !== null);
  if (parsed) {
    const yaml = renderFrontmatter(parsed.data, { title: "New Title", summary: "New summary." });
    assert("custom field in yaml", yaml.includes('custom: "user-added-field"'));
    assert("rating field in yaml", yaml.includes("rating:"));
    assert("new title in yaml", yaml.includes('"New Title"'));
    assert("summary in yaml", yaml.includes('"New summary."'));

    // Re-parse to confirm round-trip
    const tmpPath = path.join(os.tmpdir(), `markdownParser-test-extra-${Date.now()}.md`);
    const bodyFromImage = parsed.rawBody;
    fs.writeFileSync(tmpPath, `---\n${yaml}\n---\n${bodyFromImage}`, "utf-8");
    const reparsed = parseMarkdownPost(fs.readFileSync(tmpPath, "utf-8"));
    assert("re-parse succeeds", reparsed !== null);
    if (reparsed) {
      assertEq("custom field preserved after round-trip", reparsed.data["custom"] as string, "user-added-field");
      assertEq("rating preserved after round-trip", reparsed.data["rating"] as number, 5);
      assertEq("title updated", reparsed.title, "New Title");
    }
    fs.unlinkSync(tmpPath);
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  process.exit(1);
}
