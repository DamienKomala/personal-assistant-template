# Job Search Pipeline

> ### 🔥 **This file is the HOT ledger — live work only. Three companion files hold the rest.**
>
> | File | What's in it | When to read it |
> |---|---|---|
> | **`pipeline.md`** *(this file)* | Active recruiter conversations, live applications, gig/contract, notes | **Every sweep. Read it whole.** |
> | **[`pipeline-dossiers.md`](pipeline-dossiers.md)** | Long-form history behind live rows — reasoning, corrections, superseded analysis | **Never in a sweep.** Open one section when a row's provenance matters. |
> | **[`pipeline-leads.md`](pipeline-leads.md)** | The un-worked lead backlog | **Only when working leads.** A sweep *appends*; it never reads. |
> | **[`pipeline-archive.md`](pipeline-archive.md)** | Every sweep narrative and every closed row | **Never read whole — `grep` it.** Provenance, not state. |
>
> ⚠️ **All four are one ledger.** `Dashboards/build-data.mjs` reads **three** of them — `pipeline-dossiers.md` holds no tables and is deliberately not parsed. **A row lives in exactly one file.**
>
> ✅ **Closing a row means MOVING it.** Migrate the full row to `pipeline-archive.md` and leave a one-line stub here.
>
> 🔴 **THE SPLIT EXISTS FOR A REASON — READ THIS BEFORE YOU LET THIS FILE GROW.** In the source repo this template came from, `pipeline.md` twice climbed past **292KB** and blew the 256KB read cap, at which point the skill that reads it *silently could not*. **Both times the weight was narrative packed inside LIVE table cells, not dead rows.** One `Next action` cell reached **29.9KB — eleven percent of the file.**
>
> ✅ **THE RULE THAT KEEPS IT SMALL: `Next action` answers "what happens next", not "what happened".** **When a cell passes roughly 1,200 characters, move the history to `pipeline-dossiers.md` and leave a link.**
>
> ⚠️ **Sweeps append to the front of a cell and never delete — that is how a 29KB cell happens.** **Append the new state, then move the old state out in the same pass.**
>
> ⚠️ **The failure has two shapes and only one is visible when you sort by size:** once it was a single 29.9KB cell; once it was twenty-five merely-large ones with a 4.4KB maximum. **Sum the cells over 1,200 characters, don't just check the maximum.**
>
> ⚠️ **Closing silent rows does NOT fix size, and it will be the first thing you try.** Dead rows are the lean ones. **Closing rows is for accuracy; splitting cells is for size.**

Living record of every opportunity in flight. Source of truth for `/job-pipeline`, `/emailjobsearch`, and `/job-search`.

**Checking whether a company is a repeat is a Gmail search, not a spreadsheet lookup** — `in:anywhere "<company>"`. Repeat applications are the norm, not the exception; run the check before writing a row that calls a company new.

## Stages

`Lead` → `Applied` → `Replied` → `Screening` → `Interviewing` → `Offer` → `Closed`

- **Lead** — identified, not yet acted on
- **Applied** — application submitted, no human response yet
- **Replied** — {{FIRST_NAME}} answered a recruiter, awaiting their move
- **Screening** — recruiter/HR conversation underway, pre-interview
- **Interviewing** — scheduled or completed interviews with the team
- **Offer** — offer extended
- **Closed** — rejected, withdrawn, or gone silent 30+ days

**Columns:** `Thread` is the Gmail thread id — it lets any skill re-open the source conversation without re-searching. Dates are `YYYY-MM-DD`. Use `—` for not-applicable.

**Last swept:** *(never — this is a fresh template. The first `/emailjobsearch` run writes a one-paragraph summary here and puts the full narrative in `pipeline-archive.md`.)*

## Active — recruiter conversations

Conversations where {{FIRST_NAME}} has replied and is awaiting the recruiter's move — except any row at stage `Lead`, which he/she has not yet responded to.

| Company | Role | Source | Applied | Stage | Last touch | Next action | Thread |
|---|---|---|---|---|---|---|---|

## Active — applications

| Company | Role | Source | Applied | Stage | Last touch | Next action | Thread |
|---|---|---|---|---|---|---|---|

