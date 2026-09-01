#!/usr/bin/env node
/**
 * daily-sync.mjs — two-way bridge between Daily.md and the ClickUp "Daily" list.
 *
 *   node Tools/daily-sync.mjs --dry      # parse + report. No token, no network, no writes.
 *   node Tools/daily-sync.mjs --anchor   # write missing anchors into Daily.md, nothing else
 *   node Tools/daily-sync.mjs --push     # Daily.md -> ClickUp  (adds anchors, creates/updates tasks)
 *   node Tools/daily-sync.mjs --pull     # ClickUp -> Daily.md  (ticks boxes for tasks closed on the board)
 *   node Tools/daily-sync.mjs --pull --dry   # show what would be ticked, write nothing
 *
 * 🔴 THIS IS NOT THE LEDGER BRIDGE, AND THE RULES ARE DELIBERATELY DIFFERENT.
 *    `clickup-sync.mjs` projects `Job Search/*.md` and its `--pull` NEVER writes
 *    markdown, because the ledger is the source of truth and a board must not
 *    edit it. Daily.md is the opposite case: it is the owner's working to-do list,
 *    it holds no state anything else reads, and he asked for exactly this loop —
 *    "added here, resolved there and updated here". So THIS tool's `--pull` does
 *    write Daily.md. It writes ONE character per line: the box goes [ ] -> [x].
 *    It never edits the text of an item, never reorders, never deletes.
 *
 * 🔴 THE MERGE IS MONOTONIC IN BOTH DIRECTIONS, WHICH IS WHY IT NEEDS NO CLOCK.
 *    --pull only ticks boxes; it never un-ticks one.
 *    --push only closes board tasks; it never re-opens one.
 *    Done is therefore absorbing on both sides, so the two can never fight and
 *    there is no last-writer-wins race to lose work to. Un-ticking is a manual
 *    act on whichever side you mean it, and the other side is told about it in
 *    the next run's report rather than being silently overwritten.
 *
 * 🔴 IDENTITY IS AN ANCHOR, NOT THE TEXT. Every synced checkbox carries an
 *    invisible `<!--cu:xxxxxxxx-->` HTML comment. Sweeps rewrite this file daily
 *    — "fifth day carried" becomes "sixth day carried" — so a content hash would
 *    orphan a task every time the wording moved, and a tick from the board would
 *    then land on the wrong line or nowhere. The anchor survives rewording, and
 *    it survives an item being moved to another section. It renders as nothing.
 *    ⚠️ If a sweep rewrites a line and drops its anchor, the item re-syncs as a
 *    NEW task and the old one is reported as an orphan. Nothing is lost; it is
 *    just noise, so sweeps should carry anchors forward with the text.
 *
 * 🔴 NO CUSTOM FIELDS, EVER — same reason as clickup-sync.mjs. The free plan
 *    allows 60 custom-field USES for the lifetime of the workspace and they never
 *    reset. Everything here is native: status, tags, priority, description.
 *
 * ⚠️ Tag names must not contain "/". ClickUp's per-tag endpoints 404 on a slash
 *    even URL-encoded, and the failure is invisible until the first update.
 *    Verified 2026-08-19 in clickup-sync.mjs; "." is safe. Tags here use ".".
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { createHash, randomBytes } from "node:crypto";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..");
const DAILY_MD = join(REPO, "Daily.md");
const CONFIG_PATH = join(HERE, "clickup-config.json");
const MAP_PATH = join(HERE, "daily-map.json");
const TOKEN_PATH = join(homedir(), ".config", "clickup-sync", "token");
const API = "https://api.clickup.com/api/v2";

const argv = process.argv.slice(2);
const has = f => argv.includes(f);
const argOf = f => { const i = argv.indexOf(f); return i === -1 ? null : argv[i + 1]; };

const DRY = has("--dry");
const MODE = has("--pull") ? "pull" : has("--push") ? "push" : has("--anchor") ? "anchor" : "dry";
const LIMIT = argOf("--limit") ? parseInt(argOf("--limit"), 10) : Infinity;
const FORCE = has("--force");

const out = [];
const say = s => { out.push(s); console.log(s); };

/* ══════════════════════════ 1. parse Daily.md ════════════════════════════════
 * A checkbox item is its `- [ ]` line plus everything indented under it — the
 * sub-bullets and fenced code blocks that carry the actual instructions. Losing
 * those would strip the tool invocation out of half the items in this file.
 */

