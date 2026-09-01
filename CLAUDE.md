# CLAUDE.md

Instructions for Claude Code working in this repo. **This is a personal job-search assistant, driven entirely by the reference files below.**

🔴 **FIRST RUN? Read [SETUP.md](SETUP.md) before doing anything else.** This is a template — every `{{PLACEHOLDER}}` needs filling in, and several skills will behave badly against a half-configured profile.

**Markdown is the substrate; `Dashboards/` and `Tools/` are the exceptions.** Everything that holds state or instructions is markdown. `Dashboards/` holds a published Artifact (HTML) and its build script; `Tools/` holds executables that do things markdown cannot. 🔴 **Both are *views* or *actuators* over the markdown, never a source of truth. If the dashboard, the ClickUp board and `Job Search/pipeline.md` disagree, the ledger is right and the other two are stale.**

---

## Personality

Read [Prompts/soul.md](Prompts/soul.md) and follow it — **it governs how Claude talks to {{FIRST_NAME}} directly** (tone, opinions, brevity, humor).

🔴 **This is distinct from [Prompts/reply-tone.md](Prompts/reply-tone.md), which governs the voice of DRAFTED EMAIL sent on {{FIRST_NAME}}'s behalf.** That stays professional and accommodating for recipients regardless of how Claude talks to {{FIRST_NAME}}. **Don't bleed the soul.md voice into drafted external content.**

### The line-editing ladder — three rungs, in this order

🔴 **`reply-tone.md` → `writing-clearly-and-concisely` → `grammar-check`.**

**Tone decides what the message concedes and how warm it sounds. Strunk decides whether the sentences earn their length. Grammar-check decides only whether they are CORRECT** — agreement, tense, punctuation, modifier placement, vague pronouns.

✅ **Grammar-check earns its place because Strunk does not do this job:** a comma splice in a tight sentence passes the concision test and is still wrong.

⚠️ **Run grammar-check for MECHANICAL FIXES ONLY.** Its own steps flag "passive voice overuse" and "tone consistency," **so it WILL volunteer opinions about voice that belong to the two rungs above it.** **Take its grammar findings; discard its phrasing and tone suggestions.** ⚠️ **Redirect and negotiation emails depend on specific softeners doing specific work — a checker that "improves" one has broken the message, not fixed it.**

⚠️ **Give grammar-check the real `$OBJECTIVE`** *(e.g. "decline on role and ask to be routed to their design desk")* — **a checker that does not know the goal flattens prose toward generic business English.**

⚠️ **Strunk costs ~12K tokens on invoke; grammar-check is a fraction of that.** **Fire Strunk when editing real outgoing prose, not for commit messages or notes to {{FIRST_NAME}}.**

---

## Start here

- **[Daily.md](Daily.md) — the working to-do list. Read it first every session and offer to update it before finishing.** It holds "what {{FIRST_NAME}} does today"; `Job Search/pipeline.md` holds the state behind it. 🔴 **Keep them in sync: anything that changes a stage, a send, or a re-check date belongs in both.**
  - **If ClickUp is configured it is TWO-WAY:** tasks are **WRITTEN** here, **TICKED OFF** in the ClickUp `Daily` list on a phone, and the tick comes back via `node Tools/daily-sync.mjs --pull`. **`/daily` is the skill; a normal day is `--pull` then `--push`.**
  - 🔴 **Every synced checkbox carries an invisible `<!--cu:xxxxxxxx-->` anchor at the end of its `- [ ]` line, and THAT ANCHOR IS THE ITEM'S IDENTITY.** ⚠️ **When a sweep rewrites a carried-forward item, carry its anchor forward with the text.** Drop it and the item re-syncs as a NEW task while the old one is reported as an orphan — nothing is lost, but the board fills with duplicates of the same job. ✅ **A content hash could not do this job:** sweeps reword these lines daily (*"fifth day carried"* → *"sixth day carried"*), and a tick coming back would then land on the wrong line or nowhere.
  - 🔴 **`daily-sync.mjs --pull` IS THE ONE `--pull` IN THIS REPO THAT WRITES MARKDOWN, AND THE EXCEPTION IS DELIBERATE.** `clickup-sync.mjs --pull` never writes markdown because it projects the **LEDGER**, a source of truth a board must not edit. **`Daily.md` holds no state anything else reads, so the loop is safe HERE AND NOWHERE ELSE.** ✅ **Even then it writes ONE CHARACTER per changed line — `[ ]` → `[x]`.** ✅ **The merge is MONOTONIC both ways**, so the two sides can never fight.
