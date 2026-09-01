#!/usr/bin/env node
/**
 * clickup-sync.mjs — project the job-search ledger onto a ClickUp board.
 *
 *   node Tools/clickup-sync.mjs --dry            # validate + report, write NOTHING (safe, no token needed)
 *   node Tools/clickup-sync.mjs --push           # markdown -> ClickUp (authoritative)
 *   node Tools/clickup-sync.mjs --push --limit 5 # first real run: create only 5
 *   node Tools/clickup-sync.mjs --pull           # ClickUp -> divergence REPORT (never writes the ledger)
 *   node Tools/clickup-sync.mjs --push --force   # overwrite board-side edits from the ledger
 *   node Tools/clickup-sync.mjs --capture "text" # add one ad-hoc task to the Daily list
 *
 * 🔴 THE BOARD IS A PROJECTION, NOT A LEDGER. `Job Search/*.md` is the source of
 *    truth, exactly as it is for Dashboards/job-tracker.html. On any conflict the
 *    ledger wins and the board is stale. `--push` overwrites ClickUp; `--pull`
 *    NEVER writes markdown — it prints what diverged and a human decides.
 *
 * 🔴 NEVER USE CLICKUP CUSTOM FIELDS. The Free Forever plan allows 60 Custom
 *    Field *uses* for the LIFETIME of the workspace and they never reset — about
 *    twelve tasks with five fields each, and then it is permanently dead. Every
 *    field below is a native one (status / tags / priority / dates / description),
 *    all of which are unlimited. There is deliberately no code path that writes a
 *    custom field. Do not add one.
 *
 * 🔴 WE DO NOT USE CLICKUP'S MCP SERVER. mcp.clickup.com is capped at 50 calls
 *    per 24 hours on the free plan; one sweep would exhaust it. The REST API on
 *    the same plan allows 100 requests/minute with a personal token.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { createHash } from "node:crypto";
import { parseLedger, LEDGER_SRCS, normCompany, plain, assignKeys, baseKeyOf, normRole } from "../Dashboards/lib/ledger.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..");
const CONFIG_PATH = join(HERE, "clickup-config.json");
const MAP_PATH = join(HERE, "clickup-map.json");
const TOKEN_PATH = join(homedir(), ".config", "clickup-sync", "token");
const API = "https://api.clickup.com/api/v2";

const argv = process.argv.slice(2);
const has = f => argv.includes(f);
const argOf = f => { const i = argv.indexOf(f); return i === -1 ? null : argv[i + 1]; };

const MODE = has("--push") ? "push" : has("--pull") ? "pull" : has("--capture") ? "capture" : has("--clear-dates") ? "clear-dates" : "dry";
const LIMIT = argOf("--limit") ? parseInt(argOf("--limit"), 10) : Infinity;
// --force re-pushes every row even when its hash is unchanged. Needed because a
// normal push is hash-based, so an edit made ON THE BOARD is never corrected by
// it — by design, so a push does not stomp what the owner changed on his phone.
// `--pull` reports that drift; `--force` is how you overwrite it from the ledger.
const FORCE = has("--force");

// 🔴 THE BOARD NO LONGER CARRIES DATES AT ALL — the owner's call, 2026-08-24:
// "remove all dates to Clickup tasks. They do not have dates, those are the dates
// when received."  He is right, and it was true of both fields:
//   • `start_date` was the APPLIED / FOUND date — literally when the mail arrived.
//   • `due_date` was 106/157 DERIVED from that same receipt date (+14d applied,
//     +7d replied, +2d needs-you). An invented deadline computed from a receipt
//     is not a deadline, and a board where two thirds of the dates are fabricated
//     teaches you to ignore all of them.
// The remaining 51 came from an explicit `⏰ Re-check YYYY-MM-DD` in the ledger and
// were real intent — they were removed too, because the owner said all, and because
// a trustworthy empty column beats a column that is 2/3 noise.
//
// 🔴 CONSEQUENCE, AND IT IS NOT SMALL: ClickUp fires a due-date notification only to
// a task's ASSIGNEE, so with no dates there are NO MOBILE REMINDERS from the board.
// That was the reason dated tasks were assigned at all (verified 2026-08-19, when
// 144 dated-but-unassigned tasks would have reminded him of nothing). Assignment is
// therefore also switched off, and `--clear-dates` unassigns what was already set,
// so "My Tasks" does not sit on 157 permanently undated rows.
//
// ✅ Re-check dates STILL EXIST where they always did — as `⏰ Re-check <date>` prose
// in `Job Search/pipeline.md`. The ledger is the source of truth; the board stopped
// pretending to schedule it. If reminders are wanted back, restore ONLY the explicit
// branch of dueOf() below — never the derived ones.
let ASSIGNEE = null;

/* ══════════════════════════ 1. structural validator ══════════════════════════
 * Ported from the manual snippet in `Job Search/pipeline.md` § Notes so it
 * actually runs. On 2026-08-14 rows were inserted BETWEEN a table header and its
 * |---| separator; every row below parsed with columns shifted by one, 112 landed
 * under a bogus stage, and the row TOTAL WENT UP — so the same-or-higher check
 * passed on a corrupt table. Row counts cannot detect a column shift. Pipe counts can.
 */
