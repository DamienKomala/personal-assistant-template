// Shared ledger parser. Extracted from build-data.mjs on 2026-08-19 so the
// dashboard and the ClickUp sync read the ledger through ONE parser.
//
// 🔴 Do not fork this. A second parser is how the applications table silently
// died on 2026-08-14: rows inserted between a header and its |---| separator
// parsed with every column shifted by one, 112 landed under a bogus stage, and
// the row TOTAL WENT UP so the same-or-higher check passed on a corrupt table.
//
// Consumers:
//   Dashboards/build-data.mjs
//   Tools/clickup-sync.mjs
//   ~/Jobs/pipeline-app  — the web app. Imports this file at RUNTIME by absolute
//     path (LEDGER_REPO) rather than copying it, and is the only consumer that
//     WRITES: it rewrites single cells in place and then re-parses through here
//     to prove the row total and the row's key are unchanged. So a change to
//     this module's reading is also a change to what that app will accept as a
//     valid write.

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");

// The ledger was split into three files on 2026-08-06 (pipeline.md passed 292KB
// and could no longer be read in one pass). They are still ONE ledger: parse all
// three, or every consumer silently under-reports. pipeline-dossiers.md is
// deliberately absent — it holds long-form history and no tables.
export const LEDGER_SRCS = [
  join(REPO, "Job Search", "pipeline.md"),
  join(REPO, "Job Search", "pipeline-leads.md"),
  join(REPO, "Job Search", "pipeline-archive.md"),
];

/* ----------------------------- markdown ----------------------------- */

// Split a table row on unescaped pipes.
export function splitRow(line) {
  const cells = [];
  let cur = "";
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "\\" && i + 1 < line.length) { cur += line[i + 1]; i++; continue; }
    if (c === "|") { cells.push(cur); cur = ""; continue; }
    cur += c;
  }
  cells.push(cur);
  if (cells.length && cells[0].trim() === "") cells.shift();
  if (cells.length && cells[cells.length - 1].trim() === "") cells.pop();
  return cells.map(c => c.trim());
}

export const isRule = cells => cells.length > 0 && cells.every(c => /^:?-{2,}:?$/.test(c));

// Emoji / symbol markers the ledger uses as severity signals.
export const MARKERS = [
  ["🔴", "urgent"], ["⚠️", "caution"], ["⭐", "starred"], ["🔁", "repeat"],
  ["🚫", "do-not"], ["✅", "done"], ["⏳", "waiting"], ["📞", "call"], ["✍️", "drafted"],
];

export function extractFlags(raw) {
  const flags = [];
  for (const [glyph, name] of MARKERS) {
    if (raw.includes(glyph)) flags.push(name);
  }
  return flags;
}

