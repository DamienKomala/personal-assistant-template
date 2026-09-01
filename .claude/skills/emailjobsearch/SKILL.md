---
name: emailjobsearch
description: Mine recent Gmail for real job opportunities — recruiters, human referrals, application status, and leads buried in aggregator digests. Runs end to end in auto mode: applies role labels, stars real opportunities, archives confirmed rejections, drafts every reply worth writing, updates the ledger and Daily.md, and rebuilds the dashboard — all without stopping to ask. Replies stay draft-only; sends, deletes and unsubscribes still need confirmation.
---

# Email Job Search

An active job search generates roughly **20 job-related emails a day, of which about 3–5 per 200 are real.** This skill separates the real from the noise, drafts what should be answered, files the mail, and keeps the ledger current.

## Auto mode — run the whole thing, don't ask permission to finish

**When {{FIRST_NAME}} invokes `/emailjobsearch` manually, that invocation IS the approval for every step below.** Run start to finish and report what was done.

🔴 **Do not end a sweep with an offer to do work the skill was already allowed to do.**

Before auto mode existed in the source repo, sweeps routinely closed with *"want me to draft the redirect?"* or *"want the dashboard rebuilt?"* — **and the answer was yes essentially every time.** The asking was pure latency.

| Do this without asking | Step |
|---|---|
| **Draft the wrong-role redirects** rather than offering to | 4 |
| **Update `Daily.md`** in the same pass as the ledger | 8 |
| **Update `Context/job-sources.md`** with new senders, phrases and resolution tricks | 9 |
| **Rebuild and republish the dashboard** | 10 |
| **Push the ClickUp board** *(if configured)* | 11 |
| **Sync `Daily.md` to the ClickUp Daily list** *(if configured)* | 12 |

🔴 **AUTO MODE DOES NOT WIDEN THE WRITE BOUNDARY, AND THAT IS THE WHOLE POINT OF NAMING IT SEPARATELY.** **Never send, reply, forward, delete, or unsubscribe.** **Never auto-archive an ambiguous or cancelled-requisition closure** — those stay starred in the inbox. **Drafts remain drafts.** Auto mode removes the *asking* before things the skill could already do; **it adds no new capability.**

**A sweep still ends with a "Still needs you" list** — sends, unsubscribes, portal logins, deadlines. **That list is the output, not a menu of work you declined to do.**

## What this skill applies without asking

Four Gmail mutations happen during the sweep, unprompted. **All are recoverable — an archived thread stays searchable.**

- **`Career/*` role labels** on every real opportunity
- **A star** on anything needing {{FIRST_NAME}}'s attention
- **Archive** (remove `INBOX`) on confirmed rejections and mined-out aggregator digests
- **Archive answered recruiter threads** — see below

🔴 **Everything else stays gated. Never send, reply, forward, delete, or unsubscribe.** A past approval is not a standing one.

**Report every applied mutation in the output.** Auto-applied is not silent — {{FIRST_NAME}} has to be able to see what moved and undo it.

### Archive answered recruiter threads

**Once {{FIRST_NAME}} has replied, the thread leaves the inbox.** Labelling alone clears nothing — the label gets applied while the thread sits in Primary anyway, so the inbox keeps growing with conversations where the ball is already in the recruiter's court.

**The trigger is a SENT reply, not a draft.** An unsent draft means {{FIRST_NAME}} still has to act, so the thread stays visible.

🔴 **AND "SENT" IS SETTLED BY `get_thread`, NEVER BY `search_threads`.**

**`search_threads` truncates its message list silently, and it drops both `SENT` and inbound messages.** Two incidents from the source repo:

- A search showed five messages on a live thread and hid two sends, **one of them three hours old.** The sweep would have reported an already-sent thank-you as outstanding.
- A search run specifically to check for a rejection listed messages only up to the 18th and **omitted four later ones including the rejection itself.** The sweep then reported that no rejection existed.