### Applied but off-criteria

Applications that were submitted but fall outside `../Data/job-criteria.md`. **File rather than delete** — the ratio is worth being able to see, and if any automated application service is ever in play, this section is the audit trail for what it did without being asked.

| Company | Role | Source | Applied | Stage | Last touch | Next action | Thread |
|---|---|---|---|---|---|---|---|

## Active — gig / contract

Short projects, AI-training work, per-task engagements. **In scope and tracked here, but structurally different from a full-time search** — don't let it crowd the main pipeline out of the ledger.

| Source | Engagement | Rate | Stage | Last touch | Next action | Thread |
|---|---|---|---|---|---|---|

## Active — other

Anything real that fits none of the sections above.

| Company | Role | Source | Applied | Stage | Last touch | Next action | Thread |
|---|---|---|---|---|---|---|---|

---

## Notes

Everything below was learned the expensive way in the source repo. **None of it is theoretical — each note exists because something broke silently and cost real work.** Keep them; they are the most valuable thing in this template.

### 🔴 A MALFORMED TABLE ROW IS SILENT AND IT COST A DASHBOARD ITS ENTIRE APPLICATIONS TABLE

**A sweep once inserted eight new rows BETWEEN a table header and its `|---|` separator.** Markdown tolerated it visually. The parser did not. **Every row below the misplaced separator was read with its columns shifted by one** — `Stage` came out as a date, `Thread` came out as prose, and **112 rows were filed under a stage of `Unrecorded`.**

🔴 **THE BUILD DID NOT ERROR AND THE ROW COUNT WENT UP, WHICH IS EXACTLY WHY IT SURVIVED A DAY.** The same-or-higher row-count rule passed on a corrupt table. **A column shift does not lose rows. It corrupts them.**

✅ **THE CHECK THAT ACTUALLY WORKS — run it before every publish. Row counts do not detect this; pipe counts do:**

```bash
# every row between two separators must match its separator's pipe count
python3 - <<'EOF'
import re
for f in ['pipeline.md','pipeline-leads.md','pipeline-archive.md']:
    L=open(f,encoding='utf-8').read().split('\n'); expect=None; bad=0
    for n,l in enumerate(L):
        if re.match(r'^\|[\s\-:|]+\|$', l): expect=len(l.split('|')); continue
        if not l.startswith('|'): expect=None; continue
        if expect and len(l.split('|'))!=expect:
            bad+=1; print(f'{f} L{n+1}: {len(l.split("|"))} cols, expected {expect}')
    print(f'{f}: {bad} malformed')
EOF
```

**Three rules follow and they are cheap:**

- 🔴 **When inserting rows, anchor on the SEPARATOR line, never on the header.** Insert after `|---|---|`, not after `| Company | Role |`.
- 🔴 **Never put a raw `|` in a cell. Escape it as `\|`.** `splitRow` in `Dashboards/lib/ledger.mjs` honours a backslash escape (`if (c === "\\") { cur += line[i + 1]; i++; continue; }`), so `\|` parses back to a real `|` with every column intact. **`&#124;` is the one that misbehaves** — nothing in this pipeline decodes HTML entities, so it survives as literal text and reaches the dashboard and the board that way. **`/` is fine when a slash reads naturally.**
- 🔴 **A migrated row with no table header is INVISIBLE, and the row count goes DOWN rather than up.** The parser only recognizes a table when a `|` line is followed by a rule. A row migrated into `pipeline-archive.md` without a header and separator above it is not in the ledger at all — not in the dashboard, not on the board, not in any count — **while still rendering perfectly in Markdown, which is why nobody sees it.**
- ✅ **Verify the STAGE HISTOGRAM after every build, not just the row total.** A block of `Unrecorded` is the tell. `by stage:` is printed by `build-data.mjs` on every run and it is the cheapest correctness signal available.

### 🔴 A MIGRATION STUB ONLY COUNTS AS A STUB IF THE POINTER IS IN THE **NEXT ACTION** COLUMN

`Dashboards/lib/ledger.mjs` skips a stub with exactly one test, and it reads ONE column:

```js
const nextRaw = at(r, "next action");
if (/Full row in \[pipeline-archive\.md\]/.test(nextRaw)) continue;
```

🔴 **Put the pointer anywhere else and the stub parses as a REAL row** — so the migrated original in `pipeline-archive.md` AND the stub here are both counted, and every total inflates by one per migration.

⚠️ **This is easy to get wrong because the stub *looks* correct either way.** A pointer in the `Role` column reads perfectly well to a human and renders fine on the dashboard. Nothing warns you.

✅ **THE CANONICAL SHAPE, and the only one that works:**

```
| **<Company>** | — | — | — | **Closed** | **<date>** | ➡️ **Full row in [pipeline-archive.md](pipeline-archive.md)** — <reason>, migrated <date> | <threadid> |
```

**Columns 2–4 are em-dashes. The pointer goes in column 7.**

✅ **THE CHECK: after any migration, `by section` in `node Dashboards/build-data.mjs --dry` must show the live section DROP by exactly the number migrated and `closed` RISE by the same number, with the TOTAL UNCHANGED.** 🔴 **A total that goes UP after a migration is the signature of this bug** — the migration duplicated instead of moving.

### 🔴 THE BUILD CAN BE A NO-OP AND REPORT SUCCESS

`node Dashboards/build-data.mjs` once wrote a byte-identical file on every run for three days while printing `injected 596 rows into job-tracker.html`. Three sweeps each reported republishing a fresh dashboard. All three republished the same stale build.

**The cause:** the page carries a **tokenized copy of itself** in its `__TPL__` block so it can republish itself through the `artifact` capability. The template block sits *earlier* in the file than the real blocks, so a naive `indexOf` found the template's markers and injected each rebuild into the placeholder — which step 1 then re-tokenized straight back out. Round trip, same bytes, cheerful success line.

✅ **Fixed in `build-data.mjs` with two marker strategies:** `"last"` for DATA and OVERRIDES (the real blocks sit after the template), `"outer"` for the `__TPL__` block (FIRST open, LAST close — with `lastIndexOf` on both ends, each build wraps another layer on instead of replacing it, and the page grew from 634KB to 1,948KB in three runs).

✅ **THE TEST THAT PROVES IT — run the build three times and the hash must stop changing:**

```bash
node Dashboards/build-data.mjs && A=$(md5 -q Dashboards/job-tracker.html)
node Dashboards/build-data.mjs && B=$(md5 -q Dashboards/job-tracker.html)
node Dashboards/build-data.mjs && C=$(md5 -q Dashboards/job-tracker.html)
[ "$A" = "$B" ] && [ "$B" = "$C" ] && echo IDEMPOTENT
```

⚠️ **`git status` is the cheap version:** if `Dashboards/job-tracker.html` is not listed as modified after a sweep that added rows, the build did not run.

⚠️ **GENERALISE IT — three separate silent-corruption bugs in this toolchain shared one shape:** a step that reports success from its OWN intermediate state rather than from what landed. **Verify the artefact, never the log line.**

### 🔴 A NEW TABLE ONLY COUNTS IF ITS HEADING IS ONE THE SCRIPT MAPS

`build-data.mjs` matches tables to the nearest preceding heading and reports anything it couldn't place under **"skipped tables."** **Read that line every run.**

When appending a mined-leads block to `pipeline-leads.md`, make its heading an `###` under the existing `## Leads` heading — the script falls back to the `##` heading, so the rows land in the `lead` section. **An `##` heading of its own is silently skipped.** That mistake cost fifteen leads in the source repo before it was caught.

⚠️ **A table matched only on its parent `##` heading is skipped unless it carries one of `company / source / role / engagement`.** Narrative tables with headers like `Lead / What changed` were parsing as rows with every field null and being pushed to the board as empty tasks.

### 🔴 A DRAFT THAT DISAPPEARS HAS USUALLY BEEN **SENT**, NOT LOST

Sending consumes a draft and it vanishes from `list_drafts`. **Absence from the folder reads identically to "it never existed," and that ambiguity has sent one recruiter the same email twice.**

✅ **The check is one call and it is definitive: `get_draft` on the draft id.**