const CHECKBOX = /^(\s*)- \[([ xX])\]\s?(.*)$/;
const ANCHOR_RE = /<!--\s*cu:([0-9a-f]{8})\s*-->/;
const HEADING = /^(#{1,3})\s+(.*)$/;

function parseDaily(text) {
  const lines = text.split("\n");
  const items = [];
  let section = "(no section)";
  let sectionLine = 0;
  let cur = null;
  let fence = null;               // fence marker while inside a ``` block

  const close = () => {
    if (!cur) return;
    while (cur.body.length && !cur.body[cur.body.length - 1].trim()) cur.body.pop();
    items.push(cur);
    cur = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced code blocks are opaque: nothing inside them starts or ends an item.
    const fenceHit = line.match(/^\s*(```+|~~~+)/);
    if (fence) {
      if (fenceHit && line.trim().startsWith(fence)) fence = null;
      if (cur) cur.body.push(line);
      continue;
    }
    if (fenceHit && cur) { fence = fenceHit[1]; cur.body.push(line); continue; }
    if (fenceHit) { fence = fenceHit[1]; continue; }

    const h = line.match(HEADING);
    if (h) { close(); section = h[2].trim(); sectionLine = i; continue; }

    const cb = line.match(CHECKBOX);
    if (cb) {
      close();
      const anchor = (cb[3].match(ANCHOR_RE) || [])[1] || null;
      cur = {
        line: i,                                  // 0-indexed line of the `- [ ]`
        indent: cb[1].length,
        done: cb[2].toLowerCase() === "x",
        text: cb[3].replace(ANCHOR_RE, "").trimEnd(),
        anchor,
        section,
        sectionLine,
        body: [],
      };
      continue;
    }

    if (!cur) continue;

    // Continuation: blank lines, and anything indented past the checkbox.
    if (!line.trim()) { cur.body.push(line); continue; }
    const ind = line.match(/^\s*/)[0].length;
    if (ind > cur.indent) { cur.body.push(line); continue; }
    close();
  }
  close();
  return items;
}

/* ══════════════════════════ 2. render one item as a task ════════════════════ */

// Strip the markup that makes a name unreadable in a task list, but KEEP emoji —
// 🔴 / ⭐ / ⚠️ are how this file encodes urgency and they map straight to priority.
function taskName(text) {
  let s = text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")   // [label](url) -> label
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*|__|~~/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (s.length <= 200) return s || "(untitled)";
  const cut = s.slice(0, 200);
  const sp = cut.lastIndexOf(" ");
  return (sp > 140 ? cut.slice(0, sp) : cut).trimEnd() + "…";
}

// 🔴 mirrors clickup-sync.mjs: 1 urgent, 2 high, 3 normal, 4 low. Driven by the
// emoji the owner already writes, so priority needs no second vocabulary.
function priorityOf(text) {
  if (text.includes("🔴")) return 1;
  if (text.includes("⭐") || text.includes("⚠️") || text.includes("🎯")) return 2;
  return 3;
}

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu;
const slug = s => (s || "")
  .replace(EMOJI, " ")
  .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
  .replace(/[*_~`]/g, "")
  .replace(/\([^)]*\)/g, " ")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "")
  .replace(/^(.{0,45})(-.*)?$/s, "$1")   // cut on a word boundary, never mid-word
  .replace(/-$/, "");

function sectionLabel(section) {
  return section.replace(EMOJI, "").replace(/[*_~`]/g, "").replace(/\s+/g, " ").trim();
}

// Sections whose work is already over. the owner chose to sync ALL 155 open boxes,
// which means the board inherits every superseded sweep block and the paused
// Family-safety list. One tag makes that filterable in a click instead of a
// board he has to read past. It is derived from the heading, so a section that
// gets retired later simply picks it up on the next push.
const DORMANT = /\bretired\b|\bpruned\b|\bon hold\b|\bwithdrawn\b|\bresolved\b|~~/i;

function tagsOf(item) {
  const t = ["daily"];
  const label = sectionLabel(item.section);
  const s = slug(item.section);
  if (s) t.push("daily." + s);
  if (/^sweep\b/i.test(label)) t.push("daily.sweep");
  if (DORMANT.test(item.section)) t.push("daily.dormant");
  return [...new Set(t)];
}

function describe(item) {
  const L = [];
  L.push(item.text);
  if (item.body.length) { L.push(""); L.push(...item.body); }
  L.push("", "---", "");
  L.push(`📄 **Source:** \`Daily.md\` › ${sectionLabel(item.section) || "(no section)"}`);
  L.push("");
  L.push("Mark this task complete and `node Tools/daily-sync.mjs --pull` ticks the box in `Daily.md`.");
  L.push("");
  L.push(`<!-- daily-anchor: ${item.anchor} -->`);
  return L.join("\n");
}

const sha = s => createHash("sha1").update(s).digest("hex");

// The one open status and the one closed status this tool writes. The Daily list
// inherits the Space's job-search statuses (there is no generic "To do"/"Done"
// pair), so "Needs you" is open and "Closed" is the closed-TYPE status ClickUp
// sets when you tick a task. Verified against the live list 2026-08-29.
const OPEN_STATUS = "Needs you";
const DONE_STATUS = "Closed";

function renderTask(item) {
  const payload = {
    name: taskName(item.text),
    markdown_content: describe(item),
    status: item.done ? DONE_STATUS : OPEN_STATUS,
    tags: tagsOf(item),
    priority: priorityOf(item.text),
    // 🔴 No dates. Same call as the ledger board (the owner, 2026-08-24): a date
    // invented from when something was written is not a deadline. Daily.md keeps
    // its real dates as prose in the ⏰ / 📅 Dated section.
    due_date: null,
    due_date_time: false,
    start_date: null,
    start_date_time: false,
  };
  return { anchor: item.anchor, item, payload, hash: sha(JSON.stringify(payload)) };
}

/* ══════════════════════════ 3. anchor writing ═══════════════════════════════
 * The only edit --push makes to Daily.md, and it is append-only per line: the
 * comment goes at the end of the `- [ ]` line and nothing else moves.
 */
function writeAnchors(items, text) {
  const lines = text.split("\n");
  const used = new Set(items.map(i => i.anchor).filter(Boolean));
  let added = 0;
  for (const item of items) {
    if (item.anchor) continue;
    let id;
    do { id = randomBytes(4).toString("hex"); } while (used.has(id));
    used.add(id);
    item.anchor = id;
    lines[item.line] = lines[item.line].replace(/\s*$/, "") + ` <!--cu:${id}-->`;
    added++;
  }
  return { text: lines.join("\n"), added };
}

/* ══════════════════════════ 4. api client ═══════════════════════════════════
 * Free plan is 100 requests/minute per token; 155 creates is under two minutes.
 */
const stamps = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));