✅ **`search_threads` IS FOR DISCOVERING THREADS, NEVER FOR DECIDING WHAT IS IN ONE.** `get_thread` with `METADATA_ONLY` is cheap and authoritative. 🔴 **An omission looks exactly like an absence, which is why this fails silently — and it bites hardest on long threads, i.e. the late-stage rows where being wrong is most expensive.**

**A reply does not always thread.** On one day in the source repo four replies went out and **two started new threads instead.** A thread-only check would have called those two unanswered. **Test both:**

1. A message with the `SENT` label inside the thread itself, **or**
2. A message in `in:sent` addressed to that thread's sender — `in:sent to:<address>`, compared against the inbound thread's date.

**Either one counts as answered.**

**A star does not block the archive.** Most recruiter threads worth replying to were starred by an earlier sweep *because* they needed a reply, so "starred and answered" is the normal combination. **Archiving a starred thread does not hide it** — it stays in Starred, stays labelled, stays searchable. **The inbox was never the tracking mechanism; the star, the label and the ledger are.**

**So: replied → archive, and leave the star exactly as it is.** 🔴 **Never unstar to tidy up.** Removing a star is {{FIRST_NAME}}'s. If a star has gone stale, say so in the output.

**Do NOT archive**, regardless of whether a reply exists:

- A **wrong-role pitch not yet answered** — those are reported for a redirect decision that is {{FIRST_NAME}}'s.
- Anything the sweep flagged **ambiguous or unclassified**.
- Anything where **only a draft exists.** A draft is not a reply.

## 🔴 Before writing any draft on a thread that already has one — check whether it was sent

**A fresh draft was once created four hours after {{FIRST_NAME}} had already sent the one it replaced. Nothing went out — it was caught — but it was one click from sending a recruiter the same email twice**, which is exactly what happened on an earlier occasion.

✅ **THE CHECK IS ONE CALL AND IT IS DEFINITIVE: `get_draft` on the draft id.**

- **Still pending** → `labelIds: ["DRAFT"]`.
- 🔴 **Already sent** → `labelIds: ["SENT"]`, and the `messageId` has **changed**, because the send consumed the draft and re-pointed the id at the sent message.

⚠️ **`list_drafts` IS NOT THAT CHECK AND WILL MISLEAD YOU.** A sent draft simply stops appearing there, **so its absence reads identically to "it never existed."** ✅ **Absence from `list_drafts` is a prompt to run `get_draft`, never a conclusion.**

⚠️ **`in:sent to:<address>` is the second confirmation** and worth running when the answer matters — it names the message, the timestamp and the thread.

🔴 **AND IF A DUPLICATE HAS ALREADY BEEN CREATED, DO NOT TRASH ITS THREAD.** A correctly-threaded reply sits on the recruiter's real thread, **and trashing that destroys their original mail.** ✅ **Empty the draft with `update_draft` first** — that moves it onto a thread of its own, leaving the real one untouched — **and only then is `trash_thread` safe.**

---

## Steps

### 1. Read context

`Data/me.md`, `Data/job-criteria.md`, `Context/job-sources.md`, `Context/business.md`, `Context/impact.md`, `Prompts/reply-tone.md`, `Context/mail.md`, and `Job Search/pipeline.md`.

🔴 **Read `pipeline.md` and ONLY `pipeline.md`.**

| File | Sweep behaviour |
|---|---|
| `Job Search/pipeline.md` | ✅ **Read it whole.** |
| `Job Search/pipeline-leads.md` | ⚠️ **Append only — do not read.** New digest finds go here at step 4. |
| `Job Search/pipeline-dossiers.md` | ⚠️ **Never read in a sweep.** Open one section only if a row's provenance is genuinely in question. |
| `Job Search/pipeline-archive.md` | ⚠️ **`grep` only, never read whole.** |

**Why this is a rule and not a preference:** in the source repo `pipeline.md` hit **292KB** and blew past the read cap, **so this step was silently impossible** and a sweep had to reconstruct the ledger from `grep` and `sed`. **Loading the leads table during an inbox sweep is what got it there.** ⚠️ **If `pipeline.md` starts approaching 200KB, split cells into the dossiers file before adding more.**

### 2. Search