function validateTables() {
  const bad = [];
  for (const file of LEDGER_SRCS) {
    const lines = readFileSync(file, "utf8").split("\n");
    let expect = null;
    lines.forEach((l, n) => {
      if (/^\|[\s\-:|]+\|$/.test(l)) { expect = l.split("|").length; return; }
      if (!l.startsWith("|")) { expect = null; return; }
      if (expect && l.split("|").length !== expect) {
        bad.push({ file: file.replace(REPO + "/", ""), line: n + 1, got: l.split("|").length, expect });
      }
    });
  }
  return bad;
}

/* ══════════════════════════ 2. the canonical stage enum ══════════════════════
 * These 11 strings must exist as statuses on the ClickUp Space before a push.
 * ClickUp statuses are UI-only — the API can only send a string that already exists.
 */
const STATUSES = ["Lead", "Applied", "Screening", "Interviewing", "Offer",
                  "Replied", "Needs you", "Off-criteria", "Paused", "Paid", "Closed"];

/* Lists, keyed by the parser's existing `section` values. */
const LIST_OF_SECTION = {
  conversation: "Conversations",
  application:  "Applications",
  offcriteria:  "Off-criteria",
  gig:          "Gig / Contract",
  other:        "Other",
  lead:         "Leads",
  closed:       "Archive",
};
const DAILY_LIST = "Daily";

/* ══════════════════════════ 3. row -> task rendering ═════════════════════════ */

// Payload hash — unrelated to row identity; this one stays local because it
// fingerprints the rendered ClickUp task, not the ledger row.
const sha = s => createHash("sha1").update(s).digest("hex");

// 🔴 `baseKeyOf` / `assignKeys` / `normRole` MOVED to Dashboards/lib/ledger.mjs on
// 2026-08-19, when the dashboard's overrides round-trip became a second consumer
// of the same identity. Do NOT re-declare them here — a forked key is how two
// projections silently stop pointing at the same ledger row.

const PRIORITY = { urgent: 1, caution: 2, starred: 3 };
function priorityOf(flags) {
  for (const [flag, p] of Object.entries(PRIORITY)) if (flags.includes(flag)) return p;
  return 4;
}

function compBand(comp) {
  if (!comp) return null;
  const v = comp.max || comp.min;
  if (!v) return null;
  if (v <= 500) {                                   // hourly, not salary
    if (v < 50) return "comp.hr-under-50";
    if (v < 70) return "comp.hr-50-70";
    if (v < 90) return "comp.hr-70-90";
    return "comp.hr-90-plus";
  }
  if (v < 100000) return "comp.under-100k";
  if (v < 150000) return "comp.100-150k";
  if (v < 200000) return "comp.150-200k";
  return "comp.200k-plus";
}

const slug = s => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