function loadToken() {
  if (process.env.CLICKUP_TOKEN) return process.env.CLICKUP_TOKEN.trim();
  if (existsSync(TOKEN_PATH)) return readFileSync(TOKEN_PATH, "utf8").trim();
  return null;
}

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

// 🔴 PUT /task SILENTLY IGNORES `tags` — accepts the field, returns 200, changes
// nothing. Tags have their own endpoints. Same trap documented in clickup-sync.mjs.
async function syncTags(token, entry, want) {
  let have = entry.tags;
  if (!have) {
    try {
      const live = await api(token, `/task/${entry.taskId}`);
      have = (live.tags || []).map(t => t.name);
    } catch { have = []; }
  }
  const failed = [];
  for (const t of have.filter(x => !want.includes(x))) {
    try { await api(token, `/task/${entry.taskId}/tag/${t}`, { method: "DELETE" }); } catch { failed.push("-" + t); }
  }
  for (const t of want.filter(x => !have.includes(x))) {
    try { await api(token, `/task/${entry.taskId}/tag/${t}`, { method: "POST" }); } catch { failed.push("+" + t); }
  }
  return failed;
}

const readJson = (p, fallback) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : fallback);

function dailyListId() {
  const cfg = readJson(CONFIG_PATH, null);
  const id = cfg && cfg.lists && cfg.lists.daily && cfg.lists.daily.id;
  if (!id) throw new Error(`No Daily list id in ${CONFIG_PATH}. Run \`node Tools/clickup-sync.mjs --push\` once to resolve it, or see Tools/README.md.`);
  return id;
}