🔴 **`in:anywhere` first — never `in:inbox` alone.** Last 14 days unless {{FIRST_NAME}} specifies otherwise: `in:anywhere newer_than:14d -in:draft`.

**A Gmail filter can auto-file job mail straight to a label so it never touches the inbox.** An inbox-only sweep in the source repo **missed four rejections and a live Workday request for action.** **Application status is the category most likely to be auto-filed.**

**Call `list_labels` to confirm current label IDs rather than assuming them.**

**Then run a second, explicit pass over unread inbox mail:** `in:inbox is:unread -in:draft`, **no date bound.** `in:anywhere` covers the inbox in principle, but only within the window and only for senders the taxonomy already knows about. **This pass is the one that most often surfaces a sender missing from `Context/job-sources.md`.**

🔴 **Job-related only.** Bucket and file a thread from this pass **only if it is job mail.** Anything else belongs to `/triage-inbox` — **leave it untouched, unlabelled, unstarred, unarchived, and don't mention it in the output.** **Two skills labelling the same thread is worse than one skill missing it.**

### 3. Classify every thread into exactly one bucket

Use `Context/job-sources.md` for the sender lookup and `Data/job-criteria.md` for the fit test. **Some senders can't be resolved by address alone** — a mailbox that sends both paid work and bulk digests must be classified by **content**.

| Bucket | Test |
|---|---|
| **Recruiter w/ JD** | Real sender, full job description (responsibilities + requirements + location), passes criteria |
| **Recruiter wrong-role** | Real sender, full JD, but hits a hard no-fit or fails the seniority floor |
| **Recruiter no JD** | Real sender, only an "are you interested?" teaser |
| **Human referral** | A person (not a service) forwarding a job link |
| **Application status** | Receipt, confirmation, or progress update on something already in flight |
| **Rejection** | Rejection language per `Context/job-sources.md` |
| **Aggregator digest** | Bulk sender from the Aggregator list |
| **Junk** | Junk-list sender, or career-styled mail with no job content |

🔴 **Anything that fits no bucket is reported as UNCLASSIFIED — never guessed at.**

### 4. Act per bucket

**Recruiter w/ JD** — `create_draft` (never send). Answer whatever the recruiter explicitly asked: availability, work authorization, portfolio links, start date. Pull real values from `Data/me.md` and `Context/business.md`.

**For compensation, identify the engagement tier FIRST** (full-time, W2 agency placement, or independent project) and follow `Data/job-criteria.md` § Compensation. **Tiers 1 and 2 may be quoted as a range. Tier 3 project rates are NEVER drafted** — surface those for {{FIRST_NAME}} to scope. **If the engagement type is unclear, quote nothing and say why.**

Voice comes from `Prompts/reply-tone.md`, **not `Prompts/soul.md`.**

🔴 **NO SIGNATURE.** End the body at the sign-off line and stop. **The reason is mechanical, not stylistic: the Gmail connector strips every `<img>` on save**, so an appended signature is always image-less and arrives as empty `<a></a>` shells beside a dangling border. **{{FIRST_NAME}}'s signature is installed in the client and added at send time** — see `Data/signature.md`. **Appending a broken one would just give him/her something to delete first.**

**Recruiter wrong-role** — ✅ **In auto mode, DRAFT the redirect; don't offer to.** A short note that declines on role specifically, names the target titles plus the adjacent ones from `Data/job-criteria.md`, states the location rule, links portfolio/resume/impact profile, and asks what work in {{FIRST_NAME}}'s discipline is on their desk. **Quote no rate unless they asked** — a redirect that volunteers a number answers a question nobody put.

⚠️ **One judgment call survives, and it is not "should I ask": it is whether this desk carries that work at all.** **Draft it** when the firm plausibly has relevant reqs on another desk (evidence: a past posting, an alert, a second recruiter from the same firm). **Skip it and just label off-criteria** when the firm demonstrably has none — a design redirect to a pure engineering-staffing shop is **a letter to an empty room.** **Say which call you made and why.**

⚠️ **Drafting a redirect does NOT make the thread archivable.**

