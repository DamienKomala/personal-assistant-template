---
name: daily
description: Sync Daily.md checkboxes to the ClickUp Daily list and back. Add a task in Daily.md, tick it off in ClickUp, pull the tick back into Daily.md. Only ever changes a checkbox character in Daily.md — never the text of an item.
---

# Daily

**`Daily.md` is where tasks are WRITTEN. ClickUp's `Daily` list is where they get TICKED OFF** — on a phone, away from the machine. **`Tools/daily-sync.mjs` carries the tick back.**

The ask this exists to serve, in the source repo owner's words: *"Tasks on daily.md added here, resolved there and updated here."*

⚠️ **Optional.** If ClickUp isn't set up, `Daily.md` still works fine as a plain markdown to-do list — **this skill is the half that makes it reachable from a phone.** Setup is in [Tools/README.md](../../../Tools/README.md).

## Which mode

| {{FIRST_NAME}} said | Run |
|---|---|
| "sync my daily list", "push my tasks", "put today's list on the board" | `node Tools/daily-sync.mjs --push` |
| "I ticked things off", "update Daily.md", "pull my tasks back" | `node Tools/daily-sync.mjs --pull` |
| "what would change?", anything ambiguous, first run of a session | `node Tools/daily-sync.mjs --dry` |
| "show me what I ticked but don't write it yet" | `node Tools/daily-sync.mjs --pull --dry` |

✅ **A normal day is `--pull` then `--push`**, in that order: **take the ticks first so the file is current, then send whatever a sweep added.** Doing it the other way round works too — **the merge cannot lose data** — but `--pull` first means the push report reflects reality.

`--dry` needs no token and makes no network call. `--pull --dry` does hit the API (it must read the board) **but writes nothing.**

## The two rules that make it safe

🔴 **The merge is MONOTONIC on both sides.** `--pull` only ever **ticks** a box; it never un-ticks one. `--push` only ever **closes** a board task; it never re-opens one. **Done is absorbing in both directions, so the two sides can never fight and there is no race to lose work to.** **This is why the tool needs no timestamps and no conflict resolution.**

**Un-ticking is therefore a manual act.** If something needs re-opening, un-tick it on *both* sides. **The other side is REPORTED in the next run rather than silently overwritten** — watch for the `⚠️ ticked in Daily.md but still open on the board` block.

🔴 **`--pull` writes exactly ONE CHARACTER per changed line: `[ ]` → `[x]`.** **It never edits an item's text, never reorders, never deletes, never touches a line without a matching anchor.**

**This is a deliberate contrast with `clickup-sync.mjs`, whose `--pull` writes NO markdown at all** — because that one projects the **ledger**, a source of truth a board must not edit. **`Daily.md` holds no state anything else reads, so the loop is safe here and nowhere else.**

## Anchors

**Every synced checkbox carries an invisible `<!--cu:xxxxxxxx-->` comment at the end of its `- [ ]` line.** It renders as nothing and **it is that item's identity.**

🔴 **It has to be an anchor rather than a content hash because sweeps rewrite this file every day** — *"fifth day carried"* becomes *"sixth day carried"* — **and a hash would orphan the task every time the wording moved.** A tick coming back from the board would then land on the wrong line or nowhere at all.

⚠️ **When a sweep rewrites a carried-forward item, carry its anchor forward with the text.** Drop it and the item re-syncs as a new task while the old one is reported as an orphan. **Nothing is lost; it is just noise, and the orphan count in `--push` is where it shows up.**

`--anchor` writes missing anchors and does nothing else — **useful if you want the file stamped without touching ClickUp.**

## What it will not do

- **It never deletes a board task.** An anchor that vanishes from `Daily.md` is *reported* as an orphan, **because the usual cause is a sweep rewriting a line, not {{FIRST_NAME}} dropping the job.** **Deleting is a call to make on the board.**
- **It never touches `/emailreply` capture tasks** already in the Daily list, or anything added on the board by hand. **Those have no anchor, so they are not in `Tools/daily-map.json` and are invisible to it.** **The pull report counts them so their presence is never a surprise.**
- 🔴 **It never creates a custom field.** Free plan allows **60 uses for the LIFETIME of the workspace and they never reset.** Status, tags, priority and description are all native and unlimited. **Same permanent rule as `clickup-sync.mjs`.**
- **It sets no dates.** Same call as the ledger board: **a date derived from when something was written is not a deadline.** `Daily.md` keeps its real dates as prose in its own `📅 Dated` section.

## Reading the board

**Everything from `Daily.md` carries the tag `daily`.** Beyond that:

- **`daily.dormant`** — the item is in a Retired / Pruned / ON HOLD / RESOLVED section. **The one-click way to hide superseded blocks** without excluding them from the sync.
- **`daily.sweep`** — from a `📬 Sweep` block. **Evergreen sections don't carry it.**
- **`daily.<section>`** — one per `##` heading, so the board can be grouped the way the file reads.

**Priority comes from the emoji already in the file: 🔴 → Urgent, ⭐/⚠️/🎯 → High, everything else Normal.** ✅ **No second vocabulary to maintain.**

## Relationship to the other tools

| | Source of truth | `--pull` writes markdown? |
|---|---|---|
| `daily-sync.mjs` | `Daily.md` | ✅ **yes — the checkbox character only** |
| `clickup-sync.mjs` | `Job Search/pipeline.md` | 🔴 **never** |

**Both write to the same ClickUp Space and both are hash-based, but they keep SEPARATE MAPS (`daily-map.json` vs `clickup-map.json`) and touch DISJOINT sets of tasks, so neither can stand on the other.**

⚠️ **If a `Daily.md` item is really a pipeline stage change, it belongs in the ledger.** **This tool is a to-do list, not a second ledger** — run `/emailjobsearch` for anything that moves a stage.
