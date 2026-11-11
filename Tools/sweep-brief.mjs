#!/usr/bin/env node
/**
 * sweep-brief.mjs — the compact context an /emailjobsearch sweep actually reads.
 *
 * WHY THIS EXISTS
 * ---------------
 * On 2026-09-04 a sweep's FIXED context cost — before a single email was read —
 * measured ~158,000 tokens. Two files were 85% of it:
 *
 *     Context/job-sources.md    75,060 tokens   (66% of it provenance)
 *     Job Search/pipeline.md    60,140 tokens   (753 rows; 148 are live)
 *
 * Both are used as LOOKUPS and were being read as PROSE. This emits the lookup.
 *
 * WHAT IT IS NOT
 * --------------
 * 🔴 It is a PROJECTION, exactly like the dashboard and the ClickUp board.
 *    `pipeline.md` and `job-sources.md` remain the source of truth. On any
 *    conflict they win and this file is stale. It is regenerated, never edited.
 *
 * 🔴 It does NOT contain a second ledger parser. It imports Dashboards/lib/ledger.mjs,
 *    which is the one parser the dashboard and the board also use. A second parser
 *    is how the applications table silently died on 2026-08-14; don't add one.
 *
 * ⚠️ IT IS LOSSY ON PURPOSE, AND THE LOSS IS THE POINT. Long `Next action` cells
 *    are clipped and every dossier narrative is dropped. When a row's provenance
 *    actually matters — why a rate was refused, what a recruiter said — grep the
 *    real file or open its dossier section. That is the exception, not the sweep.
 *
 * Usage:  node Tools/sweep-brief.mjs            # write Job Search/sweep-brief.md
 *         node Tools/sweep-brief.mjs --dry      # print the size report only
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseLedger, plain } from "../Dashboards/lib/ledger.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "Job Search", "sweep-brief.md");
const SOURCES = path.join(ROOT, "Context", "job-sources.md");
const DRY = process.argv.includes("--dry");

/* Stages that mean "this row is still in play". Mirrors the dashboard's LIVE_STAGES. */
const LIVE = new Set(["Needs you", "Interviewing", "Screening", "Replied", "Applied", "Paused", "Paid", "Offer"]);

const oneLine = (s) => plain(s || "").replace(/\s+/g, " ").trim();
const clip = (s, n) => { const t = oneLine(s); return t.length <= n ? t : t.slice(0, n - 1) + "…"; };
const cell = (s) => (s || "").replace(/\|/g, "\\|");   // \| is the escape splitRow honours

/* ── 1. live rows ──────────────────────────────────────────────────────────── */

function liveRows(rows) {
  return rows
    .filter((r) => LIVE.has(r.stage) && r.section !== "lead" && r.section !== "offcriteria")
    .sort((a, b) => {
      const rank = (x) => ["Offer", "Interviewing", "Screening", "Needs you", "Replied", "Applied", "Paused", "Paid"].indexOf(x.stage);
      return rank(a) - rank(b) || String(b.lastTouch || "").localeCompare(String(a.lastTouch || ""));
    });
}

/* A re-check date is prose in the ledger (`⏰ Re-check 2026-09-11`). Surface it as a column
   so a sweep can see what is due without reading the cell it is buried in. */
const recheckOf = (r) => (String(r.nextAction || "").match(/Re-check\s+(\d{4}-\d{2}-\d{2})/i) || [])[1] || "";

/* ── 2. company index — "do I already have a row for this?" ───────────────── */

function companyIndex(rows) {
  const seen = new Map();
  for (const r of rows) {
    const k = clip(r.company, 46);
    if (!k) continue;
    const e = seen.get(k) || { n: 0, stages: new Set() };
    e.n++; e.stages.add(r.stage);
    seen.set(k, e);
  }
  return [...seen.entries()].sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0]));
}

/* ── 3. sender → bucket lookup, extracted from job-sources.md ─────────────── */

/* ⚠️ The first cell is NOT always a bare pattern. Real shapes in the file include
 *      `*@imcsgroup.net` *(via `*@user.dice.com`)*
 *      `*@candidates.workablemail.com`, `*@inbound.workablemail.com`
 *   A regex anchored to the whole cell drops 38 of the 63 patterns and does it
 *   SILENTLY — which is the same class of failure as the malformed-row bug.
 *   So: pull every backticked address out of cell 0, and keep them all. */
function senderLookup(md) {
  const out = [];
  const seen = new Set();
  for (const line of md.split("\n")) {
    if (!line.startsWith("|")) continue;
    const cols = line.slice(1, -1).split("|");
    if (cols.length < 2) continue;
    const raw = cols[0];
    const hits = [...raw.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim())
      .filter((s) => /@|^\*/.test(s) && /\.[a-z]{2,}/i.test(s));
    if (!hits.length) continue;
    const key = hits.join(",");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ sender: hits.join("`, `"), what: clip(cols[1], 190) });
  }
  return out;
}

/* ── 4. rejection phrases — the auto-archive test ─────────────────────────── */