async function fetchDailyTasks(token, listId) {
  const live = [];
  // 🔴 ClickUp pages at 100. Without this loop a pull would check only the first
  // 100 tasks and silently report the rest as unchanged — the exact bug that hid
  // 207 Leads from clickup-sync's --pull.
  for (let page = 0; ; page++) {
    const res = await api(token, `/list/${listId}/task?include_closed=true&subtasks=false&page=${page}`);
    const batch = res.tasks || [];
    live.push(...batch);
    if (res.last_page || !batch.length) break;
  }
  return live;
}

const isDone = task => {
  const t = task.status && task.status.type;
  return t === "done" || t === "closed";
};

/* ══════════════════════════ 5. main ═════════════════════════════════════════ */

async function main() {
  const raw = readFileSync(DAILY_MD, "utf8");
  const items = parseDaily(raw);
  const open = items.filter(i => !i.done);

  say("");
  say("── Daily.md ───────────────────────────────────────────────────────");
  say(`   ${items.length} checkbox items  (${open.length} open, ${items.length - open.length} ticked)`);
  say(`   ${items.filter(i => i.anchor).length} already anchored, ${items.filter(i => !i.anchor).length} unanchored`);

  const bySection = items.reduce((m, i) => (m[sectionLabel(i.section)] = (m[sectionLabel(i.section)] || 0) + 1, m), {});
  const top = Object.entries(bySection).sort((a, b) => b[1] - a[1]);
  say("");
  for (const [s, n] of top.slice(0, 8)) say(`   ${String(n).padStart(4)}  ${s.slice(0, 66)}`);
  if (top.length > 8) say(`         … +${top.length - 8} more sections`);

  if (MODE === "pull") return pull(items, raw);

  /* ---- anchors ---- */
  let text = raw;
  // --dry anchors IN MEMORY ONLY. Without this the projection below reports
  // "create 0" on a virgin file, because nothing can be rendered without a key —
  // a preview that says it would do nothing is worse than no preview.
  if (MODE === "dry") writeAnchors(items, text);
  if (MODE === "push" || MODE === "anchor") {
    const r = writeAnchors(items, text);
    text = r.text;
    if (r.added) {
      writeFileSync(DAILY_MD, text);
      say("");
      say(`✅ wrote ${r.added} new anchor(s) into Daily.md`);
      say(`   Each is an invisible \`<!--cu:xxxxxxxx-->\` at the end of its \`- [ ]\` line.`);
      say(`   ⚠️  Daily.md changed. This is the Mac, so nothing was committed.`);
    } else {
      say("");
      say("✅ every checkbox already anchored — Daily.md unchanged");
    }
    if (MODE === "anchor") { say(""); return; }
  }

  const tasks = items.filter(i => i.anchor).map(renderTask);
  const map = readJson(MAP_PATH, {});

  say("");
  say("── projection ─────────────────────────────────────────────────────");
  const creates = tasks.filter(t => !map[t.anchor]);
  const updates = tasks.filter(t => map[t.anchor] && map[t.anchor].hash !== t.hash);
  say(`   create ${creates.length}   update ${updates.length}   skip ${tasks.length - creates.length - updates.length}`);
  say(`   tags:  ${new Set(tasks.flatMap(t => t.payload.tags)).size} distinct`);
  say(`   custom fields: 0 — permanent, see the header of this file`);

  // Anything tracked but no longer in the file. Reported, never deleted — a
  // missing anchor is usually a sweep rewriting a line, not the owner dropping a job.
  const liveAnchors = new Set(tasks.map(t => t.anchor));
  const orphans = Object.entries(map).filter(([a]) => !liveAnchors.has(a));
  if (orphans.length) {
    say("");
    say(`⚠️  ${orphans.length} tracked task(s) no longer have a matching anchor in Daily.md.`);
    say(`   NOT deleted — usually a sweep rewrote the line and dropped its anchor.`);
    orphans.slice(0, 8).forEach(([a, e]) => say(`   · ${(e.name || a).slice(0, 72)}`));
    if (orphans.length > 8) say(`   … +${orphans.length - 8} more`);
  }

  if (MODE === "dry") {
    const n = Math.max(0, parseInt(argOf("--sample") || "3", 10));
    for (const t of tasks.slice(0, n)) {
      say("");
      say("── sample task ────────────────────────────────────────────────────");
      say(`   name:     ${t.payload.name.slice(0, 96)}`);
      say(`   list:     Daily`);
      say(`   status:   ${t.payload.status}`);
      say(`   priority: ${t.payload.priority}   tags: ${t.payload.tags.join(" ")}`);
      say(`   body:     ${t.payload.markdown_content.split("\n").length} lines`);
    }
    say("");
    say("--dry: nothing written, no network calls made");
    say("   Anchors above were generated in memory and NOT saved, so the ids differ");
    say("   every run. --anchor or --push is what fixes them into Daily.md.");
    say("");
    return;
  }

  const token = loadToken();
  if (!token) {
    say("");
    say("🔴 No ClickUp token. Expected at ~/.config/clickup-sync/token or $CLICKUP_TOKEN.");
    process.exit(1);
  }
  return push(token, tasks, map);
}

