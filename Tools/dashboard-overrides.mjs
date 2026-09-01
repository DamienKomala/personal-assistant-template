#!/usr/bin/env node
/**
 * dashboard-overrides — read the proposals the owner made ON the published
 * dashboard and report them against the ledger.
 *
 *   node Tools/dashboard-overrides.mjs                  # read the local build
 *   node Tools/dashboard-overrides.mjs <file.html>      # read a fetched copy
 *   node Tools/dashboard-overrides.mjs --json           # machine-readable
 *
 * 🔴 IT NEVER WRITES MARKDOWN. Same rule as `clickup-sync --pull`, and for the
 * same reason: the dashboard is a PROJECTION of Job Search/pipeline.md. If the
 * page and the ledger disagree, the ledger is right and the page is a proposal
 * waiting to be applied by hand. A projection that can write back is a second
 * source of truth, which is the exact thing CLAUDE.md forbids.
 *
 * ── HOW THE ROUND TRIP WORKS ───────────────────────────────────────────────
 *
 *   pipeline.md ──build-data.mjs──▶ job-tracker.html ──publish──▶ Artifact
 *        ▲                                                          │
 *        │  applied by hand, after this report                      │ the owner
 *        └──────────── THIS TOOL ◀── OVERRIDES block ◀──────────────┘ edits
 *
 * The local file only carries what the LAST BUILD baked in. To see edits made
 * in the browser since then, fetch the live artifact first and pass the file:
 *
 *   https://claude.ai/code/artifact/<your-artifact-id>
 *
 * (Record your own artifact URL in Dashboards/ once you first publish. Same
 * file path republishes to the same URL; a different path mints a new one.)
 *
 * ⚠️ Row identity is the SHARED key from Dashboards/lib/ledger.mjs — the same
 * one Tools/clickup-sync.mjs writes into clickup-map.json. That is what lets
 * one proposal name one ledger row and one ClickUp card. Never fork it.
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseLedger, assignKeys } from "../Dashboards/lib/ledger.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const DEFAULT_HTML = join(ROOT, "Dashboards", "job-tracker.html");
const MAP = join(HERE, "clickup-map.json");

const argv = process.argv.slice(2);
const JSON_OUT = argv.includes("--json");
const target = argv.find(a => !a.startsWith("--")) || DEFAULT_HTML;

const say = (...a) => { if (!JSON_OUT) console.log(...a); };

/* ---------------------------- read the page --------------------------- */

if (!existsSync(target)) {
  console.error(`\n🔴 no such file: ${resolve(target)}\n`);
  process.exit(1);
}
const html = readFileSync(target, "utf8");

// The template node carries a TOKENIZED copy of these same markers, and it
// comes first in document order. Always search past it or you parse "%%DATA%%".
const TPL_END = "</script><!--__TPL_END__-->";
const from = html.indexOf(TPL_END);
if (from === -1) {
  console.error("\n🔴 This page predates the overrides round-trip (no __TPL__ block).");
  console.error("   Rebuild with: node Dashboards/build-data.mjs\n");
  process.exit(1);
}

function block(open, close, strip) {
  const a = html.indexOf(open, from), b = html.indexOf(close, from);
  if (a === -1 || b === -1) return null;
  const raw = html.slice(a + open.length, b).replace(strip, "").replace(/;\s*$/, "").trim();
  try { return JSON.parse(raw); } catch { return null; }
}

const overrides = block("/*__OVERRIDES_START__*/", "/*__OVERRIDES_END__*/", /^\s*let OVERRIDES\s*=\s*/);
if (!overrides) {
  console.error("\n🔴 OVERRIDES block missing or unparseable in " + resolve(target) + "\n");
  process.exit(1);
}
const edits = overrides.edits || {};
const nEdits = Object.keys(edits).length;

/* ------------------------------ the ledger ---------------------------- */

const { rows } = parseLedger();
const { keys } = assignKeys(rows);
const byKey = new Map();
rows.forEach(r => byKey.set(keys.get(r), r));

let taskOf = {};
try { taskOf = JSON.parse(readFileSync(MAP, "utf8")); } catch { /* board not set up yet */ }

/* ------------------------------- compare ------------------------------ */

const agree = [], diverge = [], notes = [], orphans = [];

for (const [key, e] of Object.entries(edits)) {
  const row = byKey.get(key);
  const task = taskOf[key]?.taskId || null;
  const item = { key, row, task, ...e };
  if (!row) { orphans.push(item); continue; }
  if (e.stage && e.stage !== row.stage) diverge.push(item);
  else if (e.stage) agree.push(item);
  if (e.note) notes.push(item);
}

if (JSON_OUT) {
  const shed = ({ key, task, company, role, stage, note, at, was, row }) =>
    ({ key, task, company, role, was, proposed: stage || null, ledger: row?.stage ?? null, note: note || null, at });
  console.log(JSON.stringify({
    source: resolve(target),
    updated: overrides.updated || null,
    counts: { edits: nEdits, diverge: diverge.length, agree: agree.length, notes: notes.length, orphans: orphans.length },
    diverge: diverge.map(shed), agree: agree.map(shed), notes: notes.map(shed), orphans: orphans.map(shed),
  }, null, 2));
  process.exit(0);
}

/* -------------------------------- report ------------------------------ */

const line = "─".repeat(66);
const link = t => (t ? `https://app.clickup.com/t/${t}` : "not on the board");

say(`\n── dashboard overrides ${line.slice(0, 44)}`);
say(`   source:  ${resolve(target)}`);
say(`   edited:  ${overrides.updated || "never"}`);
if (target === DEFAULT_HTML) {
  say(`   ⚠️  this is the LOCAL build — it shows only what the last build baked in.`);
  say(`      Fetch the live artifact and pass the file to see browser edits.`);
}

if (!nEdits) {
  say(`\n✅ No proposals on the page. Nothing to reconcile.\n`);
  process.exit(0);
}

say(`\n   ${nEdits} proposal(s): ${diverge.length} stage change(s), ${notes.length} note(s), ${orphans.length} orphan(s)`);

if (diverge.length) {
  say(`\n── stage changes to apply by hand ${line.slice(0, 33)}`);
  for (const d of diverge) {
    say(`\n   ${d.company} — ${d.role || "—"}`);
    say(`      ledger:   ${d.row.stage}`);
    say(`      proposed: ${d.stage}          (page said it was "${d.was}")`);
    if (d.note) say(`      note:     ${d.note}`);
    say(`      key ${d.key}   thread ${d.row.thread || "—"}`);
    say(`      board:    ${link(d.task)}`);
  }
}

if (agree.length) {
  say(`\n── already matching the ledger (no action) ${line.slice(0, 24)}`);
  agree.forEach(a => say(`   ${a.company} — ${a.stage}`));
}

const noteOnly = notes.filter(n => !n.stage);
if (noteOnly.length) {
  say(`\n── notes, no stage change ${line.slice(0, 41)}`);
  noteOnly.forEach(n => say(`   ${n.company}: ${n.note}`));
}

if (orphans.length) {
  say(`\n── 🔴 proposals whose row no longer exists ${line.slice(0, 24)}`);
  say(`   The row was renamed, merged, or migrated to the archive after the edit.`);
  orphans.forEach(o => say(`   ${o.company || "?"} — ${o.stage || "note only"} — key ${o.key}`));
}

say(`\n🔴 NOTHING WAS WRITTEN. Apply these to Job Search/pipeline.md by hand, then:`);
say(`   node Dashboards/build-data.mjs   &&   node Tools/clickup-sync.mjs --push\n`);
