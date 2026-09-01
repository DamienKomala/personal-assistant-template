---
name: emailreply
description: Draft a reply to one specific email, or sweep the mailbox for threads that are waiting on a reply and draft them all. Focused subset of /emailjobsearch — drafting only. No signature, no stars, no labels, no archiving, no ledger writes. Never sends.
---

# Email Reply

**One job: turn a thread that needs an answer into a Gmail draft.** Nothing else.

This is the fast path carved out of `/emailjobsearch` so answering two emails doesn't cost a full sweep — **no digest mining, no dashboard rebuild, no ledger reconciliation, no reading a 170KB ledger.**

## Two modes

Pick by what {{FIRST_NAME}} said when invoking. **If it's ambiguous, ask** — it's one question and the modes do very different amounts of work.

| Mode | Trigger | What it does |
|---|---|---|
| **Targeted** | `/emailreply <company / sender / subject / thread id>` | Resolve to one thread, draft one reply. |
| **Sweep** | `/emailreply` with no argument, or "what needs a reply?" | Find threads awaiting a reply, report them, draft the ones worth drafting. |

## 🔴 Hard rules — these are the point of the skill

1. 🔴 **NO SIGNATURE.** Do not append the block from `Data/signature.html`. **Do not write a plain-text sign-off block either.** {{FIRST_NAME}} adds a signature at send time, from the mail client where it is installed. **End the body at the sign-off line and stop.** ✅ **`/emailjobsearch` does the same, so the two skills agree** — the connector strips every `<img>` on save, so an appended signature is always image-less and arrives broken.
2. 🔴 **NO STAR, NO PIN.** Apply no `STARRED` label, ever. **Some clients render a Gmail star as a pin, and pinned drafts cause problems.** If a thread genuinely needs attention beyond the draft, **say so in the output — the output is the flag, not the mailbox.**
3. 🔴 **NO OTHER GMAIL MUTATIONS.** No `Career/*` labels, no `Jobs` label, no archiving, no unsubscribing, no trashing. **`/emailjobsearch` owns all of that; this skill's only Gmail write is `create_draft`.** **Two skills filing the same thread is worse than one skill leaving it alone.**
4. 🔴 **NEVER SEND.** There is no send tool on this connector and that is fine — **the design is draft-then-hand-over.** **Never describe a draft as sent.**
5. ⚠️ **No ledger writes, no `Daily.md` writes.** If a draft changes a stage or creates a commitment worth recording, **name it at the end under "Worth logging"** and let {{FIRST_NAME}} decide whether to run `/emailjobsearch` or `/job-pipeline`. **Don't open `pipeline.md` to check — that's the cost this skill exists to avoid.**
6. ✅ **The one thing "Worth logging" MAY write is a board capture** *(only if ClickUp is configured)*:

   ```bash
   node Tools/clickup-sync.mjs --capture "chase <company> on the packaging question" --due 2026-09-14
   ```

   **This is a deliberate, narrow widening of rule 3 and nothing else moves.** It adds a card to the ClickUp **Daily** list so the item stops evaporating between sweeps. 🔴 **Still not a ledger write, not a `Daily.md` write, not a Gmail mutation.** ⚠️ **Still print the "Worth logging" list in the output** — the capture is a reminder that the item exists, not a substitute for telling {{FIRST_NAME}}.

## Before drafting anything — OR reporting a draft as unsent — check `in:sent`

🔴 **This check is not optional and it has already cost something.** In the source repo a recruiter received the same email twice because a draft was re-created after being read as missing.

**Two facts that keep biting:**

- **A draft absent from `list_drafts` has usually been SENT, not lost.** Sending consumes the draft and it vanishes from the folder.
- **An empty `plaintextBody` in a draft listing does NOT mean the draft is empty.** One such "empty" draft went out as a full three-paragraph follow-up minutes later.

🔴 **AND `search_threads` TRUNCATES THE MESSAGE LIST.** On this skill's first run in the source repo it returned two live threads ending on unanswered inbound messages. **Both were wrong.** `get_thread` on the same two ids showed a `SENT` message after each — one 2h09m later, the other five sends including one from that morning. **Drafting off the `search_threads` view would have sent two recruiters a duplicate on live conversations.**

✅ **So `search_threads` finds candidates; it never settles whether one was answered. `get_thread` is the only authority.**

⚠️ **`METADATA_ONLY` is enough for the check and costs almost nothing** — it returns every message with `sender` and `labelIds`, which is all the `SENT` test needs. **Use `PLAIN_TEXT` only once you have decided to draft.**

### Per thread, before writing

1. **`get_thread` with `messageFormat: METADATA_ONLY`** — list every message and check for a `SENT` one *after* the latest inbound. 🔴 **Never substitute the `search_threads` message list for this.**
2. **`search_threads` on `in:sent to:<their address>`** — replies sometimes start a *new* thread instead of threading. **This one adds threads; it never subtracts.**
3. **`list_drafts`** — is there already a draft on this thread? ⚠️ **The full listing can overflow; pass a `query` like `to:<address>`.**

