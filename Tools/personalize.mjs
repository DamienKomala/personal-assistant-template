#!/usr/bin/env node
// personalize.mjs — replace the {{PLACEHOLDER}} tokens across the template.
//
//   node Tools/personalize.mjs --list          # what is still unfilled, and where
//   node Tools/personalize.mjs --dry           # what WOULD change, writes nothing
//   node Tools/personalize.mjs                 # apply
//
// Values come from Tools/personalize.json. Copy personalize.example.json to
// that name and fill it in. Anything left as an empty string is SKIPPED, not
// written as blank — so you can do this in passes.
//
// ── TWO TOKENS ARE NOT SETUP PLACEHOLDERS AND ARE NEVER TOUCHED ─────────────
//
//   {{N}}            — a RUNTIME token in job-tracker.html. The page's own
//                      JavaScript substitutes the live row count into it on
//                      every render. Replacing it freezes the count forever.
//   {{PLACEHOLDER}}  — prose. It appears in SETUP.md and CLAUDE.md as the way
//                      to REFER to placeholders in general.
//
// This is a one-way tool. It is idempotent (a second run finds nothing left to
// do), but it does not un-personalize. Run --dry first, and have the repo in
// git before running it for real.

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..");
const CONFIG = join(HERE, "personalize.json");

const LIST = process.argv.includes("--list");
const DRY = process.argv.includes("--dry");

// Tokens this tool must never rewrite. See the header.
const PROTECTED = new Set(["N", "PLACEHOLDER"]);

const SKIP_DIRS = new Set([".git", "node_modules", ".claude/worktrees"]);

// 🔴 SETUP.md DOCUMENTS the placeholders — its tables list each token beside an
// example value. Substituting there turns "{{FULL_NAME}} | Jane Rivera" into
// "Jane Rivera | Jane Rivera" and destroys the instructions for anyone who
// re-reads them later. It is skipped deliberately, not by oversight.
const SKIP_FILES = new Set(["SETUP.md", "Tools/personalize.example.json", "Tools/personalize.mjs"]);
const TEXT_EXT = new Set([".md", ".html", ".json", ".mjs", ".js", ".py", ".txt", ".yml", ".yaml"]);

/* ------------------------------ walk ------------------------------ */

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(REPO, full);
    if (SKIP_DIRS.has(name) || SKIP_DIRS.has(rel)) continue;
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (TEXT_EXT.has(extname(name)) && !SKIP_FILES.has(rel)) out.push(full);
  }
  return out;
}

const files = walk(REPO);
const TOKEN = /\{\{([A-Z0-9_]+)\}\}/g;

/* ------------------------------ list ------------------------------ */

if (LIST) {
  const found = new Map();          // token -> Set of relative paths
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(TOKEN)) {
      if (PROTECTED.has(m[1])) continue;
      if (!found.has(m[1])) found.set(m[1], new Set());
      found.get(m[1]).add(relative(REPO, f));
    }
  }
  const rows = [...found.entries()].sort((a, b) => b[1].size - a[1].size);
  if (!rows.length) {
    console.log("\n✅ No setup placeholders left.\n");
    process.exit(0);
  }
  console.log(`\n${rows.length} placeholder(s) still unfilled:\n`);
  for (const [tok, where] of rows) {
    const list = [...where].sort();
    const shown = list.slice(0, 4).join(", ");
    const more = list.length > 4 ? `, +${list.length - 4} more` : "";
    console.log(`  {{${tok}}}`.padEnd(26) + `${list.length} file(s) — ${shown}${more}`);
  }
  console.log(`\n  (Protected and deliberately skipped: ${[...PROTECTED].map(t => `{{${t}}}`).join(", ")})\n`);
  process.exit(0);
}

/* ------------------------------ apply ------------------------------ */

if (!existsSync(CONFIG)) {
  console.error(`\n🔴 No ${relative(REPO, CONFIG)}.`);
  console.error(`   cp Tools/personalize.example.json Tools/personalize.json`);
  console.error(`   …then fill it in and re-run.\n`);
  process.exit(1);
}

let values;
try {
  values = JSON.parse(readFileSync(CONFIG, "utf8"));
} catch (e) {
  console.error(`\n🔴 ${relative(REPO, CONFIG)} is not valid JSON: ${e.message}\n`);
  process.exit(1);
}
delete values._comment;

// An empty value means "not decided yet" — skip it rather than writing a blank,
// so this can be run in passes as the profile firms up.
const filled = Object.entries(values).filter(([, v]) => typeof v === "string" && v.trim() !== "");
const empty = Object.keys(values).filter(k => !filled.some(([f]) => f === k));

for (const [k] of filled) {
  if (PROTECTED.has(k)) {
    console.error(`\n🔴 {{${k}}} is protected and cannot be set here. See the header of this file.\n`);
    process.exit(1);
  }
}

let changedFiles = 0, totalSubs = 0;
const perToken = new Map();

for (const f of files) {
  const src = readFileSync(f, "utf8");
  let out = src;
  for (const [key, val] of filled) {
    const re = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    const n = (out.match(re) || []).length;
    if (!n) continue;
    out = out.replace(re, val);
    perToken.set(key, (perToken.get(key) || 0) + n);
    totalSubs += n;
  }
  if (out !== src) {
    changedFiles++;
    if (!DRY) writeFileSync(f, out);
  }
}

console.log(`\n${DRY ? "--dry: would substitute" : "substituted"} ${totalSubs} token(s) across ${changedFiles} file(s)\n`);
for (const [k, n] of [...perToken.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  {{${k}}}`.padEnd(26) + `${n}`);
}
if (empty.length) {
  console.log(`\n⚠️  left unfilled (empty in personalize.json), so still {{…}} in the repo:`);
  console.log(`   ${empty.join(", ")}`);
}
console.log(`\n   Run \`node Tools/personalize.mjs --list\` to see what remains.`);
if (DRY) console.log(`   Nothing was written.`);
else console.log(`   ⚠️  Files changed in the working tree. Review with \`git diff\` before committing.`);
console.log();