async function push(token, tasks, map) {
  const listId = dailyListId();
  let created = 0, updated = 0, skipped = 0, closedOnBoard = 0, n = 0;

  say("");
  say("── pushing ────────────────────────────────────────────────────────");

  for (const t of tasks) {
    const existing = map[t.anchor];
    if (existing && existing.hash === t.hash && !FORCE) { skipped++; continue; }
    if (created + updated >= LIMIT) break;

    try {
      if (existing) {
        const body = { ...t.payload };
        // 🔴 MONOTONIC: never re-open a task that is done on the board. If the box
        // in Daily.md is still [ ] but the board says done, that is a tick waiting
        // for the next --pull, not a mistake to correct. Overwriting it here would
        // silently undo the exact gesture this whole tool exists to carry.
        // ⚠️ `existing.done` is a CACHED view of the board, not the board. A push
        // deliberately makes no read calls, so it trusts what the last --pull saw.
        // --pull rewrites this flag in BOTH directions on every run, so re-opening
        // a task in ClickUp un-sticks it — without that the flag would latch true
        // forever and a later tick in Daily.md could never close the task again.
        if (existing.done && !t.item.done) delete body.status;
        await api(token, `/task/${existing.taskId}`, { method: "PUT", body });
        const fail = await syncTags(token, existing, t.payload.tags);
        if (fail.length) say(`   ⚠️  tag sync failed on ${t.payload.name.slice(0, 40)}: ${fail.join(" ")}`);
        map[t.anchor] = { ...existing, hash: t.hash, name: t.payload.name, section: sectionLabel(t.item.section), done: existing.done || t.item.done, tags: t.payload.tags };
        if (t.item.done && !existing.done) closedOnBoard++;
        updated++;
      } else {
        const res = await api(token, `/list/${listId}/task`, { method: "POST", body: t.payload });
        map[t.anchor] = { taskId: res.id, hash: t.hash, name: t.payload.name, section: sectionLabel(t.item.section), done: t.item.done, tags: t.payload.tags };
        created++;
      }
    } catch (e) {
      say(`   ⚠️  ${t.payload.name.slice(0, 60)} — ${e.message.slice(0, 160)}`);
    }

    if (++n % 25 === 0) {
      writeFileSync(MAP_PATH, JSON.stringify(map, null, 2) + "\n");
      say(`   … ${n} processed (${created} created, ${updated} updated)`);
    }
  }

  writeFileSync(MAP_PATH, JSON.stringify(map, null, 2) + "\n");
  say("");
  say(`✅ created ${created}   updated ${updated}   skipped ${skipped} (unchanged)`);
  if (closedOnBoard) say(`   ${closedOnBoard} task(s) closed on the board because the box was ticked in Daily.md`);
  say(`   map: Tools/daily-map.json — ${Object.keys(map).length} tracked items`);
  say("");
  // Only warn when something actually moved. A no-op push that claims the repo
  // changed trains you to ignore the line that matters.
  if (created || updated) say("⚠️  Repo files changed (daily-map.json). This is the Mac, so nothing was committed.");
  else say("   Nothing changed — no repo files written.");
  say("");
}

/* ── --pull ───────────────────────────────────────────────────────────────────
 * The half the owner actually asked for: tick it in ClickUp, see it ticked here.
 * Writes ONE character per changed line. Never touches item text.
 */