- **[Job Search/pipeline.md](Job%20Search/pipeline.md)** — **the ledger, and the sole source of truth for the job skills.** Nothing else tracks state. **Read its `## Notes` section once before doing any ledger work** — it holds every silent-failure mode this toolchain has produced.
- **[Dashboards/job-tracker.html](Dashboards/job-tracker.html)** — published Artifact reading the ledger. 🔴 **It is a SNAPSHOT, not a live view:** run `node Dashboards/build-data.mjs`, then **republish the same file path** to keep the existing URL. ✅ `/emailjobsearch` does both at the end of every sweep, so it should not drift between sweeps — **but it is still a build step, and anything that edits the ledger outside a sweep leaves it stale until the next one.**
- **[Tools/README.md](Tools/README.md)** — one-time setup for the ClickUp board and the Gmail draft-delete tool, plus what each guardrail is defending against.
- **[README.md](README.md)** — repo structure, and the global installs needed on a new Mac.

---

## The ledger — four files, one ledger

🔴 **Nothing else tracks state.**

| File | What's in it | Sweep behaviour |
|---|---|---|
| **`Job Search/pipeline.md`** | Active conversations, live applications, gig/contract, notes | ✅ **Read it whole, every sweep.** The only one a sweep needs by default. |
| **`Job Search/pipeline-dossiers.md`** | Long-form history behind live rows | ⚠️ **A sweep never reads it.** Open one section when a row's provenance matters. **Holds no tables and is deliberately not parsed.** 🔴 **On any conflict `pipeline.md` wins.** |
| **`Job Search/pipeline-leads.md`** | The un-worked backlog | ⚠️ **A sweep APPENDS and does not read.** `/job-search` is the one skill that must read it. |
| **`Job Search/pipeline-archive.md`** | Every closed row and every sweep narrative | ⚠️ **Never read whole — `grep` it.** |

### 🔴 Why the split exists, and the rule that keeps it from recurring

In the source repo `pipeline.md` twice climbed past **292KB** and blew the read cap — **at which point the step that says "read the ledger" was silently impossible.**

**Both times the weight was NARRATIVE PACKED INSIDE LIVE TABLE CELLS, not dead rows.** One cell reached **29.9KB — eleven percent of the file.** Migrating ten closed rows freed 8KB; extracting the dossiers freed 115KB.

✅ **So: `Next action` answers "what happens next", not "what happened".** **When a cell passes ~1,200 characters, move the history to the dossier file and leave a link.**

⚠️ **Sweeps append to a cell and never delete — that is how a 29KB cell happens.** **Append the new state, then move the old state out in the same pass.**

⚠️ **The failure has two shapes and only one is visible when you sort by size:** once a single 29.9KB cell; once twenty-five merely-large ones with a 4.4KB maximum. **Sum the cells over 1,200 characters.**

⚠️ **Closing silent rows does NOT fix size and it will be the first thing you try.** Dead rows are the lean ones — 26 closures moved the file by about 200 bytes. **Closing rows is for accuracy; splitting cells is for size.**

### 🔴 Before publishing the dashboard, run the column validator and read the stage histogram

**The row-count check does not catch a malformed row.** A sweep once inserted rows between a table header and its `|---|` separator; **every row below parsed with columns shifted by one, 112 landed under a stage of `Unrecorded`, and the row TOTAL WENT UP** — so the same-or-higher rule passed on a corrupt table.

**The validator (pipe count per row vs its separator) and the `by stage:` line are the checks that actually work. Both are in `Job Search/pipeline.md` § Notes.**

⚠️ **Never put a raw `|` in a cell. `\|` IS the right escape** — `splitRow` in `Dashboards/lib/ledger.mjs` honours a backslash. 🔴 **`&#124;` is the one that misbehaves:** nothing in the pipeline decodes HTML entities, so it survives as literal text and reaches the dashboard and the board that way. **`/` is fine when a slash reads naturally.**

✅ **Closing a row means MOVING it.** Migrate the full row to `pipeline-archive.md` — **with its own table header and separator** — and leave a one-line stub in `pipeline.md` **with the pointer in the `Next action` column.**

**Checking whether a company is a repeat is a Gmail search, not a spreadsheet lookup** — `in:anywhere "<company>"`, **run as its own query on the company name alone.** **Repeats are the norm.**

---

## Skills (`.claude/skills/`)

**Job search — five skills over one ledger:**

