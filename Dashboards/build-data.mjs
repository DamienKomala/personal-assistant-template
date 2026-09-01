#!/usr/bin/env node
// Extracts every markdown table in the ledger into normalized JSON, then
// injects it into job-tracker.html between the DATA markers.
//
//   node Dashboards/build-data.mjs          # build + inject
//   node Dashboards/build-data.mjs --dry    # print a summary, write nothing
//
// The parser itself lives in lib/ledger.mjs and is shared with
// Tools/clickup-sync.mjs. Both consumers MUST read the ledger the same way.
//
// ── THREE INJECTED BLOCKS, AND ONLY ONE OF THEM IS OURS ────────────────────
//
//   PIPELINE_DATA  — generated from the ledger. Overwritten every build.
//   OVERRIDES      — written by the PUBLISHED PAGE when the owner edits a row
//                    there. 🔴 PRESERVED ACROSS BUILDS, NEVER GENERATED.
//                    Wiping it would throw away edits he made in the browser
//                    that have not been reconciled into the ledger yet.
//                    Read them with `node Tools/dashboard-overrides.mjs`.
//   TPL            — the page's own source, so it can republish itself.
//
// ── WHY THE PAGE CARRIES ITS OWN SOURCE ────────────────────────────────────
//
// The `artifact` capability's publish() wants a COMPLETE replacement document,
// and explicitly forbids serializing the live DOM (it contains viewer session
// state and injected runtime scripts). So the page keeps a tokenized copy of
// itself and re-renders from that — the standard quine substitution:
//
//   page = TPL.replace("%%DATA%%", data)
//             .replace("%%OVERRIDES%%", overrides)
//             .replace("%%TPL%%", enc(TPL))     // ← LAST, and it is not a typo
//
// TPL keeps its own %%TPL%% token intact inside the copy it emits, which is
// what stops the substitution recursing. DATA and OVERRIDES must be replaced
// BEFORE TPL, or their tokens inside the embedded copy get eaten instead.
//
// ⚠️ The file on disk is a FRAGMENT (no doctype) because the Artifact tool
// wraps it at publish time. TPL is the WRAPPED form, because publish() from
// inside the page gets no such favour and rejects `invalid_content` without a
// doctype. That asymmetry is deliberate; don't "fix" it.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseLedger, assignKeys } from "./lib/ledger.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const HTML = join(HERE, "job-tracker.html");

const DRY = process.argv.includes("--dry");

const { rows, skipped, lastSwept } = parseLedger();

// Stamp the SHARED row key — the same one Tools/clickup-sync.mjs uses for its
// task map. This is what makes the round trip exact: an override recorded on
// the page names a key, that key names a ClickUp task in clickup-map.json, and
// it names exactly one ledger row here.
const { keys, duped } = assignKeys(rows);
rows.forEach(r => { r.key = keys.get(r); });

const payload = {
  source: "Job Search/pipeline.md + pipeline-leads.md + pipeline-archive.md",
  lastSwept,
  rows,
};
/* ------------------------------ report ------------------------------ */

const by = k => rows.reduce((m, r) => (m[r[k]] = (m[r[k]] || 0) + 1, m), {});
console.log("\nledger (3 files) → " + rows.length + " rows\n");
console.log("by section:", by("section"));
console.log("by stage:  ", by("stage"));
console.log("with comp: ", rows.filter(r => r.comp).length);
console.log("with thread:", rows.filter(r => r.thread).length);
console.log("with flags:", rows.filter(r => r.flags.length).length);
console.log("last swept:", lastSwept);
if (duped) console.log("ambiguous keys:", duped, "(suffixed -1, -2, …)");

const repeats = Object.entries(rows.reduce((m, r) => {
  if (r.companyKey) m[r.companyKey] = (m[r.companyKey] || 0) + 1;
  return m;
}, {})).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]);
console.log("\nrepeat companies (" + repeats.length + "):",
  repeats.slice(0, 12).map(([k, n]) => k + "×" + n).join(", "));

if (skipped.length) {
  console.log("\nskipped tables (not part of the ledger):");
  skipped.forEach(s => console.log("  " + (s.sub || s.heading) + " [" + s.cols.join(", ") + "] " + s.n + " rows"));
}

/* ------------------------------ inject ------------------------------ */

const D0 = "/*__PIPELINE_DATA_START__*/", D1 = "/*__PIPELINE_DATA_END__*/";
const O0 = "/*__OVERRIDES_START__*/",     O1 = "/*__OVERRIDES_END__*/";
const T0 = '<script type="text/plain" id="__TPL__">', T1 = "</script><!--__TPL_END__-->";

let html = readFileSync(HTML, "utf8");