async function pull(items, raw) {
  const token = loadToken();
  if (!token) { say(""); say("🔴 No ClickUp token — see Tools/README.md."); process.exit(1); }

  const map = readJson(MAP_PATH, {});
  const listId = dailyListId();
  const live = await fetchDailyTasks(token, listId);
  const byId = new Map(live.map(t => [t.id, t]));
  const byAnchor = new Map(items.filter(i => i.anchor).map(i => [i.anchor, i]));

  say("");
  say("── board → Daily.md ───────────────────────────────────────────────");
  say(`   ${live.length} task(s) in the Daily list, ${Object.keys(map).length} tracked from Daily.md`);

  const tick = [];        // done on board, still [ ] here
  const behind = [];      // ticked here, still open on board
  const gone = [];        // tracked but the task is no longer on the board

  for (const [anchor, entry] of Object.entries(map)) {
    const task = byId.get(entry.taskId);
    if (!task) { gone.push({ anchor, entry }); continue; }
    const item = byAnchor.get(anchor);
    if (!item) continue;                       // anchor dropped from the file; --push reports it
    if (isDone(task) && !item.done) tick.push({ anchor, item, task });
    if (!isDone(task) && item.done) behind.push({ anchor, item, task });
  }

  // Refresh the cached board state before anything else. This is what keeps
  // `existing.done` in push honest, and it is the ONLY place the flag can go back
  // to false — i.e. the only thing that notices the owner re-opened a task in ClickUp.
  let refreshed = 0;
  for (const [anchor, entry] of Object.entries(map)) {
    const task = byId.get(entry.taskId);
    if (!task) continue;
    const done = isDone(task);
    if (entry.done !== done) { map[anchor] = { ...entry, done }; refreshed++; }
  }

  const untracked = live.filter(t => !Object.values(map).some(e => e.taskId === t.id));

  say("");
  if (!tick.length) say("   nothing to tick — no board task is complete whose box is still open here");
  for (const { item, task } of tick) {
    say(`   ☑ ${item.text.replace(/\*\*/g, "").slice(0, 74)}`);
    say(`     ${sectionLabel(item.section).slice(0, 60)}  ·  board: ${task.status.status}`);
  }

  if (behind.length) {
    say("");
    say(`⚠️  ${behind.length} item(s) are ticked in Daily.md but still open on the board.`);
    say(`   --pull never un-ticks, so these are left alone. \`--push\` closes them.`);
    behind.slice(0, 6).forEach(b => say(`   · ${b.item.text.replace(/\*\*/g, "").slice(0, 72)}`));
  }
  if (gone.length) {
    say("");
    say(`⚠️  ${gone.length} tracked task(s) no longer exist on the board (deleted in ClickUp).`);
    say(`   Their boxes are left as they are. \`--push\` will recreate them.`);
  }
  if (untracked.length) {
    say("");
    say(`ℹ️  ${untracked.length} task(s) in the Daily list did not come from Daily.md`);
    say(`   — \`/emailreply\` captures and anything you added on the board. Untouched.`);
  }

  if (!tick.length) {
    if (refreshed && !DRY) {
      writeFileSync(MAP_PATH, JSON.stringify(map, null, 2) + "\n");
      say("");
      say(`   (refreshed the cached board state on ${refreshed} item(s))`);
    }
    say("");
    return;
  }

  if (DRY) {
    say("");
    say(`--dry: ${tick.length} box(es) would be ticked. Daily.md NOT written.`);
    say("");
    return;
  }

  // Rewrite the box only. The anchor and every character of the text stay put.
  const lines = raw.split("\n");
  for (const { item } of tick) {
    const before = lines[item.line];
    const after = before.replace(/^(\s*- )\[ \]/, "$1[x]");
    if (after === before) { say(`   ⚠️  line ${item.line + 1} did not match a checkbox — skipped`); continue; }
    lines[item.line] = after;
  }
  writeFileSync(DAILY_MD, lines.join("\n"));

  for (const { anchor } of tick) map[anchor] = { ...map[anchor], done: true };
  if (refreshed) say(`   (also refreshed the cached board state on ${refreshed} item(s))`);
  writeFileSync(MAP_PATH, JSON.stringify(map, null, 2) + "\n");

  say("");
  say(`✅ ticked ${tick.length} box(es) in Daily.md`);
  say(`   Only the [ ] → [x] changed. No text was edited, nothing reordered.`);
  say("");
  say("⚠️  Repo files changed (Daily.md, daily-map.json). This is the Mac, so nothing was committed.");
  say("");
}

main().catch(e => { console.error("\n🔴 " + e.message + "\n"); process.exit(1); });