function rejectionPhrases(md) {
  const lines = md.split("\n");
  const i = lines.findIndex((l) => /^## .*Rejection language/.test(l));
  if (i < 0) return [];
  let j = lines.findIndex((l, k) => k > i && /^## /.test(l));
  if (j < 0) j = lines.length;
  // ⚠️ Narrow to the "### Phrases confirmed" subsection when there is one. The
  // same section also quotes NON-rejection wording (cancelled and paused reqs),
  // and harvesting those would teach a sweep to archive exactly what it must not.
  let secLines = lines.slice(i, j);
  const p0 = secLines.findIndex((l) => /^### .*Phrases/i.test(l));
  if (p0 >= 0) {
    let p1 = secLines.findIndex((l, k) => k > p0 && /^### /.test(l));
    secLines = secLines.slice(p0, p1 < 0 ? undefined : p1);
  }
  const sec = secLines.join("\n");
  const seen = new Set();
  for (const m of sec.matchAll(/\*?"([^"]{12,150})"\*?/g)) {
    const p = oneLine(m[1]);
    if (p && !/^Privacy and Compliance/i.test(p)) seen.add(p);
  }
  return [...seen];
}

/* ── build ─────────────────────────────────────────────────────────────────── */

const { rows, lastSwept } = parseLedger();
const live = liveRows(rows);
const idx = companyIndex(rows);
const srcMd = fs.readFileSync(SOURCES, "utf8");
const senders = senderLookup(srcMd);
const phrases = rejectionPhrases(srcMd);

const md = [];
md.push("# Sweep brief — GENERATED, DO NOT EDIT");
md.push("");
md.push(`> 🔴 **A PROJECTION, NOT A SOURCE OF TRUTH.** Regenerate with \`node Tools/sweep-brief.mjs\`. On any conflict [\`pipeline.md\`](pipeline.md) and [\`../Context/job-sources.md\`](../Context/job-sources.md) win and this file is stale.`);
md.push("> ");
md.push(`> ⚠️ **LOSSY ON PURPOSE.** \`Next action\` is clipped and all dossier narrative is dropped. When a row's provenance matters — why a rate was refused, what a recruiter actually said — \`grep\` the real file or open its [dossier](pipeline-dossiers.md) section. That is the exception, not the sweep.`);
md.push("> ");
md.push(`> **Ledger last swept ${lastSwept || "—"} · ${rows.length} rows total · ${live.length} live.**`);
md.push("");

md.push(`## Live rows — ${live.length}`);
md.push("");
md.push("Everything not closed, not a lead, not off-criteria. **Check here before writing a row that calls a company new.**");
md.push("");
md.push("| Company | Stage | Role | Re-check | Thread | Next action (clipped) |");
md.push("|---|---|---|---|---|---|");
for (const r of live) {
  md.push(`| ${cell(clip(r.company, 46))} | ${cell(r.stage)} | ${cell(clip(r.role, 46))} | ${recheckOf(r) || "—"} | ${r.thread || "—"} | ${cell(clip(r.nextAction, 150))} |`);
}
md.push("");

md.push(`## Company index — ${idx.length} distinct, all ${rows.length} rows`);
md.push("");
md.push("**A name here means the ledger already knows this company.** ⚠️ It is NOT the repeat check — that is still a Gmail search for `in:anywhere \"<company>\"`, which covers every application ever made and cannot go stale. This only tells you whether a row exists.");
md.push("");
md.push(idx.map(([k, e]) => `${k}${e.n > 1 ? ` ×${e.n}` : ""}`).join(" · "));
md.push("");

md.push(`## Sender → bucket — ${senders.length} patterns`);
md.push("");
md.push("First cell is the address pattern; second is the call. **Handshake cannot be bucketed by sender — classify it by content.**");
md.push("");
md.push("| Sender | What it is |");
md.push("|---|---|");
for (const s of senders) md.push(`| \`${cell(s.sender)}\` | ${cell(s.what)} |`);
md.push("");

md.push(`## Rejection phrases — ${phrases.length}`);
md.push("");
md.push("🔴 **Auto-archive fires only on a verbatim phrase in the message BODY.** Subject lines don't count, inference doesn't count, and a tracking token in a URL is the wrapper rather than the text. **Ambiguous → label, star, report, leave in the inbox.**");
md.push("");
for (const p of phrases) md.push(`- *"${p}"*`);
md.push("");

const text = md.join("\n");
const bytes = Buffer.byteLength(text);
const tok = (b) => Math.round(b / 4);
const before = Buffer.byteLength(fs.readFileSync(path.join(ROOT, "Job Search", "pipeline.md"))) + Buffer.byteLength(srcMd);

console.log(`sweep brief: ${live.length} live rows · ${idx.length} companies · ${senders.length} senders · ${phrases.length} rejection phrases`);
console.log(`  ${bytes} bytes ≈ ${tok(bytes)} tokens`);
console.log(`  replaces pipeline.md + job-sources.md read whole: ${before} bytes ≈ ${tok(before)} tokens`);
console.log(`  reduction: ${(100 - (100 * bytes) / before).toFixed(1)}%`);

if (DRY) { console.log("\n--dry: nothing written"); process.exit(0); }
fs.writeFileSync(OUT, text);
console.log(`\n✅ wrote ${path.relative(ROOT, OUT)}`);
console.log("⚠️  Repo file changed. This is the Mac, so nothing was committed — that is the owner's call.");