⚠️ **If `create_draft` fails with a transient error, check `list_drafts` with a `to:` query before retrying.** **A blind retry is the duplicate bug wearing a different hat.**

### 🔴 The check is also required before *reporting*

**Never tell {{FIRST_NAME}} a draft is unsent, outstanding, or still owed without running `get_thread` on its thread first.**

The check above reads as a pre-drafting step, **and that framing caused a real failure.** ✅ **It is a pre-*claim* step. A statement about what has not gone out is a claim, and it needs the same evidence a draft does.**

⚠️ **What happened:** asked whether a thank-you had gone out, a `search_threads` returned five messages with the last `SENT` one predating the interview. **{{FIRST_NAME}} was told, with supporting evidence, that it was still sitting in Drafts. He pushed back.** `get_thread` on the same id returned **seven** messages, and the two it had hidden were both `SENT` — including the thank-you, sent **three hours earlier**. ✅ **Only the pushback prevented a duplicate on the most consequential live thread in the file.**

🔴 **The lesson is not "search_threads truncates" — that was already written down and was quoted before being walked into anyway.** ✅ **The lesson is that a NEGATIVE claim needs the authoritative source, and it is the easiest one to make carelessly**, because **nothing about a short result list looks like a truncated one.**

**So before writing the words "not sent", "still a draft", "unsent", "awaiting your send", or "nothing has gone out":**

1. **`get_thread` with `METADATA_ONLY` on that thread id. Count the messages.** **If the count differs from what `search_threads` showed, the search was truncated and every conclusion drawn from it is void.**
2. **Check the timestamps.** A `SENT` message *after* the latest inbound means answered. **Compare against the draft's own creation time** — a draft created minutes before a `SENT` message on the same thread is **residue**, not a pending task.
3. **If a draft and a send both exist, say so plainly and call the draft residue.** Do not present it as work outstanding.

### ✅ Why the folder lies

**Third-party mail clients rewrite a draft when they open it** — a new id, a new copy — **and the send then leaves the original behind.** So a draft sitting in the folder is **at least as likely to be the residue of a completed send as a task waiting to happen.**

🔴 **Therefore: the Drafts folder is not a to-do list and must never be reported as one. Thread state is the truth; the folder is an artifact of an editing habit.**

**Already answered → don't draft. Existing draft → update or replace it, and say which.** Report it and move on.

Background and the delete procedure: `Job Search/draft-audit.md`.

## Targeted mode

1. **Resolve the thread.** `search_threads` with `in:anywhere` — **never `in:inbox`**, since a filter can auto-file job mail straight to a label. **If more than one thread matches, list them and ask which — don't guess.**
2. **Read it.** `get_thread`, `messageFormat: PLAIN_TEXT`. **Read the whole thread, not just the latest message** — the ask is often two messages back.
3. **Run the `in:sent` check above.**
4. **Read only the context the reply actually needs** — see Context, below.
5. **Draft it.**
6. **Report:** who it's to, the thread, what the reply concedes or commits to, and anything you deliberately left for {{FIRST_NAME}}.

## Sweep mode

**Cheap by design** — metadata and snippets first, full bodies only for the shortlist.

1. **Find candidates:**
   - `in:inbox is:unread -in:draft` — no date bound
   - `in:anywhere newer_than:10d -in:draft` — catches auto-filed mail the inbox never saw
   - `is:starred -in:draft newer_than:30d` — things a past sweep flagged
2. **Filter to "actually needs a reply from {{FIRST_NAME}}."** A thread qualifies **only if a human asked something and no answer has gone out.** Use minimal-view snippets to triage; only `get_thread` the survivors.

   **Does not qualify** — skip silently, no draft, no mention unless it's the only thing found:
   - Automated application receipts and status pings that ask nothing
   - **Rejections** — a thank-you is optional and {{FIRST_NAME}}'s call. **Offer, don't draft.**
   - Aggregator digests, newsletters, job alerts
   - Junk and career-styled spam
   - 🔴 **Anything from a friend or family member.** {{FIRST_NAME}} answers those personally.
   - Threads where a `SENT` message already exists
3. **Report the shortlist first, then draft.** One line each: sender, what they asked, and whether you're drafting.
4. ⚠️ **Cap it at 5 drafts per run** unless told otherwise. **More than that and the drafts folder becomes the problem instead of the inbox — and the connector cannot delete a draft.** If there are more than 5, draft the 5 most time-sensitive and list the rest.

## Writing the draft

🔴 **Voice is `Prompts/reply-tone.md` — read it, it is not optional.** Professional, warm, accommodating. **Never `Prompts/soul.md`** — that governs how the assistant talks to {{FIRST_NAME}}, not how his/her mail sounds to a recruiter.

**The parts of `reply-tone.md` broken most often:**

- **The sign-off.** One variant, held consistently, plus the one narrow neutral fallback. **Never invent a third.**
- **Answer the actual question first.** Context and pleasantries after, not before.
- **Address them by name inside the prose** — *"...ready for you to update, Alex"* — not as a templated header.
- **Don't commit to deadlines, pricing, or scope.** *"I'll see what I can do to get this done by [date] — let me confirm and follow up."*
- **No AI tells** — "I hope this email finds you well," "as per my last email," "delve into."

