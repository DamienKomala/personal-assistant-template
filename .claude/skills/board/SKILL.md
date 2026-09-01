---
name: board
description: Push the job-search ledger onto the ClickUp board, or pull a divergence report back. Also captures ad-hoc tasks to the Daily list. The board is a projection of Job Search/pipeline.md — the ledger always wins. Never writes markdown.
---

# Board

**The ClickUp board is a *writable projection* of the ledger**, the same way `Dashboards/job-tracker.html` is a read-only one.

🔴 **`Job Search/pipeline.md` is the source of truth. If the board and the ledger disagree, the ledger is right and the board is stale.** **This skill never resolves a disagreement by writing markdown.**

⚠️ **Optional.** If ClickUp isn't set up, this skill and `/daily` simply don't apply — **nothing else in the repo depends on either.** Setup is in [Tools/README.md](../../../Tools/README.md).

## 🔴 Not this skill? You probably want `/daily`

**Two different tools write to the same ClickUp Space and their `--pull` semantics are OPPOSITE. That is the single most important thing on this page.**

| | Source of truth | List(s) | `--pull` writes markdown? |
|---|---|---|---|
| **`/board`** — `Tools/clickup-sync.mjs` | `Job Search/pipeline.md` | Conversations, Applications, Leads, Archive … | 🔴 **never** |
| **`/daily`** — `Tools/daily-sync.mjs` | `Daily.md` | **Daily** only | ✅ **yes — the checkbox character, nothing else** |

- **"push the board", "sync the ledger", a stage moved** → this skill.
- **"I ticked things off on my phone", "update Daily.md", a checkbox was added** → **`/daily`**.

✅ **They cannot collide.** Separate maps (`clickup-map.json` vs `daily-map.json`) over disjoint task sets, and `--pull` here already skips the Daily list when reporting board-only tasks. ⚠️ **`--capture` writes into that same Daily list**, but its tasks carry no `<!--cu:-->` anchor, so `/daily` treats them as untracked and never touches them.

🔴 **Do not borrow a rule from `/daily` into this skill.** Its `--pull` may edit markdown *because `Daily.md` is a to-do list holding no state anything else reads.* **The ledger is the opposite case, and that exception does not travel.**

## Which mode

| {{FIRST_NAME}} said | Run |
|---|---|
| "push the board", "sync ClickUp", "update the board" | `node Tools/clickup-sync.mjs --push` |
| "what's on the board?", "what did I change?", "does it match?" | `node Tools/clickup-sync.mjs --pull` |
| "add a task", "remind me to X" | `node Tools/clickup-sync.mjs --capture "X"` ⚠️ **`--due` is legitimate HERE and nowhere else — it is a date {{FIRST_NAME}} gave, not one derived from a receipt.** |
| "the dates are wrong", "strip the dates" | `node Tools/clickup-sync.mjs --clear-dates` — one-time pass over every tracked task |
| anything ambiguous, or first run of the day | `node Tools/clickup-sync.mjs --dry` first |

✅ **Always run `--dry` before a first push in a session.** **It needs no token, makes no network calls, writes nothing**, and catches the three failures below before they reach ClickUp.

## When it refuses to run

**All three are real ledger bugs. Fix the ledger — do not work around the check.**

1. **Malformed table row.** Pipe counts disagree with the separator. **This is the corruption that once cost the dashboard its entire applications table:** rows inserted between a header and its `|---|` shifted every column by one, 112 rows got a bogus stage, **and the row total went UP** so the same-or-higher rule passed on a corrupt table.

   **Anchor inserts on the SEPARATOR, never the header.** **Never put a raw `|` in a cell — escape it as `\|`.** `splitRow` in `Dashboards/lib/ledger.mjs` honours a backslash escape, so `\|` parses back to a real `|` with every column intact. 🔴 **`&#124;` is the one that misbehaves** — nothing in this pipeline decodes HTML entities, so it survives as literal text and reaches the dashboard and the board that way. **`/` is fine when a slash reads naturally.**

