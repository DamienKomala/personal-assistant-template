---
name: job-pipeline
description: Review the job pipeline — check what moved, surface applications that have gone quiet, and draft follow-ups. Draft-only; stage changes are written to the ledger, Gmail is never modified without confirmation.
---

# Job Pipeline

**Keeps `Job Search/pipeline.md` honest and catches opportunities dying of silence.**

## Steps

### 0. Cheap first pass — ask the board what changed *(skip if ClickUp is not configured)*

```bash
node Tools/clickup-sync.mjs --pull
```

**It reports what {{FIRST_NAME}} changed on the board and what disagrees with the ledger, without reading the whole ledger.**

🔴 **It reports; it never writes.** Anything it surfaces is applied to the ledger in step 3 like any other finding. **On any conflict the ledger wins — the board is a projection, not a second source of truth.**

⚠️ **Skip this entirely if the board isn't set up** and go straight to step 1. **Nothing here depends on it.**

### 1. Read

`Job Search/pipeline.md`, `Data/job-criteria.md`, and `Prompts/reply-tone.md`.

**The ledger is four files and this skill needs one:** **`pipeline.md`** (live work). **`pipeline-leads.md`** is the un-worked backlog — read it only if {{FIRST_NAME}} is working leads. **`pipeline-archive.md`** is closed rows — **`grep` it, never read it whole.** **`pipeline-dossiers.md`** is long-form history — open one section only if a row's provenance is genuinely in question.

### 2. Check each active row for movement

**Re-open the Gmail thread by its stored `Thread` id (`get_thread`).** Look for anything newer than the row's `Last touch`: a recruiter reply, an interview invitation, a rejection, a request for information.

**If a row has no thread id, search Gmail by company and role to find it, then backfill the id.**

🔴 **`get_thread` OR NOTHING — never settle a row from a `search_threads` message list.** **It truncates silently, and the messages it drops include both sends and inbound mail.** In the source repo a search returned five messages on a live thread; `get_thread` on the same id returned seven, and **both hidden messages were sends — including a thank-you sent three hours earlier.** **If the two counts disagree, the search was truncated and every conclusion from it is void.**

🔴 **THIS APPLIES HARDEST TO NEGATIVE FINDINGS, WHICH IS WHERE IT ACTUALLY BIT.** **Never report a row as unanswered, a draft as unsent, or a follow-up as owed without `get_thread` on that thread first.** **A claim that nothing went out is still a claim**, and a short result list looks identical to a truncated one. ⚠️ **A stale row is cheap; telling {{FIRST_NAME}} to chase a recruiter he/she already answered is not.**

⚠️ **And a leftover draft proves nothing.** Third-party mail clients rewrite a draft when they open one and leave the original behind after the send. **A draft whose creation time sits just before a `SENT` message on the same thread is residue — report it as residue, not as work outstanding.**

### 3. Update stages based on what the thread actually shows

- A recruiter or hiring manager responded → `Replied` becomes **`Screening`**
- Interview scheduled or held → **`Interviewing`**
- Rejection language → **propose `Closed`**, and flag the thread for a label move
- Offer extended → **`Offer`**, and flag it prominently

⚠️ **Check the calendar too, not just the mailbox.** A screen booked through a recruiter's own scheduling page **exists only on the calendar** — in the source repo the single most important entry of one week was an interview that never appeared in email at all.

### 4. Find the stale ones

Default thresholds, measured from `Last touch`:

| Stage | Silent for |
|---|---|
| `Applied`, no response | **7 days** |
| `Replied`, no response | **5 days** |
| `Screening` or `Interviewing`, no response | **7 days** |
| Any stage | **30+ days** → propose `Closed`, reason "no response" |

### 5. Draft follow-ups for stale rows

`create_draft`, **never send.** Follow `Prompts/reply-tone.md` — **accommodating and warm, not pushy.**

**A good follow-up restates interest in one line, adds something of value** (a relevant portfolio piece, a note on a company development), **and makes it easy to reply.**

🔴 **NO SIGNATURE** — end at the sign-off line. {{FIRST_NAME}} adds one at send time. Same rule as `/emailjobsearch` and `/emailreply`.

**Reply within the existing thread where one exists.** For an application with **no human thread** — an automated relay receipt, say — **there is nobody to follow up with.** **Note it as "no reply channel" instead of drafting into the void.**

### 6. Write the ledger

Update `Stage`, `Last touch`, and `Next action` in `Job Search/pipeline.md`. **Ledger edits apply directly; Gmail changes do not.**

✅ **Closing a row means MOVING it, not striking it through.** Migrate the full row into **`Job Search/pipeline-archive.md`** under its Closed table — **with its own table header and `|---|` separator above it**, or the parser cannot see it — and leave a one-line stub in `pipeline.md`:

```
| **<Company>** | — | — | — | **Closed** | **<date>** | ➡️ **Full row in [pipeline-archive.md](pipeline-archive.md)** — <reason>, migrated <date> | <threadid> |
```

🔴 **The pointer must be in the `Next action` column (column 7).** Anywhere else and the stub parses as a real row, so the archived original and the stub are both counted.

**Struck-through rows left in the live table are what forced the ledger split in the source repo** — 18KB of a 54KB section was already dead. **This skill is the one most likely to close things in bulk, so it is the one most able to undo the split.**

⚠️ **After migrating, run `node Dashboards/build-data.mjs --dry`.** **The live section must DROP by exactly the number migrated and `closed` must RISE by the same number, with the TOTAL UNCHANGED.** **A total that goes UP means the migration duplicated instead of moving.**

## Output

- **Pipeline snapshot** — count by stage, then the active rows ordered by stage (`Offer` and `Interviewing` first).
- **Moved since last run** — what changed and why.
- **Gone quiet** — stale rows, how long they've been silent, and whether a follow-up was drafted or there's no reply channel.
- **Drafted** — one line per follow-up. **Saved to Gmail Drafts, never sent.**
- **Proposed for `Closed`** — rows silent 30+ days or explicitly rejected, **awaiting confirmation.**

**End with the single most useful next action {{FIRST_NAME}} could take today.**