- **`/emailjobsearch`** — sort job mail into eight buckets, draft replies, update the ledger. 🤖 **AUTO MODE: invoking it manually IS the approval.** It runs start to finish — drafts the wrong-role redirects, writes `Daily.md` and `Context/job-sources.md`, rebuilds the dashboard, pushes the board — **and reports what it did.** 🔴 **Auto mode widens NOTHING:** sends, replies, forwards, deletes and unsubscribes stay gated, ambiguous and cancelled-req closures stay starred in the inbox, and drafts stay drafts. **A sweep still ends with a "Still needs you" list — that list is things only {{FIRST_NAME}} can do, not things the sweep skipped.**
- **`/emailreply`** — draft a reply to ONE email, or sweep for threads awaiting one. **Drafting only.** The fast path carved out of `/emailjobsearch` so answering two emails doesn't cost a full sweep. 🔴 **Its only Gmail write is `create_draft`** — no stars, no labels, no archiving, no ledger writes. **`/emailjobsearch` keeps ownership of all filing, so the two never file the same thread twice.**
- **`/job-pipeline`** — track stages, surface applications gone quiet, draft follow-ups. Draft-only.
- **`/tailor-application`** — tailor resume and cover letter to a specific role. **Never invents experience.**
- **`/job-search`** — search job boards, excluding anything already in the pipeline or inbox. **Search-only.**

**General:**

- **`/triage-inbox`** — categorize the non-job inbox, draft replies. Draft-only. 🔴 **Does not touch job mail.**
- **`/manage-calendar`** — review calendar, propose events and reschedules. **Proposal-only.**

**ClickUp — optional, skip both if the board isn't set up:**

- **`/board`** — push the ledger to ClickUp, or pull a divergence report. **Projection only: `--pull` REPORTS and never writes markdown.** ✅ **Run `--dry` first** — no token, no network call, and it refuses on a malformed table row, a stage outside the enum, or a missing ClickUp status. **All three are real ledger bugs; fix the ledger rather than working around the check.**
- **`/daily`** — sync `Daily.md` checkboxes to the ClickUp `Daily` list and pull the ticks back. 🔴 **Do not confuse it with `/board`** — that one projects the ledger and never writes markdown; **this one owns `Daily.md` and writes exactly the checkbox character.** **Separate maps, disjoint task sets.**

### Job-search gotchas — learned from live runs, each cost something

- 🔴 **Search `in:anywhere`, never `in:inbox`.** A Gmail filter can auto-file job mail straight to a label. An inbox-only sweep once **missed four rejections and a live request for action on an open application.** **Application status is the category most likely to be auto-filed.**
- 🔴 **`search_threads` FINDS threads. It never decides what is IN one.** It truncates its message list silently and drops both `SENT` and inbound messages. **Every claim about a thread's contents goes through `get_thread`** — and this bites hardest on **negative** claims, which are the easiest to make carelessly.
- 🔴 **A draft that disappears from `list_drafts` has usually been SENT, not lost.** Its absence reads identically to "it never existed" — **that ambiguity sent one recruiter the same email twice.** ✅ **`get_draft` on the id is the definitive check.**
- ⚠️ **A sender that can't be bucketed by address must be classified by CONTENT.** Some mailboxes send both real paid work and bulk digests.
- ⚠️ **{{FIRST_NAME}} often answers real recruiters personally, and fast.** **Check for an existing `SENT` message before drafting.**

---

## Guardrails

### 🔴 Git is two-mode, and the mode depends on where the session is running

**Decide the mode first — the test is the working directory and platform, both in the environment block.**

| Where | Test | Git behaviour |
|---|---|---|
| 🖥️ **The primary machine** | working dir is this repo **and** platform is the owner's own machine | 🔴 **NO GIT WRITES AT ALL.** Make the file edits, leave them in the working tree, report what changed. **{{FIRST_NAME}} commits.** |
| 📱 **Mobile / cloud** | anything else — a cloned checkout on another host | ✅ **Commit to a DATED BRANCH and push the branch.** 🔴 **NEVER `main`.** |

- 📱 **The mobile procedure, in full:** `git fetch origin`, branch from **`origin/main`** so it starts current, name it **`mobile/YYYY-MM-DD`** *(add `-2`, `-3` if the day already has one)*, commit there, `git push -u origin <branch>`. **End the session by stating the branch name** — it is the only way {{FIRST_NAME}} finds the work. 🔴 **Never push `main`, never merge into `main`, never rebase `main`, never force-push anything.** **Merging is done at a real keyboard.**
- ⚠️ **Why mobile gets an exception at all: a cloud session has no filesystem that survives it.** **Git is not tidiness there, it is the only persistence.** Without it a mobile sweep's `pipeline.md` and `Daily.md` writes evaporate when the session ends.
  - 🔴 **AND IT HAS FAILED SILENTLY.** A scheduled cloud run once did a full sweep, reported success, published a dashboard — **and skipped the push.** **A cloud checkout is discarded when the session ends, so that run's ledger edits no longer exist anywhere.** ✅ **The only reliable tell is comparing `origin/main` against the run's claimed output.**
  - ✅ **Note what does NOT need git and therefore survives regardless — Gmail drafts, labels, stars and archives, and an Artifact republish.** **So a mobile sweep is still worth running even if the branch is never merged.**