2. **A stage outside the canonical enum.** The `Stage` cell holds narrative instead of a stage. Either rewrite the cell, **or — if the wording is a recurring pattern worth keeping — add a tier-3 rule to `STAGE_RULES` in `Dashboards/lib/ledger.mjs`.** 🔴 **Tier-3 rules go BELOW the canonical ones:** `"Applied — off-criteria"` is an application that was actually submitted, and reading it as `Off-criteria` loses that.

3. **A missing ClickUp status.** **Statuses are UI-only; the API cannot create them.** The error names which to add.

## The board drifted from the ledger — which way do you push?

- **The ledger changed** (a sweep, a hand edit) → `--push`. Normal, cheap, hash-based.
- **{{FIRST_NAME}} changed something on the board** → `--pull` reports it. **Apply it to the ledger**, then `--push`. 🔴 **Never let the board be the winner by default.**
- **The board is wrong and the ledger is right** → `--push --force` overwrites every row. ⚠️ **This discards board-side edits, so run `--pull` first and read it.**

⚠️ **A plain `--push` will NOT fix a board-side edit.** It skips rows whose hash is unchanged — **deliberately, so a sweep never stomps what {{FIRST_NAME}} changed on a phone.**

## Guardrails

- 🔴 **`--pull` reports and never writes.** Apply what it finds to the ledger by hand or through `/emailjobsearch` — **never by having a sync job edit markdown from a board.**
- 🔴 **NEVER CREATE A CLICKUP CUSTOM FIELD.** The free plan allows **60 uses for the LIFETIME of the workspace and they never reset** — about twelve tasks, then permanently dead. **Everything uses native statuses, tags, priority and dates, all unlimited.** **There is no code path that writes one; do not add it.**
- 🔴 **NEVER USE CLICKUP'S MCP SERVER** (`mcp.clickup.com`). **It is capped at 50 calls per 24 hours on the free plan — one sweep exhausts it.** **The REST API on the same plan allows 100/minute.**
- ⚠️ **One parser, never two.** Both the board and the dashboard read the ledger through `Dashboards/lib/ledger.mjs`. **A second parser is how the dashboard silently lost its applications table.**
- 🔴 **Never put `/` in a tag name.** ClickUp's tag endpoints 404 on a slash even URL-encoded, **so a slash tag can be created but never removed by any endpoint.** Use `.` — `sec.conversation`, `mark.urgent`.
- 🔴 **THE BOARD IS DATELESS AND UNASSIGNED BY DESIGN.** In the source repo `start_date` was the applied/found date and **106 of 157 due dates were DERIVED from that same receipt date** (applied +14d, replied +7d, needs-you +2d). **An invented deadline computed from a receipt is not a deadline, and a column that is two-thirds fabricated teaches you to ignore all of it.**
  - ⚠️ **This removes the only reminder mechanism.** **ClickUp notifies a due date solely to the task's ASSIGNEE**, so with nothing dated there is nothing to fire — **and assignment is off too, or *My Tasks* would hold every row and none could ever come due.**
  - ✅ **Nothing is lost: re-check dates live in `pipeline.md` as `⏰ Re-check <date>` prose, which is what a sweep reads.**
  - 🔴 **DO NOT RE-ADD DATES BECAUSE THE COLUMN LOOKS EMPTY.** `dueOf()` returns null on purpose and keeps the old logic commented out with the reasoning. **If dates are ever wanted back, restore ONLY the explicit `⏰` branch — never the derived ones.**
- ⚠️ **`mark.*` tags are text markers, not state.** A ✅ in a cell becomes `mark.done` and **does NOT mean the row is done** — only the status carries state.
- ⚠️ **Report duplicate groups rather than merging them.** They are usually true duplicates already in the ledger. **Deduping is a ledger edit and {{FIRST_NAME}}'s call.**
- ⚠️ **Every migration leaves an orphan task behind.** `clickup-sync.mjs` creates and updates but **never deletes** — deliberately, so nothing can destroy work. **Orphans accumulate and must be cleared by hand in the ClickUp UI.** Task ids are in `Tools/clickup-map.json`.
- ⚠️ **`clickup-map.json` and `clickup-config.json` change on every push.** Per the git rule in `CLAUDE.md`, **leave them in the working tree on the primary machine — don't commit them automatically.**

**Setup, and what each check is defending against: [Tools/README.md](../../../Tools/README.md).**