- **Still pending** → `labelIds: ["DRAFT"]`.
- 🔴 **Already sent** → `labelIds: ["SENT"]`, and the `messageId` has CHANGED, because the send consumed the draft and re-pointed the id at the sent message.

⚠️ **An empty `plaintextBody` in a draft listing does NOT mean the draft is empty.** One such "empty" draft went out as a full three-paragraph follow-up minutes later.

⚠️ **And if a duplicate has already been created, do NOT trash its thread.** A correctly-threaded reply sits on the recruiter's real thread, and trashing that destroys their original mail. **Empty the draft with `update_draft` first** — that moves it onto a thread of its own, leaving the real one untouched — **and only then is `trash_thread` safe.**

### 🔴 `search_threads` TRUNCATES ITS MESSAGE LIST, AND THE OMISSION LOOKS EXACTLY LIKE AN ABSENCE

**`search_threads` is for DISCOVERING threads. It is never for deciding what is in one.** It silently drops messages — both `SENT` ones and inbound ones — and a short result list looks identical to a truncated one.

Two real incidents from the source repo:

- A search returned five messages on a live thread; `get_thread` on the same id returned **seven**, and both hidden messages were sends — including a thank-you sent three hours earlier. The sweep was about to report it as still owed.
- A search run specifically to check for a rejection returned the thread, listed messages only up to the 18th, and **omitted four later ones including the rejection itself.** The sweep then reported that no rejection existed.

✅ **Every claim about a thread's contents goes through `get_thread`.** `METADATA_ONLY` is cheap and returns every message with `sender` and `labelIds`, which is all the `SENT` test needs.

🔴 **This applies hardest to NEGATIVE claims, which is where it actually bit.** Never report a row as unanswered, a draft as unsent, or a follow-up as owed without `get_thread` on that thread first. **A claim that nothing went out is still a claim.**

### ⚠️ A REPLY DOES NOT ALWAYS THREAD

On one day in the source repo, four replies went out and **two started new threads instead of threading onto the original.** A thread-only check would have called those two unanswered. **Test both:**

1. A message with the `SENT` label inside the thread itself, **or**
2. A message in `in:sent` addressed to that thread's sender — search `in:sent to:<address>` and compare against the inbound thread's date.

Either one counts as answered.

### ⚠️ SOME MAIL CLIENTS REWRITE A DRAFT WHEN THEY OPEN IT

If {{FIRST_NAME}} edits drafts in a third-party client (Spark, Airmail, and similar), **the client rewrites the draft under a new id and leaves the original behind after the send.** A draft sitting in the folder is then at least as likely to be the residue of a completed send as a task waiting to happen.

🔴 **Therefore: the Drafts folder is not a to-do list and must never be reported as one.** **Thread state is the truth; the folder is an artifact of an editing habit.**

⚠️ **The same clients strip `<p>` tags and flatten the body into one `<div>`, taking any inline margin with it.** That is why `Prompts/reply-tone.md` requires `<br><br>` between paragraphs rather than `<p>`.

### ⚠️ CONCURRENT SESSIONS FORK THE LEDGER, AND ONE COLLISION DESTROYED LIVE ROWS

Two Claude sessions writing this repo at once — a desktop session and a phone/cloud one — forked the git history twice in three days in the source repo. **One collision destroyed live ledger rows that had to be rebuilt from the published dashboard.**

✅ **The fix is the two-mode git rule in `../CLAUDE.md`:** the primary machine never commits automatically, and any cloud/mobile session commits to a dated branch and never to `main`.

🔴 **AND THE HARDER FINDING: a cloud sweep's file writes are only as real as its push.** A scheduled cloud run once did a full sweep, reported success, published a dashboard — and never pushed. **A cloud checkout is discarded when the session ends, so that run's ledger edits no longer exist anywhere.** What survived was everything that wasn't a file: Gmail labels, stars, archives, and the drafts it wrote.

### ⚠️ AN UNRUN SEARCH IS NOT A NEGATIVE RESULT

The source ledger once recorded that a repeat-check search "returned nothing." **That search was never run** — the company name had been folded into an unrelated multi-term query. **Run the repeat check as its own query, on the company name alone.**