- 🔴 **Why the primary machine gets none: concurrent sessions forked the history twice in three days.** One collision **destroyed live ledger rows** that had to be rebuilt from the published dashboard; the second left the branches diverged 21 commits against 3 and the push rejected. ✅ **The cause was benign — the owner was testing a mobile app against the same repo — and the branch rule removes the collision permanently** rather than relying on the two sides not overlapping.
- ✅ **Reading git is always fine, in either mode** — `git log`, `git status`, `git diff`, `git show`, `git grep`. **The boundary is writing.**
- ✅ **Neither mode covers the dashboard.** `node Dashboards/build-data.mjs` and republishing the Artifact are not git; the Artifact URL is versioned independently of the repo.
- ⚠️ **An explicit request always wins.** If {{FIRST_NAME}} says "commit this" or "push it" in the moment, do it — on either machine. **The rule removes the reflex, not the capability.**

### Write boundaries

- 🔴 **No credentials in this repo, ever.** See `.gitignore`. Tokens live in `~/.config/`.
- 🔴 **Drafting is the default for every skill, and sending is not technically possible from here.** The Gmail connector has **no send tool**. **Never present a draft as sent.**
- 🔴 **Every delete, archive, unsubscribe, calendar write, and file-share still needs explicit confirmation** — **with one documented exception**, below.
- ✅ **Carve-out: `/emailjobsearch` applies labels, stars, and archives without asking.** **A deliberate exception, scoped to that one skill and to exactly four mutations:** `Career/*` role labels · `STARRED` · removing `INBOX` from **confirmed rejections and already-mined digests** · removing `INBOX` from **recruiter threads already replied to**.
  - **All are recoverable — an archived thread stays searchable.**
  - 🔴 **Auto-archive fires only on a verbatim rejection phrase in the message BODY.** Ambiguous wording gets labelled, starred, and reported instead.
  - 🔴 **The replied-recruiter archive requires a genuinely SENT reply — a draft is not a reply** — and never fires on an unanswered RTR or an unanswered wrong-role pitch.
  - 🔴 **The exception does NOT extend to sends, replies, forwards, deletes, or unsubscribes in any skill, and it does NOT extend to `/triage-inbox`.**
  - **Every applied mutation is listed in the skill's output so it can be undone.**
- 🔴 **Never auto-unsubscribe.** There's no tool for it anyway — **propose candidates.**
- **Where the write boundary sits for the job skills:** **local file edits apply directly** — the ledger and tailored material are git-tracked or disposable, so they're revertible. **Every Gmail mutation needs confirmation first**, except the carve-out above.

### The Gmail connector cannot delete a draft

⚠️ **There is no `delete_draft` tool, and the Drafts folder is not a to-do list.**

- **`apply_sensitive_message_label` needs a MESSAGE id**, and the connector never exposes one for a draft: `list_drafts` returns only a draft id, `search_threads` returns empty for `in:draft`, and `get_thread` omits drafts from the thread. **Passing a draft id to the trash tool fails safely with `Invalid id value`** — it does not hit the wrong message.
- 🔴 **Never trash the draft's THREAD as a substitute — with one proven exception.** **A stale draft usually sits on a thread carrying real correspondence**, and trashing it destroys the other party's original mail. ✅ **THE EXCEPTION: when the thread contains NOTHING BUT THE DRAFT**, `trash_thread` deletes it and destroys nothing else. 🔴 **It still needs {{FIRST_NAME}}'s say-so in the moment**, and it is a trash rather than a purge (recoverable 30 days). ⚠️ **Verify "draft-only" with `list_drafts`** — it returns each draft's `threadId`. `get_thread` returns a permission error on such a thread, so read access is neither required nor evidence.
- ⚠️ **Orphan threads arise because `update_draft` has no reply-to parameter and rewriting a threaded draft moves it to a new thread.** **That is a defect, not a technique — never create one to gain a delete path.**
- ✅ **The gap is closed OUTSIDE the connector: [`Tools/gmail_drafts.py`](Tools/gmail_drafts.py) hits the Gmail API directly and deletes a draft only when it can prove a matching message already went out on the same thread.** **Dry run by default; `--delete` required.** 🔴 **It is BIASED TOWARD KEEPING and proved it** — it refused three drafts a sweep was confident about, scoring them 39–62% against their supposed sends. 🔴 **This does not make deleting drafts an automatic step in any skill.**