**Recruiter no JD** — report as "recruiter contact, no JD." No draft.

**Human referral** — extract the job URL from the body, fetch it, assess fit against `Data/job-criteria.md`, report a one-line verdict. 🔴 **Never draft an automated reply to a friend or family member.** {{FIRST_NAME}} answers those personally.

**Application status** — write a new `Job Search/pipeline.md` row or a stage update on an existing one. **Relay receipts often carry company, role, location and comp band — use them.**

**Rejection** — apply the `Jobs` label, remove `INBOX`, and write a `Closed` row.

🔴 **Archive only on a verbatim rejection phrase found in the message BODY.** The list and the load-bearing test are in `Context/job-sources.md`. **Subject lines don't count and neither does inference.** **This is the one auto-applied step that can hide something {{FIRST_NAME}} needed to see** — in the source repo a Workday digest headed *"Follow up on Req-48986"* was a rejection, and the identical wrapper carries live requests for action.

⚠️ **If the body is ambiguous, borderline, or you're reading the outcome off the wrapper rather than the text — don't archive.** **Label it, star it, report it.** **Cancelled and paused requisitions are NOT rejections** — see the four non-rejection shapes in `job-sources.md`.

**Aggregator digest** — read it, extract only postings matching the target titles, **append them to `Job Search/pipeline-leads.md`**, then archive the digest. **If a digest yields nothing, say so in one line** rather than listing what it contained. ⚠️ **Never archive a real status report from an aggregator's domain** — some of those senders mix digests and genuine application status.

**Junk** — propose unsubscribe. 🔴 **Never auto-unsubscribe.**

### 5. Apply the role label

Assign every real opportunity **exactly one** `Career/*` label from the taxonomy in `Data/job-criteria.md`.

🔴 **Resolve IDs with `list_labels` every run and use the resolved ID, never a recorded one.** A stale ID applied automatically **files a thread somewhere nobody will look for it.**

**One role label per thread.** If two fit equally, apply the one matching what the JD *leads* with **and say in the output it was a close call.** **Aggregator digests and junk get no role label.** Group applied labels by label in the output.

### 6. Star what needs {{FIRST_NAME}}

Apply `STARRED` to threads he/she must act on personally, **and only those** — a star that appears on everything stops meaning anything.

**Starred:** recruiter w/ JD that passes criteria · **any Right to Represent, always, regardless of how the role scores** · human referrals · application status that asks for an action (a portal task, a scheduling request, a form) · anything unclassified or flagged ambiguous.

**Not starred:** rejections · digests · junk · wrong-role pitches · passive status receipts.

🔴 **A STAR MEANS "ACT ON THIS OPPORTUNITY", NOT "NOTE THIS ANOMALY."** In the source repo a sweep starred an application receipt because its *arrival* was significant — it proved a cancelled bot was still submitting — not because the row needed anything. **The star was removed.** ✅ **The significance of an anomaly belongs in the ledger, in `Daily.md`, and in the sweep output — never in a star.**

**Removing a star is {{FIRST_NAME}}'s. Don't unstar anything on a later run.**

### 7. Update the pipeline

Write new and updated rows to `Job Search/pipeline.md` directly. **Use the Gmail thread id in the `Thread` column** so later runs can re-open the source without searching. **Don't duplicate a row that already exists; update it.**

**Write each row to the file that owns it:**

- **Live conversations, applications, status changes** → `pipeline.md`
- **New leads mined from digests** → **append to `pipeline-leads.md`**, under an `###` heading beneath the existing `## Leads` heading
- **Anything you close** → ✅ **move the full row into `pipeline-archive.md`** and leave a one-line stub in `pipeline.md` with **the pointer in the `Next action` column** — see the canonical shape in `pipeline.md` § Notes. 🔴 **Do not strike a row through and leave it in the live table.**
- **The sweep's own narrative** → **`pipeline-archive.md`**, under *Sweep narrative — newest first*. **Keep only a short "Last swept" summary at the top of `pipeline.md`.** In the source repo that narrative reached 66KB — 23% of the file — and **nothing reads it during a sweep.**