// 🔴 TAG NAMES MUST NOT CONTAIN "/". ClickUp's per-tag endpoints
// (POST/DELETE /task/{id}/tag/{name}) 404 on a slash even URL-encoded as %2F —
// its router reads it as a path separator. Slash tags DO work at task creation,
// so the bug is invisible until the first update: the tags simply never change.
// Verified 2026-08-19; "." works for both add and delete.
//
// 🔴 Marker tags use `mark.`, NOT `flag.`. They come from emoji in the cell text
// (✅ ⚠️ 🔴 …), so `flag/done` on a live row read as "this row is done" — which it
// does not mean. Status is the only thing that carries state.
function tagsOf(r, repeatSet) {
  const tags = ["sec." + r.section];
  for (const f of r.flags) tags.push("mark." + f);
  if (repeatSet.has(r.companyKey) && r.companyKey) tags.push("repeat." + slug(r.companyKey));
  const band = compBand(r.comp);
  if (band) tags.push(band);
  return [...new Set(tags)];
}

const DAY = 86400000;
const toMs = d => (d ? Date.parse(d + "T12:00:00Z") : null);

// 🔴 DATES ARE OFF. the owner's call, 2026-08-24 — see the block above `let ASSIGNEE`.
// The derived branches below are kept as a COMMENT rather than deleted so nobody
// reinvents them: they computed a deadline from a RECEIPT date, which is exactly
// the thing he objected to.
//
//   const explicit = (r.nextAction || "").match(/re-?check\s+(?:on\s+)?(\d{4}-\d{2}-\d{2})/i);
//   if (explicit) return { ms: toMs(explicit[1]), why: "explicit ⏰" };   // ← the only honest one
//   const touch = toMs(r.lastTouch || r.applied);
//   if (r.stage === "Applied")   return { ms: touch + 14 * DAY, why: "derived: applied +14d" };
//   if (r.stage === "Replied")   return { ms: touch + 7  * DAY, why: "derived: replied +7d"  };
//   if (r.stage === "Needs you") return { ms: touch + 2  * DAY, why: "derived: needs-you +2d" };
//
// ⚠️ If dates ever come back, restore ONLY the `explicit` line. Never the derived ones.
function dueOf(_r) {
  return { ms: null, why: null };
}

function describe(r, key) {
  const L = [];
  const fact = (k, v) => { if (v) L.push(`**${k}:** ${v}`); };
  fact("Role", r.role);
  fact("Source", r.source);
  fact("Comp", r.comp && r.comp.raw);
  fact("Location", r.location);
  fact("Applied", r.applied);
  fact("Last touch", r.lastTouch);
  if (L.length) L.push("");

  if (r.nextAction) L.push("---", "", "### Next action", "", r.nextAction, "");
  if (r.note) L.push("### Note", "", r.note, "");

  L.push("---", "");
  if (r.thread) L.push(`📧 [Gmail thread](https://mail.google.com/mail/u/0/#all/${r.thread})`);
  L.push(`📄 Source of truth: \`Job Search/pipeline.md\` — **the ledger wins, this card is a projection.**`);
  L.push("", `<!-- pa-key: ${key} -->`);
  return L.join("\n");
}

// The ledger prefixes company cells with churn markers (🆕 is added and removed
// every sweep) and long parentheticals. Left alone, the task NAME churns on every
// sweep, which churns the hash and forces a pointless update of an unchanged row.
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu;
const stripEmoji = t => (t || "").replace(EMOJI, " ").replace(/\s+/g, " ").trim();

function displayName(r) {
  let co = stripEmoji(r.company);
  // Drop the parenthetical aside — the description keeps it in full. But only if
  // something survives: several rows are literally "(employer anonymized)".
  const bare = co.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  if (bare.length >= 3) co = bare;
  const role = stripEmoji(r.role) || "—";
  return `${co || "—"} — ${role}`.slice(0, 250);
}

function renderTask(r, repeatSet, key) {
  const due = dueOf(r);
  return {
    key,
    list: LIST_OF_SECTION[r.section],
    payload: {
      name: displayName(r),
      markdown_content: describe(r, key),
      status: r.stage,
      tags: tagsOf(r, repeatSet),
      priority: priorityOf(r.flags),
      // 🔴 Both null by design — see the ASSIGNEE block near the top of this file.
      // `start_date` used to be `toMs(r.applied || r.found)`, i.e. the date the mail
      // arrived. That is the receipt date the owner objected to, so it goes too.
      due_date: null,
      due_date_time: false,
      start_date: null,
      start_date_time: false,
      // No dates means no due-date notification, which means nothing to assign for.
      // Assignment is left alone here so a manual assignment on the board survives a
      // push; `--clear-dates` is what removed the ones this tool had set.
    },
    dueWhy: due.why,
  };
}