Full procedure: **[Job Search/draft-audit.md](Job%20Search/draft-audit.md)**.

### Outgoing mail

- 🔴 **NO SIGNATURE ON DRAFTS.** **The Gmail connector strips EVERY `<img>` on save** — proven in one controlled test with a remote `src`, a `cid:` attachment and a `data:` URI all sent together, **all three gone.** So a drafted signature is always image-less and arrives as empty `<a></a>` shells beside a dangling border. ✅ **{{FIRST_NAME}}'s signature is installed in the mail client and added at send time.** **Both `/emailjobsearch` and `/emailreply` draft without one, and they agree.** Canonical markup: [Data/signature.html](Data/signature.html); reasoning: [Data/signature.md](Data/signature.md).
- 🔴 **Resume and impact profile go as NAMED HYPERLINKS, not attachments.** No available tool can attach a local file, and base64 inline costs **~63K tokens for the pair on every single email** — which is why links won. **If a recruiter insists on real files, {{FIRST_NAME}} attaches them by hand** from `{{ASSETS_DIR}}/Resumes/`. 🔴 **Never write "attached" unless a file is genuinely attached.**
- ⚠️ **`update_draft` re-wraps every URL into a `google.com/url?q=` redirect on every save** — so a body read back out already carries wrappers, and feeding it back in **double-wraps them into a shape enterprise mail filters treat as phishing.** **Strip the wrappers; the connector will add one.** Full detail in `Prompts/reply-tone.md`.

### Resume artifacts live outside this repo

In `{{ASSETS_DIR}}/Resumes/` and `{{ASSETS_DIR}}/Cover Letters/`. **This repo is configuration, not artifacts.**

- ✅ **`.docx` and `.pdf` are readable and writable** via the globally installed `docx` and `pdf` skills.
- 🔴 **Regenerate the exports in the same pass as the source edit.** A source change with stale exports beside it is a **bug**, not a fact of life. **`/tailor-application` delivers `.md` plus `.docx` and `.pdf` together.**
- ⚠️ **Extracting text from a PDF needs `uv run --with pdfplumber`** unless `pdftotext` or `pypdf` is installed system-wide.
- ⚠️ **Don't keep `.txt` copies as a parallel source of truth.** In the source repo two archived ones were read as current nine days after the live PDF gained a new role.

---

## Reference files

| File | What it holds |
|---|---|
| [Data/me.md](Data/me.md) | Personal and work profile — **the fact base for anything a recruiter reads** |
| [Data/job-criteria.md](Data/job-criteria.md) | Target titles, location rules, hard no-fits, employer exclusions, seniority floor, three compensation tiers, the role taxonomy. **Edit this to retune every job skill at once.** |
| [Data/social.md](Data/social.md) | Portfolio and professional links, plus the links-not-attachments rule |
| [Data/signature.html](Data/signature.html) · [signature.md](Data/signature.md) | The signature markup, and why it is installed rather than appended |
| [Data/calendar-preferences.md](Data/calendar-preferences.md) | Scheduling preferences |
| [Context/job-sources.md](Context/job-sources.md) | **The sender taxonomy** — real / aggregator / junk / fraud, the rejection-language test, ATS resolution tricks |
| [Context/triage-rules.md](Context/triage-rules.md) | Non-job email triage categories and policy |
| [Context/mail.md](Context/mail.md) | Sent-mail samples the voice guide is derived from |
| [Context/business.md](Context/business.md) · [impact.md](Context/impact.md) | Value proposition, and the proof points `/tailor-application` may draw on |
| [Prompts/soul.md](Prompts/soul.md) | How Claude talks to {{FIRST_NAME}} |
| [Prompts/reply-tone.md](Prompts/reply-tone.md) | How {{FIRST_NAME}}'s drafted email sounds to recipients |
| [Job Search/draft-audit.md](Job%20Search/draft-audit.md) | The draft delete procedure and the two evidentiary corrections behind it |

🔴 **Never quote one compensation tier's number for another tier's work, and never draft a tier-3 project rate.** **Role labels are categorization only — stage lives in the ledger.**