⚠️ **After a migration, `node Dashboards/build-data.mjs --dry` must show the live section DROP by exactly the number migrated and `closed` RISE by the same number, with the TOTAL UNCHANGED.** **A total that goes UP after a migration means the migration duplicated instead of moving** — the stub's pointer is in the wrong column.

**Check for a repeat application with a Gmail search: `in:anywhere "<company>"`.** Run it **as its own query, on the company name alone** — a name folded into a multi-term query is a search that was never run. **Repeats are the norm**: in the source repo one company reached ten applications, another five, and a third produced three separate requisitions with three separate endings. **Say so in the row when you find one** — a second application to a company that already rejected {{FIRST_NAME}} is a fact he/she needs *before* a recruiter surfaces it.

**Keep the ledger and `Daily.md` in sync:** anything that changes a stage, a send, or a re-check date belongs in both.

### 8. Update `Daily.md` — auto mode, no asking

Add a `## 📬 Sweep — <date>` block at the top of the sweep sections, move the `→ **NEWEST**` marker onto it, and demote the previous block's marker.

**`Daily.md` answers "what do I do today"; the ledger holds the state behind it.** A sweep that updates one and not the other produces a to-do list that is quietly wrong — **worse than one that is empty.**

**Follow the file's own rules: a checkbox means {{FIRST_NAME}} can finish it.** Findings, confirmations, patterns and "do NOT" constraints are **plain bullets** — **a checkbox on a fact is a box that never gets ticked.**

**Prune while you are in there:** anything sitting untouched for two weeks wasn't real, **and a to-do list nobody prunes is a guilt generator.**

🔴 **IF THE CLICKUP `Daily` SYNC IS CONFIGURED: carry the `<!--cu:xxxxxxxx-->` anchor forward whenever you rewrite a checkbox.** It renders as nothing and **it is that item's identity on the board** — the thing that lets a tick on a phone come back to the right line. **Rewording a carried-forward item is safe as long as the anchor rides along with the text.** Drop it and the item re-syncs as a NEW task while the old one is reported as an orphan. ✅ **New checkboxes need no anchor** — step 12 stamps them. **Never invent one, never copy one from another item, never put one on a plain bullet.**

### 9. Update `Context/job-sources.md` — auto mode, no asking

**The sender taxonomy is what makes the NEXT sweep cheap, and a finding left only in a narrative block has to be rediscovered.**

Write back: **a new sender** (which bucket and the tell that decides it) · **a new rejection phrase** (added **only after** it archived on the load-bearing test) · **a new resolution trick** (a tenant slug, a footer link, a job-id pairing) · **a corrected assumption** — **mark the old text superseded rather than deleting it**, so the reasoning stays auditable.

### 10. Rebuild the dashboard — auto mode, no asking

```bash
node Dashboards/build-data.mjs
```

Then republish `Dashboards/job-tracker.html` to **its existing Artifact URL** so the link {{FIRST_NAME}} already has keeps working. 🔴 **Same file path = same URL**; a different path mints a new one and orphans the old.

⚠️ **Verify before publishing: the row total must be the same or higher than the previous run.** A drop means a file stopped parsing.

⚠️ **Read the *"skipped tables"* line every run.** A new table only counts if its heading is one the script maps. **An `##` heading of its own is silently skipped** — that cost fifteen leads once.

⚠️ **The build's own row count is NOT evidence it wrote anything.** In the source repo it printed `injected 596 rows` for three days while writing a byte-identical file.

```bash
md5 -q Dashboards/job-tracker.html && node Dashboards/build-data.mjs && md5 -q Dashboards/job-tracker.html
# the two hashes MUST differ whenever the ledger changed
```

**`git status` is the cheap version: if `job-tracker.html` is not listed as modified after a sweep that added rows, the build did not run.**

⚠️ **Verify the STAGE HISTOGRAM, not just the total.** A block of `Unrecorded` means a table is column-shifted. **Row counts do not detect that; the histogram does.**

### 11. Push the ClickUp board — auto mode, no asking *(skip if not configured)*