/* ══════════════════════════ 4. config, map, token ═══════════════════════════ */

const readJson = (p, fallback) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : fallback);

function defaultConfig() {
  const lists = {};
  for (const [section, name] of Object.entries(LIST_OF_SECTION)) lists[section] = { name, id: null };
  lists.daily = { name: DAILY_LIST, id: null };
  return { spaceName: "Job Search", teamId: null, spaceId: null, lists };
}

function loadToken() {
  if (process.env.CLICKUP_TOKEN) return process.env.CLICKUP_TOKEN.trim();
  if (existsSync(TOKEN_PATH)) return readFileSync(TOKEN_PATH, "utf8").trim();
  return null;
}

/* ══════════════════════════ 5. rate-limited API client ══════════════════════
 * Free plan is 100 requests/minute per token. The one-time full load of ~589
 * tasks is ~6-7 minutes at that ceiling.
 */
const stamps = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function api(token, path, { method = "GET", body } = {}) {
  while (true) {
    const now = Date.now();
    while (stamps.length && now - stamps[0] > 60000) stamps.shift();
    if (stamps.length >= 95) { await sleep(60000 - (now - stamps[0]) + 250); continue; }
    stamps.push(Date.now());

    const res = await fetch(API + path, {
      method,
      headers: { Authorization: token, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 429) {
      const reset = Number(res.headers.get("x-ratelimit-reset")) * 1000 - Date.now();
      await sleep(Math.max(reset, 5000));
      continue;
    }
    const text = await res.text();
    if (!res.ok) throw new Error(`ClickUp ${res.status} ${method} ${path} — ${text.slice(0, 300)}`);
    return text ? JSON.parse(text) : {};
  }
}

/* ══════════════════════════ 6. main ═════════════════════════════════════════ */

const out = [];
const say = s => { out.push(s); console.log(s); };

async function main() {
  // --capture adds ONE ad-hoc task to the Daily list. It never touches the
  // ledger, so it skips the parse entirely and stays cheap enough for
  // /emailreply to call without turning into a sweep.
  if (MODE === "capture") return capture();

  say("");
  say("── structural validation ──────────────────────────────────────────");
  const bad = validateTables();
  if (bad.length) {
    say(`🔴 ${bad.length} MALFORMED TABLE ROW(S) — refusing to sync.`);
    bad.slice(0, 20).forEach(b => say(`   ${b.file} L${b.line}: ${b.got} cols, expected ${b.expect}`));
    say("");
    say("   A column shift does not lose rows, it corrupts them — the row count");
    say("   can still go UP. Fix the table before syncing. See pipeline.md § Notes.");
    process.exit(1);
  }
  say("✅ all ledger tables well-formed");

  const { rows } = parseLedger();
  say(`✅ parsed ${rows.length} rows from 3 ledger files`);

  // Load the cached assignee BEFORE rendering so --dry hashes match what --push
  // will send. Without this, dry reported "0 updates" for a change that in fact
  // rewrote 144 tasks.
  const cfgEarly = readJson(CONFIG_PATH, null);
  if (cfgEarly && cfgEarly.assigneeUserId) ASSIGNEE = cfgEarly.assigneeUserId;
  else if (MODE === "dry") say("   assignee: not resolved (nothing is assigned — the board is dateless by design)");

  /* strict stage enum — the 2026-08-14 lesson: never silently bucket */
  const offenders = rows.filter(r => !STATUSES.includes(r.stage));
  if (offenders.length) {
    say("");
    say(`🔴 ${offenders.length} ROW(S) HAVE A STAGE OUTSIDE THE 11-VALUE ENUM — refusing to sync.`);
    say("   The Stage column is free text and these cells hold narrative, not a stage.");
    say("   Fix them in the ledger (that is the point of this check), then re-run.");
    say("");
    const seen = new Map();
    for (const r of offenders) {
      if (!seen.has(r.stage)) seen.set(r.stage, []);
      seen.get(r.stage).push(r.company);
    }
    for (const [stage, companies] of seen) {
      say(`   ✗ "${stage.slice(0, 90)}${stage.length > 90 ? "…" : ""}"`);
      say(`     → ${companies.slice(0, 3).join(", ")}${companies.length > 3 ? ` +${companies.length - 3} more` : ""}`);
    }
    say("");
    say(`   Valid statuses: ${STATUSES.join(" · ")}`);
    if (MODE !== "dry") process.exit(1);
    say("");
    say("   (--dry continues past this so you can see the whole picture.)");
  } else {
    say("✅ every stage is inside the canonical enum");
  }

  /* repeat companies -> repeat/* tags */
  const counts = rows.reduce((m, r) => (r.companyKey && (m[r.companyKey] = (m[r.companyKey] || 0) + 1), m), {});
  const repeatSet = new Set(Object.entries(counts).filter(([, n]) => n >= 2).map(([k]) => k));

  /* render — every row gets a task, collisions disambiguated not dropped */
  const { keys, duped, groups } = assignKeys(rows);
  const tasks = rows.map(r => {
    const t = renderTask(r, repeatSet, keys.get(r));
    t.hash = sha(JSON.stringify(t.payload));
    return t;
  });
  if (tasks.length !== rows.length) throw new Error(`row/task mismatch: ${rows.length} rows -> ${tasks.length} tasks`);
  const dupeGroups = [...groups.values()].filter(g => g.length > 1);

  say("");
  say("── projection ─────────────────────────────────────────────────────");
  const perList = tasks.reduce((m, t) => (m[t.list] = (m[t.list] || 0) + 1, m), {});
  for (const [list, n] of Object.entries(perList).sort((a, b) => b[1] - a[1])) say(`   ${String(n).padStart(4)}  ${list}`);
  say(`   ${String(tasks.length).padStart(4)}  TOTAL`);

  const withDue = tasks.filter(t => t.payload.due_date);
  say("");
  say(`   dates:     none — due_date and start_date are OFF by design (the owner, 2026-08-24)`);
  if (withDue.length) say(`   🔴 ${withDue.length} task(s) still carry a due date — dueOf() has been re-enabled somewhere.`);
  say(`              re-check dates live in the ledger as ⏰ prose; the board no longer schedules.`);
  say(`   tags:      ${new Set(tasks.flatMap(t => t.payload.tags)).size} distinct`);
  say(`   custom fields: 0 — and that is permanent, see the header of this file`);

  if (duped) {
    say("");
    say(`⚠️  ${duped} rows across ${dupeGroups.length} groups are indistinguishable on company+role+date.`);
    say(`   All were kept (suffixed -1, -2, …). Most are TRUE DUPLICATES IN THE LEDGER`);
    say(`   and worth deduping at source — that is a ledger edit, not a sync problem:`);
    dupeGroups.slice(0, 6).forEach(g =>
      say(`   ×${g.length}  ${displayName(g[0]).slice(0, 78)}`));
    if (dupeGroups.length > 6) say(`   … +${dupeGroups.length - 6} more groups`);
  }

  /* ---- dry stops here ---- */
  if (MODE === "dry") {
    const map = readJson(MAP_PATH, {});
    const creates = tasks.filter(t => !map[t.key]).length;
    const updates = tasks.filter(t => map[t.key] && map[t.key].hash !== t.hash).length;
    say("");
    say("── would do ───────────────────────────────────────────────────────");
    say(`   create ${creates}   update ${updates}   skip ${tasks.length - creates - updates}`);
    say("");
    say("--dry: nothing written, no network calls made");
    say("");
    return;
  }

  /* ---- everything below needs a token ---- */
  const token = loadToken();
  if (!token) {
    say("");
    say("🔴 No ClickUp token. Expected at ~/.config/clickup-sync/token or $CLICKUP_TOKEN.");
    say("   Setup steps are in Tools/README.md. The token never goes in this repo.");
    process.exit(1);
  }

  const config = readJson(CONFIG_PATH, defaultConfig());
  await resolveIds(token, config);
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");

  if (MODE === "clear-dates") return clearDates(token, tasks);
  if (MODE === "pull") return pull(token, config, tasks);
  return push(token, config, tasks);
}

/* Resolve team / space / list ids by NAME, once, and cache them in the config. */
async function resolveIds(token, config) {
  if (!config.assigneeUserId) {
    const { user } = await api(token, "/user");
    config.assigneeUserId = user.id;
    say(`   assignee: ${user.username} (${user.id})`);
  }
  ASSIGNEE = config.assigneeUserId;

  if (!config.teamId) {
    const { teams } = await api(token, "/team");
    if (!teams || !teams.length) throw new Error("No ClickUp workspace found for this token.");
    config.teamId = teams[0].id;
    say(`   workspace: ${teams[0].name} (${config.teamId})`);
  }
  if (!config.spaceId) {
    const { spaces } = await api(token, `/team/${config.teamId}/space`);
    const space = spaces.find(s => s.name === config.spaceName);
    if (!space) throw new Error(`Space "${config.spaceName}" not found. Create it in the ClickUp UI first — see Tools/README.md.`);
    config.spaceId = space.id;

    const have = (space.statuses || []).map(s => s.status.toLowerCase());
    const missing = STATUSES.filter(s => !have.includes(s.toLowerCase()));
    if (missing.length) {
      throw new Error(
        `Space "${config.spaceName}" is missing statuses: ${missing.join(", ")}.\n` +
        `ClickUp statuses are UI-only — the API cannot create them. Add them in the ClickUp UI, then re-run.`);
    }
    say(`   space: ${config.spaceName} (${config.spaceId}) — all ${STATUSES.length} statuses present`);
  }

  const unresolved = Object.values(config.lists).filter(l => !l.id);
  if (unresolved.length) {
    const { lists } = await api(token, `/space/${config.spaceId}/list`);
    const folderless = new Map(lists.map(l => [l.name, l.id]));
    for (const entry of Object.values(config.lists)) {
      if (entry.id) continue;
      const id = folderless.get(entry.name);
      if (!id) throw new Error(`List "${entry.name}" not found in space "${config.spaceName}". Create it in the UI — see Tools/README.md.`);
      entry.id = id;
    }
    say(`   lists: resolved ${unresolved.length}`);
  }
}

// Reconcile a task's tags to `want`. Uses the cached last-sent set when the map
// has one; falls back to a single read for entries written before tags were tracked.
async function syncTags(token, entry, want) {
  let have = entry.tags;
  if (!have) {
    try {
      const live = await api(token, `/task/${entry.taskId}`);
      have = (live.tags || []).map(t => t.name);
    } catch { have = []; }
  }
  const add = want.filter(t => !have.includes(t));
  const del = have.filter(t => !want.includes(t));
  const failed = [];
  for (const t of del) {
    try { await api(token, `/task/${entry.taskId}/tag/${t}`, { method: "DELETE" }); }
    catch (e) { failed.push(`-${t}`); }
  }
  for (const t of add) {
    try { await api(token, `/task/${entry.taskId}/tag/${t}`, { method: "POST" }); }
    catch (e) { failed.push(`+${t}`); }
  }
  // 🔴 Never swallow these. A silent catch here is exactly what hid the slash bug.
  return failed;
}

/* ── --clear-dates ────────────────────────────────────────────────────────────
 * ONE-TIME REPAIR, and it exists because a normal --push cannot do this job.
 *
 * A push is hash-based: it only touches rows whose payload changed. That is
 * usually right, but it means a field the tool STOPPED sending is never cleared
 * on tasks that are otherwise identical — the stale value just sits there. Dates
 * were on ~607 tasks, so this walks the whole map and nulls them explicitly.
 *
 * It also strips the assignee this tool set. Assignment only ever existed to make
 * ClickUp fire a due-date notification; with no dates it would leave "My Tasks"
 * showing 157 rows that can never come due.
 *
 * 🔴 It touches ONLY due_date, start_date and the assignee. Status, name, tags,
 * description and list are not sent, so nothing the owner changed on the board is
 * overwritten by running this.
 */
async function clearDates(token, tasks) {
  const map = readJson(MAP_PATH, {});
  const byKey = new Map(tasks.map(t => [t.key, t]));
  const entries = Object.entries(map);

  say("");
  say("── clearing dates ─────────────────────────────────────────────────");
  say(`   ${entries.length} tracked tasks — nulling due_date + start_date, removing assignee`);
  say(`   (status, name, tags and description are NOT sent — board edits survive)`);
  say("");

  let cleared = 0, failed = 0, n = 0;
  for (const [key, entry] of entries) {
    if (!entry || !entry.taskId) continue;
    const body = {
      due_date: null,
      due_date_time: false,
      start_date: null,
      start_date_time: false,
      ...(ASSIGNEE ? { assignees: { add: [], rem: [ASSIGNEE] } } : {}),
    };
    try {
      await api(token, `/task/${entry.taskId}`, { method: "PUT", body });
      cleared++;
      // Re-hash to the CURRENT dateless payload so the next --push sees this row
      // as settled instead of updating all 607 again.
      const t = byKey.get(key);
      if (t) map[key] = { ...entry, hash: t.hash };
    } catch (e) {
      failed++;
      say(`   ⚠️  ${key} — ${e.message.slice(0, 140)}`);
    }
    if (++n % 50 === 0) {
      writeFileSync(MAP_PATH, JSON.stringify(map, null, 2) + "\n");
      say(`   … ${n}/${entries.length} processed`);
    }
  }

  writeFileSync(MAP_PATH, JSON.stringify(map, null, 2) + "\n");
  say("");
  say(`✅ cleared ${cleared}   failed ${failed}`);
  say(`   Every board task is now dateless and unassigned by this tool.`);
  say(`   Re-check dates still live in the ledger as ⏰ prose — the board stopped scheduling.`);
  say("");
  say("⚠️  Repo files changed (clickup-map.json). This is the Mac, so nothing was committed.");
  say("");
}

async function push(token, config, tasks) {
  const map = readJson(MAP_PATH, {});
  const listId = section => Object.values(config.lists).find(l => l.name === section).id;

  let created = 0, updated = 0, skipped = 0, n = 0;
  say("");
  say("── pushing ────────────────────────────────────────────────────────");

  for (const t of tasks) {
    const existing = map[t.key];
    if (existing && existing.hash === t.hash && !FORCE) { skipped++; continue; }
    if (created + updated >= LIMIT) break;

    try {
      if (existing) {
        // POST takes assignees as an array; PUT takes {add:[], rem:[]}. Sending
        // the array shape to PUT is accepted and silently ignored.
        const body = { ...t.payload };
        if (body.assignees) body.assignees = { add: body.assignees, rem: [] };
        await api(token, `/task/${existing.taskId}`, { method: "PUT", body });
        // 🔴 PUT /task SILENTLY IGNORES `tags` — it accepts the field, returns 200,
        // and changes nothing. Tags have their own endpoints. Found 2026-08-19 when
        // five updated tasks kept a stale prefix while the PUT reported success.
        // The last-sent set is cached in the map so a diff costs zero reads.
        const tagFail = await syncTags(token, existing, t.payload.tags);
        if (tagFail.length) say(`   ⚠️  tag sync failed on ${t.payload.name.slice(0, 40)}: ${tagFail.join(" ")}`);
        map[t.key] = { ...existing, hash: t.hash, list: t.list, tags: t.payload.tags };
        updated++;
      } else {
        const res = await api(token, `/list/${listId(t.list)}/task`, { method: "POST", body: t.payload });
        // POST honours tags, so a freshly created task needs no reconciliation.
        map[t.key] = { taskId: res.id, hash: t.hash, list: t.list, tags: t.payload.tags };
        created++;
      }
    } catch (e) {
      say(`   ⚠️  ${t.payload.name.slice(0, 60)} — ${e.message.slice(0, 160)}`);
    }

    if (++n % 25 === 0) {
      writeFileSync(MAP_PATH, JSON.stringify(map, null, 2) + "\n");   // checkpoint
      say(`   … ${n} processed (${created} created, ${updated} updated)`);
    }
  }

  writeFileSync(MAP_PATH, JSON.stringify(map, null, 2) + "\n");
  say("");
  say(`✅ created ${created}   updated ${updated}   skipped ${skipped} (unchanged)`);
  say(`   map: Tools/clickup-map.json — ${Object.keys(map).length} tracked tasks`);
  say("");
  say("⚠️  Repo files changed. This is the Mac, so nothing was committed — that is the owner's call.");
  say("");
}

/* --capture "text" [--due YYYY-MM-DD] [--note "..."]
 * One ad-hoc task into the Daily list. This is what /emailreply calls so its
 * "Worth logging" items land somewhere instead of evaporating — it writes no
 * ledger row, no Daily.md line, and no Gmail mutation. */
async function capture() {
  const text = argOf("--capture");
  if (!text) { console.error("\n🔴 --capture needs text: --capture \"chase VARITE about the P&G question\"\n"); process.exit(1); }

  const token = loadToken();
  if (!token) { console.error("\n🔴 No ClickUp token — see Tools/README.md.\n"); process.exit(1); }

  const config = readJson(CONFIG_PATH, defaultConfig());
  if (!config.lists.daily.id || !config.assigneeUserId) await resolveIds(token, config);
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");

  const due = argOf("--due");
  const note = argOf("--note");
  const body = {
    name: text.slice(0, 250),
    markdown_content: [note || "", "", "---", "", "_Captured by `/emailreply` — not a ledger row. If this changes a stage, run `/emailjobsearch`._"].join("\n"),
    status: "Needs you",
    tags: ["sec.capture"],
    priority: 2,
    due_date: due ? Date.parse(due + "T12:00:00Z") : null,
    due_date_time: false,
    // Assign, or ClickUp will not fire a due-date notification for it.
    ...(config.assigneeUserId ? { assignees: [config.assigneeUserId] } : {}),
  };

  const res = await api(token, `/list/${config.lists.daily.id}/task`, { method: "POST", body });
  console.log(`\n✅ captured to Daily: "${body.name}"`);
  console.log(`   ${res.url || res.id}`);
  console.log(`   ⚠️  Not logged to the ledger. Run /emailjobsearch if this changes a stage.\n`);
}

/* 🔴 pull REPORTS. It never writes markdown. The ledger is edited by a human or
 *    by a sweep, never by a sync job reading a board. */
async function pull(token, config, tasks) {
  const map = readJson(MAP_PATH, {});
  const byId = new Map(Object.entries(map).map(([k, v]) => [v.taskId, k]));
  const expected = new Map(tasks.map(t => [t.key, t]));

  say("");
  say("── divergences (board vs ledger) ──────────────────────────────────");
  let n = 0;

  for (const entry of Object.values(config.lists)) {
    if (!entry.id) continue;
    // 🔴 ClickUp pages at 100 tasks. Without this loop pull silently checked only
    // the first 100 of the 307 Leads and reported "agree" for the rest.
    const live = [];
    for (let page = 0; ; page++) {
      const res = await api(token, `/list/${entry.id}/task?include_closed=true&subtasks=false&page=${page}`);
      const batch = res.tasks || [];
      live.push(...batch);
      if (res.last_page || !batch.length) break;
    }
    for (const task of live) {
      const key = byId.get(task.id);
      // The Daily list is capture-only and never ledger-backed, so a task there
      // is expected, not a divergence. Reporting it would make every /emailreply
      // capture permanent noise in this output.
      if (!key) {
        if (entry.name === DAILY_LIST) continue;
        say(`   ➕ board-only: "${task.name}" in ${entry.name} — created on the board, not in the ledger`);
        n++; continue;
      }
      const want = expected.get(key);
      if (!want) continue;
      const boardStatus = (task.status && task.status.status) || "";
      if (boardStatus.toLowerCase() !== want.payload.status.toLowerCase()) {
        say(`   ↔ "${task.name.slice(0, 60)}"`);
        say(`      ledger: ${want.payload.status}   board: ${boardStatus}`);
        n++;
      }
    }
  }

  say("");
  say(n ? `${n} divergence(s). NOTHING WAS WRITTEN — apply them to the ledger by hand or via a sweep.`
        : "✅ board and ledger agree.");
  say("");
}

main().catch(e => { console.error("\n🔴 " + e.message + "\n"); process.exit(1); });