// 🔴 lastIndexOf, NOT indexOf — and this is the whole bug that froze the
// dashboard from 2026-08-19 to 2026-08-22. The page carries a TOKENIZED COPY
// OF ITSELF in the __TPL__ block, and that copy keeps the marker comments
// (put() replaces what is BETWEEN the markers, never the markers themselves).
// The template block sits EARLIER in the file than the real blocks, so
// indexOf() found the template's markers and injected every rebuild into the
// placeholder — then step 1 re-tokenized it straight back. Net: a byte-
// identical file, a cheerful "injected N rows" line, and three sweeps that
// reported publishing a fresh dashboard while republishing the 08-19 build.
// The real blocks are always LAST. On a file with one marker pair this is
// identical to indexOf, so it is safe for the tokenized fragment too.
// Two marker pairs, two different search strategies, and getting either one
// wrong re-nests the template on every build:
//   "last"  (DATA, OVERRIDES) — the real blocks always sit AFTER the template,
//           and the template's own copies of these markers sit before them.
//   "outer" (TPL)             — first open, last close, so an already-nested
//           template collapses to one fresh copy instead of gaining a layer.
const span = (s, a, b, what, mode = "last") => {
  const i = mode === "outer" ? s.indexOf(a) : s.lastIndexOf(a);
  const j = s.lastIndexOf(b);
  if (i === -1 || j === -1) {
    console.error("\nERROR: " + what + " markers not found in job-tracker.html\n");
    process.exit(1);
  }
  return [i + a.length, j];
};

// Preserve whatever the published page last wrote. If the block is missing or
// unparseable we start empty rather than guessing — but say so loudly, because
// a silently emptied overrides block looks exactly like "he made no edits".
const [oa, ob] = span(html, O0, O1, "OVERRIDES");
const prevRaw = html.slice(oa, ob).replace(/^\s*(?:let|const|var)\s+OVERRIDES\s*=\s*/, "").replace(/;\s*$/, "").trim();
let overrides;
try {
  overrides = JSON.parse(prevRaw);
} catch {
  console.error("\n⚠️  OVERRIDES block did not parse — starting empty. If the owner had unreconciled");
  console.error("   page edits, they are in git history, not here. Check before rebuilding again.\n");
  overrides = { updated: null, edits: {} };
}
const nEdits = Object.keys(overrides.edits || {}).length;
console.log("\noverrides carried forward: " + nEdits + " row(s)" +
            (overrides.updated ? " — last edited " + overrides.updated : ""));

// Any override whose key no longer resolves to a row is dead weight and, worse,
// invisible: report it rather than dropping it.
const live = new Set(rows.map(r => r.key));
const orphans = Object.keys(overrides.edits || {}).filter(k => !live.has(k));
if (orphans.length) {
  console.log("⚠️  " + orphans.length + " override(s) point at rows that no longer exist:");
  orphans.forEach(k => console.log("     " + k + " — " + (overrides.edits[k].company || "?")));
  console.log("   Kept, not deleted. Reconcile with: node Tools/dashboard-overrides.mjs");
}

if (DRY) { console.log("\n--dry: nothing written\n"); process.exit(0); }

const enc  = s => s.split("</script").join("<\\/script");
const json = o => JSON.stringify(o).replace(/</g, "\\u003c");

const put = (s, a, b, body, mode) => {
  const [i, j] = span(s, a, b, "block", mode);
  return s.slice(0, i) + body + s.slice(j);
};

// 1. Tokenized fragment — every generated block replaced by its placeholder.
const tokenized = put(
  put(
    put(html, D0, D1, "\n%%DATA%%\n"),
    O0, O1, "\n%%OVERRIDES%%\n"),
  T0, T1, "%%TPL%%", "outer");

// 2. The template is that fragment, wrapped as a real document.
const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [, "Job Search Tracker"])[1];
const TPL =
  '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">' +
  "<title>" + title + "</title>" +
  "<style>*,*::before,*::after{box-sizing:border-box}body{margin:0}</style>" +
  "</head><body>\n" + tokenized + "\n</body></html>";

// 3. Real content into the real file. DATA and OVERRIDES first; TPL last.
html = put(html, D0, D1, "\nconst PIPELINE = " + json(payload) + ";\n");
html = put(html, O0, O1, "\nlet OVERRIDES = " + json(overrides) + ";\n");
html = put(html, T0, T1, enc(TPL), "outer");

writeFileSync(HTML, html);
console.log("\ninjected " + rows.length + " rows + " + nEdits + " override(s) into job-tracker.html");
console.log("template: " + (TPL.length / 1024).toFixed(1) + "KB   page: " + (html.length / 1024).toFixed(1) + "KB\n");