### Formatting

🔴 **Use `<br><br>` between paragraphs in `htmlBody`. Never `<p>` tags, not even with inline margins.** Third-party clients strip every `<p>` and flatten the body into one `<div>`, taking the inline margin with it. **`<br><br>` is plain enough that nothing strips it.**

**Set both parameters and never let them disagree:**

- `htmlBody` — paragraphs separated by `<br><br>`
- `body` — the same text with real blank lines between paragraphs (some clients render the plain-text alternative)

**Write with air in it.** Short paragraphs, blank line between each.

### The line-editing ladder

**Run `writing-clearly-and-concisely` on the body before saving the draft.** It costs ~12K tokens, **which is why it's for real outgoing prose only** — not for the summary written back to {{FIRST_NAME}}.

**It sits UNDER `reply-tone.md`:** tone decides what the message concedes and how warm it sounds; Strunk only decides whether the sentences earn their length. **Where they conflict, tone wins** — the skill will happily cut a softener that's there on purpose.

**Then `grammar-check` for mechanics only**, with the real objective passed as its argument. ⚠️ **Take its grammar findings; discard its phrasing and tone suggestions** — its own steps flag "passive voice overuse" and "tone consistency," which belong to the rungs above it.

**Four errors that recur — check these by hand even if the skills run:**

1. **Missing comma before a coordinating conjunction joining two independent clauses.** The most frequent by far.
2. **Sentence fragments dressed as sentences** — a long noun phrase with no main verb.
3. **Non-parallel series** — noun phrase, then past participle, then gerund. Pick one shape and hold it.
4. **Overlong em-dash sentences.** A dash and a comma-spliced tail is two sentences.

### Creating it

`create_draft` with:

- **`replyToMessageId`** — the id of the **latest inbound message** in the thread, **not the thread id.** This is what makes it thread correctly.
- **`to`** — the sender's address, explicitly. Add `cc` only if the inbound had one and the answer concerns them.
- **`subject`** — leave to the reply chain unless starting a genuinely new thread.
- **`body`** and **`htmlBody`** — as above.
- **No `attachments`.** Nothing here can attach a local file, and base64 costs ~63K tokens per resume pair. **If a recruiter needs the resume, link it; if they insist on real files, {{FIRST_NAME}} attaches by hand from `{{ASSETS_DIR}}/Resumes/`.**

🔴 **Never write "attached" unless a file is genuinely attached.**

⚠️ **If you must edit an existing draft, prefer `update_draft` over creating a second one** — but know that it re-wraps every URL into a `google.com/url?q=` redirect and moves the draft onto a new thread. **Strip the wrappers before feeding a body back in**, or you get a double-wrapped URL that enterprise mail filters read as phishing. Full detail in `Prompts/reply-tone.md`.

## Context — read only what the reply needs

🔴 **Don't read `Job Search/pipeline.md`.** This skill doesn't write to it. **If a thread's history matters, `grep` for the company across `pipeline.md` and `pipeline-archive.md` — a grep, not a read.**

| Read this | When |
|---|---|
| `Prompts/reply-tone.md` | **Always.** |
| `Data/me.md` | The reply states availability, authorization, location, or start date |
| `Data/job-criteria.md` | The reply touches compensation, target titles, or location rules |
| `Context/business.md`, `Context/impact.md` | The reply needs real project detail or metrics |
| `Context/mail.md` | Drafting a substantive client/project update |
| `Job Search/pipeline-dossiers.md` | A row's provenance matters. **Open one section, never the file.** |

**Compensation — identify the engagement tier first** (`Data/job-criteria.md`):

- **Tier 1 (full-time salary)** and **Tier 2 (W2 agency hourly)** may be quoted as a range.
- 🔴 **Tier 3 (independent project rates) are NEVER drafted.** Surface it for {{FIRST_NAME}} to scope.
- **If the engagement type is unclear, quote nothing and say why in the output.**

**Resume and impact profile go as named hyperlinks, never attachments:**

- [Resume]({{RESUME_DOC_URL}})
- [Impact profile]({{IMPACT_DOC_URL}})

**Offer attachments if their system prefers them.**

## Output

**Short. This skill is supposed to be fast.**

- **Drafted** — one line each: recipient, company, what the reply says in a clause, and the thread it lands on.
- **Skipped** — anything that looked like it needed a reply but didn't get one, and the one-word reason (already answered / draft exists / automated / {{FIRST_NAME}}'s to answer).
- **Worth logging** — anything that changes a pipeline stage or creates a commitment. **Naming it is the whole job here; don't write it anywhere.**
- **Still needs you** — sends, and anything requiring a decision only {{FIRST_NAME}} can make (a rate, a date, a portal login).

**Then stop.** 🔴 **Do not offer to star it, label it, archive it, or update the ledger** — those are deliberately not this skill's job.