```bash
node Tools/clickup-sync.mjs --push
```

It re-reads the same ledger files through **the same parser the dashboard uses** (`Dashboards/lib/ledger.mjs` — 🔴 **one parser, never a second one**) and upserts every row.

🔴 **The board is a projection, exactly like the dashboard. `pipeline.md` stays the source of truth** — on any conflict the ledger wins and the board is stale.

⚠️ **It refuses to run and tells you why in three cases, and each is a real ledger bug worth fixing rather than working around:** a malformed table row (pipe counts disagree with the separator) · a stage outside the canonical enum (the `Stage` cell holds narrative) · a missing ClickUp status (statuses are UI-only; the API cannot create them).

✅ **Unchanged rows cost zero API calls**, so a normal sweep touches 10–30 tasks. **Report what it created and updated** alongside the dashboard line.

⚠️ **If the board is not set up yet, skip this step silently.** Nothing else depends on it.

### 12. Sync `Daily.md` to the ClickUp Daily list — auto mode, no asking *(skip if not configured)*

```bash
node Tools/daily-sync.mjs --pull      # take the ticks FIRST, so the file is current
node Tools/daily-sync.mjs --push      # then send what this sweep just added
```

**That order matters.** `--pull` ticks any box {{FIRST_NAME}} closed away from the machine; running it first means the push report reflects reality rather than re-reporting finished work. **Either order is safe** — the merge is monotonic — **but this one is honest.**

🔴 **This is a DIFFERENT tool from step 11 and they must not be confused.** `clickup-sync.mjs` projects the **ledger** and its `--pull` never writes markdown. `daily-sync.mjs` owns **`Daily.md`** and its `--pull` writes exactly one character per changed line: `[ ]` → `[x]`.

✅ **Report two things:** how many boxes `--pull` ticked (**that is work already finished — the sweep should not re-ask for it**), and any **orphan** count from `--push` (a rewritten line that lost its anchor).

### 13. Flag ambiguity rather than resolving it

JD present but location unclear · borderline rejection wording · duplicate threads from the same recruiter · a sender that fits no bucket · two role labels that fit equally.

🔴 **{{FIRST_NAME}}'s judgment, not a guess.** ⚠️ **Auto mode does not change this.** Running unattended means not asking permission to do the work; **it does not mean guessing at facts.** **A flagged ambiguity is a finished output, not an unfinished one.**

---

## Output

- **Real opportunities** — recruiter, company, role, location, fit note. **The ones that matter, first.**
- **Needs a decision** — wrong-role pitches worth a redirect, human referrals, anything unclassified or ambiguous.
- **Drafted** — company, role, what each draft covers. **Note that drafts are saved to Gmail Drafts, never sent.**
- **Pipeline updates** — rows added or moved, and any `Daily.md` change that follows.
- **Applied** — everything changed in Gmail, so it can be undone:
  - Role labels, grouped by `Career/*` label
  - Threads starred
  - Threads archived, split into **rejections**, **digests**, and **answered recruiter threads**, each with the sender named
- **Not archived, needs your call** — rejections too ambiguous to auto-archive, plus cancelled or paused requisitions. Labelled and starred, still in the inbox.
- **Still needs you** — drafts waiting to be sent, unsubscribes, portal logins, ATS security codes, deadlines. 🔴 **This is a list of things only {{FIRST_NAME}} can do, not a list of things the sweep declined to do.**

**End with the state, not a menu.** In auto mode the sweep has already drafted the redirects, written both files, refreshed `job-sources.md`, rebuilt the dashboard and pushed the board — **so say so plainly and stop.**

🔴 **Do not close by offering work already inside the skill's remit.** *"Want me to draft the redirect?"* and *"Want the dashboard rebuilt?"* are not valid endings — **the answer was yes every time, which is why they are now steps 4 and 10.**

✅ **A closing question is still right when it is genuinely {{FIRST_NAME}}'s** — whether to revert an applied mutation, which unsubscribes to action, whether a draft needs an edit before sending. **Those are decisions, not tasks.** Ask them; just don't pad them with work you should have finished.