// Strip markdown to readable text, preserving the words.
export function plain(raw) {
  let s = raw;
  for (const [glyph] of MARKERS) s = s.split(glyph).join(" ");
  s = s.replace(/!\[[^\]]*\]\([^)]*\)/g, " ");
  s = s.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");   // links -> text
  s = s.replace(/`([^`]*)`/g, "$1");
  s = s.replace(/~~/g, "");
  s = s.replace(/\*\*/g, "");
  s = s.replace(/(^|\s)\*(?=\S)/g, "$1").replace(/(?<=\S)\*(?=\s|$)/g, "");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

export const isStruck    = raw => /~~/.test(raw);
export const isSuperseded = raw => /^\s*\*?\(?\s*(prior state|superseded)/i.test(raw);
export const dash = v => (v === "—" || v === "-" || v === "" ? null : v);

export function firstDate(raw) {
  const m = raw.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  return m ? m[1] : null;
}

export function parseComp(raw) {
  if (!raw) return null;
  const s = raw.replace(/,/g, "");
  const range = s.match(/\$\s*(\d+(?:\.\d+)?)\s*K\s*[-–—]\s*\$?\s*(\d+(?:\.\d+)?)\s*K/i);
  if (range) return { min: +range[1] * 1000, max: +range[2] * 1000, raw: raw.trim() };
  const full = s.match(/\$\s*(\d{2,3})(\d{3})\b/);
  if (full) return { min: +(full[1] + full[2]), max: +(full[1] + full[2]), raw: raw.trim() };
  const one = s.match(/\$\s*(\d+(?:\.\d+)?)\s*K\b/i);
  if (one) return { min: +one[1] * 1000, max: +one[1] * 1000, raw: raw.trim() };
  return null;
}

const LEGAL = /\b(inc|incorporated|llc|ltd|limited|corp|corporation|plc|gmbh)\b/g;
export function normCompany(raw) {
  let s = (raw || "").toLowerCase();
  s = s.replace(/\([^)]*\)/g, " ");
  s = s.replace(/[.,]/g, " ");
  s = s.replace(LEGAL, " ");
  s = s.replace(/^\s*the\s+/, " ");
  s = s.replace(/[^a-z0-9]+/g, " ").trim();
  return s;
}

/* ------------------------------ stages ------------------------------ */

export const STAGE_RULES = [
  // First match wins, so ORDER IS THE LOGIC, in three tiers.
  //
  // The narrative tier was added 2026-08-19: the Stage column is free text and
  // 19 live rows held prose rather than a stage ("SENT 2026-08-19 15:45:10 UTC
  // — ball is Dana's"). Those cells stay expressive in the ledger on purpose —
  // this normalizes them for consumers instead of flattening the source.

  // TIER 1 — terminal states override everything. A cell can read
  // "WITHDRAWN — SENT <ts>" and the withdrawal is the stage, not the send.
  [/withdrawn|ineligible|concluded/i, "Closed"],

  // TIER 2 — an explicit canonical stage word wins over any inference below.
  // 🔴 These MUST stay above tier 3: "Applied — off-criteria" is an application
  // that was actually submitted, and reading it as Off-criteria loses that.
  [/needs (?:you|your call|attention)|blocked/i,  "Needs you"],
  [/interview/i,  "Interviewing"],
  [/screening/i,  "Screening"],
  [/offer/i,      "Offer"],
  [/replied/i,    "Replied"],
  [/applied/i,    "Applied"],
  [/paused/i,     "Paused"],
  [/paid/i,       "Paid"],
  [/closed/i,     "Closed"],
  [/lead/i,       "Lead"],

  // TIER 3 — inference, for cells carrying no canonical word at all.
  [/new draft written|redirect drafted/i, "Needs you"],  // written but NOT sent → waiting on the owner
  [/no draft|off-?criteria/i,             "Off-criteria"], // deliberately unanswered
  [/redirect sent|\bsent\b|chased/i,      "Replied"],     // it went out; ball is theirs
];
export function normStage(raw) {
  const s = plain(raw || "");
  for (const [re, out] of STAGE_RULES) if (re.test(s)) return out;
  return s || "Unrecorded";
}

// Map each table to the nearest preceding heading.
export const SECTION_KIND = {
  "Active — recruiter conversations": "conversation",
  "Active — applications":            "application",
  "Applied but off-criteria":         "offcriteria",
  "Active — gig / contract":          "gig",
  "Leads — mined from aggregator digests": "lead",
  // Rows that closed and were migrated out of the live table into the archive.
  // They are still conversations — only their storage location changed.
  // Dated per migration pass, so the lookup below strips the trailing date —
  // don't add a new key each time a sweep migrates rows.
  "Migrated from the live conversations table": "conversation",
  "Active — other":                   "other",
  "Closed":                           "closed",
};

/* ---------------------------- extraction ---------------------------- */

/* ------------------------------ row identity ------------------------------ */
//
// 🔴 ONE key algorithm, shared by every consumer — the dashboard, the ClickUp
// board and the overrides round-trip. This lived in Tools/clickup-sync.mjs
// until 2026-08-19; it moved here the moment a second consumer needed it,
// for exactly the reason the ledger parser itself is shared: a forked key is
// how two projections silently stop pointing at the same row.
//
// Rows carry no id and are rewritten every sweep, and companies repeat
// (TP-Link ×10, Life360 ×5) — so the key must include role and date, not just
// company. We deliberately do NOT add an id column to the tables: inserting a
// column is the exact edit that shifted every row by one and destroyed the
// applications table on 2026-08-14.

const sha = s => createHash("sha1").update(s).digest("hex");
export const normRole = raw => normCompany(raw || "");
export const baseKeyOf = r =>
  sha([r.section, r.companyKey, normRole(r.role), r.applied || r.found || ""].join("|")).slice(0, 12);

// Some rows are genuinely indistinguishable on those fields. 🔴 NEVER let a
// collision drop a row: silently losing 4.6% of the ledger is precisely the
// failure class that cost the dashboard its applications table on 2026-08-14.
// Disambiguate with an occurrence ordinal and REPORT the count instead.
export function assignKeys(rows) {
  const groups = new Map();
  for (const r of rows) {
    const base = baseKeyOf(r);
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base).push(r);
  }
  const keys = new Map();
  let duped = 0;
  for (const [base, group] of groups) {
    group.forEach((r, i) => {
      keys.set(r, group.length === 1 ? base : `${base}-${i + 1}`);
      if (group.length > 1) duped++;
    });
  }
  return { keys, duped, groups };
}

/* ------------------------------ parse ------------------------------ */

export function parseLedger(srcs = LEDGER_SRCS) {
const files = srcs.map(f => ({ src: f, text: readFileSync(f, "utf8") }));
const md = files.map(f => f.text).join("\n\n");

// ── PROVENANCE (added 2026-08-24) ────────────────────────────────────────
// Each file is scanned SEPARATELY rather than as one joined string, so every
// row carries `src` (the file it came from) and `line` (1-indexed, within that
// file). An editor cannot safely rewrite a cell it cannot locate, and locating
// it by re-scanning elsewhere would be the exact second parser the header of
// this module forbids.
//
// Purely additive — `md`, the table shapes and every pre-existing row field are
// unchanged. Scanning per file also stops a heading at the foot of one file
// from claiming a table at the head of the next, which the joined string
// allowed.
const tables = [];

for (const { src, text } of files) {
  const lines = text.split(/\r?\n/);
  let heading = null, sub = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h = line.match(/^(#{2,3})\s+(.*)$/);
    if (h) {
      if (h[1].length === 2) { heading = h[2].trim(); sub = null; }
      else sub = h[2].trim();
      continue;
    }
    if (!line.trim().startsWith("|")) continue;

    // candidate header row: next non-empty line must be a rule
    const next = lines[i + 1] || "";
    if (!next.trim().startsWith("|") || !isRule(splitRow(next.trim()))) continue;

    const header = splitRow(line.trim()).map(plain);
    const body = [];
    let j = i + 2;
    while (j < lines.length && lines[j].trim().startsWith("|")) {
      const cells = splitRow(lines[j].trim());
      if (!isRule(cells) && cells.some(c => c !== "")) body.push({ cells, line: j + 1 });
      j++;
    }
    tables.push({ src, heading, sub, header, body });
    i = j - 1;
  }
}

/* --------------------------- normalization --------------------------- */

const rows = [];
const skipped = [];

for (const tb of tables) {
  const key = tb.sub || tb.heading;
  // A dated heading ("… — 2026-08-12") maps on its undated stem, so a new
  // migration pass never silently drops its rows the way 2026-08-12 nearly did.
  const undated = s => (s || "").replace(/\s+[—–-]\s+\d{4}-\d{2}-\d{2}\s*$/, "").trim();
  const kind = SECTION_KIND[key] || SECTION_KIND[tb.heading]
            || SECTION_KIND[undated(key)] || SECTION_KIND[undated(tb.heading)];
  if (!kind) { skipped.push({ heading: tb.heading, sub: tb.sub, cols: tb.header, n: tb.body.length }); continue; }

  // 🔴 A table that matched only on its PARENT ## heading must still LOOK like a
  // ledger table. Narrative tables living inside a mapped section — "Lead | What
  // changed", "Lead | Why it's dead" in the lead-working sessions — otherwise parse
  // as rows with every field null, because none of the columns the extractor reads
  // are present. Found 2026-08-20: THIRTEEN such rows were inside the row total and
  // had been pushed to the ClickUp board as empty tasks. The count everyone trusts
  // was 596 when the ledger held 583.
  //
  // Deliberately narrow: it fires only on a FALLBACK match with NO identity column
  // at all. A directly-mapped heading is always trusted (the gig table's header is
  // Source/Engagement/... and carries no "Company" either, and it is real).
  const matchedDirectly = !!(SECTION_KIND[key] || SECTION_KIND[undated(key)]);
  const ID_COLS = ["company", "source", "role", "engagement"];
  const hasIdentity = tb.header.some(h => ID_COLS.includes(h.toLowerCase().trim()));
  if (!matchedDirectly && !hasIdentity) {
    skipped.push({ heading: tb.heading, sub: tb.sub, cols: tb.header, n: tb.body.length, why: "no identity column" });
    continue;
  }

  const idx = {};
  tb.header.forEach((h, i) => { idx[h.toLowerCase().trim()] = i; });
  const at = (r, name) => {
    const i = idx[name];
    return i == null || r[i] == null ? "" : r[i];
  };

  for (const { cells: r, line } of tb.body) {
    // 🔴 Identity columns are not all called "Company". The archive's mined-lead
    // tables head theirs "Employer" and the `Active — other` table heads its "Org";
    // reading only "company" left every one of those rows anonymous, which then made
    // DIFFERENT employers collide on company+role+date. GoFundMe and Runpod were one
    // such false pair (found 2026-08-20). "source" stays last — the gig table has no
    // company at all and identifies an engagement by its source.
    const companyRaw = at(r, "company") || at(r, "employer") || at(r, "org") || at(r, "source");
    if (isSuperseded(companyRaw)) continue;               // "(prior state — ...)" annotation rows

    const roleRaw    = at(r, "role") || at(r, "engagement");
    const stageRaw   = at(r, "stage");
    const nextRaw    = at(r, "next action");

    // A migrated row lives in pipeline-archive.md and leaves a pointer stub behind
    // in pipeline.md. Both parse; count only the archived original, or the split
    // silently inflates every total by the number of rows ever closed.
    if (/Full row in \[pipeline-archive\.md\]/.test(nextRaw)) continue;

    const noteRaw    = at(r, "note") || at(r, "reason") || at(r, "why off-criteria");

    const flags = [...new Set([
      ...extractFlags(companyRaw), ...extractFlags(roleRaw),
      ...extractFlags(stageRaw), ...extractFlags(nextRaw), ...extractFlags(noteRaw),
    ])];

    const company = plain(companyRaw) || "—";
    const struck  = isStruck(companyRaw) || isStruck(roleRaw);

    let stage = kind === "closed" ? "Closed"
              : kind === "lead" ? "Lead"
              : kind === "offcriteria" ? "Off-criteria"
              : normStage(stageRaw);
    if (struck && kind !== "lead" && kind !== "offcriteria") stage = "Closed";

    rows.push({
      // Provenance — where this row physically lives. Added 2026-08-24 so an
      // editor can rewrite one cell in place instead of re-deriving location.
      src: tb.src,
      line,
      section: kind,
      company,
      companyKey: normCompany(company),
      role: plain(roleRaw) || "—",
      source: plain(at(r, "source") || at(r, "source digest")) || null,
      applied: firstDate(at(r, "applied")),
      closed: firstDate(at(r, "closed")),
      found: firstDate(at(r, "found")),
      lastTouch: firstDate(at(r, "last touch")),
      stage,
      nextAction: plain(nextRaw) || null,
      note: plain(noteRaw) || null,
      location: dash(plain(at(r, "location"))) || null,
      comp: parseComp(at(r, "comp") || at(r, "rate")),
      thread: (plain(at(r, "thread")).match(/[0-9a-f]{12,}/i) || [null])[0],
      flags,
    });
  }
}

/* ------------------------------ context ------------------------------ */

const lastSwept = (md.match(/Re-swept \*\*(\d{4}-\d{2}-\d{2})\*\*/g) || [])
  .map(s => s.match(/(\d{4}-\d{2}-\d{2})/)[1]).sort().pop() || null;

  return { rows, skipped, lastSwept, md };
}
