# Reply Tone & Voice

**The voice of every email drafted on {{FIRST_NAME}}'s behalf.** Recipient-facing — distinct from [soul.md](soul.md), which governs how the assistant talks *to* {{FIRST_NAME}}. **Never let soul.md bleed into drafted external content.**

Read by `/emailreply`, `/emailjobsearch`, `/job-pipeline`, `/tailor-application`, and `/triage-inbox`.

---

## ⚙️ Tune this first

The defaults below describe a warm, accommodating, detailed professional voice. **They are a starting point, not a fact about {{FIRST_NAME}}.** Before the first real draft goes out, replace the placeholders and adjust:

| Setting | Placeholder | Notes |
|---|---|---|
| **Sign-off** | `{{SIGNOFF}}` then `{{FIRST_NAME}}` | Pick ONE and hold it. See the sign-off rule below. |
| **Fallback sign-off** | `{{SIGNOFF_NEUTRAL}}` | For replies with no opportunity on the table. |
| **Warmth** | accommodating by default | If {{FIRST_NAME}} is naturally terse, say so here and cut the softeners. |
| **Humor** | dialed down with strangers | Raise or remove entirely. |

✅ **The fastest way to calibrate this file is to paste two or three of {{FIRST_NAME}}'s own sent emails into `../Context/mail.md` and derive the rules from them.** A voice guide written from real sent mail beats one written from adjectives, every time.

---

## Voice

- **Friendly, accommodating, and professional.** Warmth and courtesy come first, not just directness.
- **Detailed.** Business correspondence — client work, project communication, negotiation — should read as thorough and considerate, not clipped. Explain the reasoning, not just the conclusion.
- **Rarely a flat "no."** When a request is tough — an aggressive deadline, an out-of-scope ask — the instinct is to find a way to accommodate rather than decline outright. *"I'll see what I can do to get it done"* commits to trying, not to refusing.
- **Match the formality of the incoming email.** Casual in, casual out; formal in, formal out.
- **Wit stays calibrated to the reader.** Dial it up with people who know {{FIRST_NAME}}; dial it way down — or omit it — with new contacts, clients, recruiters, and anything high-stakes. **When unsure, less wit, not more.**

### Sign-off

**`{{SIGNOFF}}`, then `{{FIRST_NAME}}`.** Match whatever {{FIRST_NAME}} has already used in the thread if prior messages show one; otherwise this is the default.

- 🔴 **Pick one and do not drift.** In the source repo the owner banned "Best," as robotic — and the useful half of that rule is the second sentence: **"Best regards," "Kind regards," and "Warm regards" are the same reflex wearing a longer coat.** Substituting one for another is not compliance.
- **One narrow fallback:** when there is genuinely no opportunity on the table — a pure logistics reply, a thank-you after a rejection, a scheduling confirmation — a sign-off about opportunity is a non-sequitur. Use **`{{SIGNOFF_NEUTRAL}}`** there. **Never invent a third variant.**

## Structure

- **Put a blank line between every paragraph.** A wall of text doesn't read like a person.

  🔴 **USE `<br><br>` BETWEEN PARAGRAPHS IN `htmlBody`. DO NOT USE `<p>` TAGS AT ALL — not even with inline margins.**

  This was corrected in the source repo from the sent HTML of a real message, not from theory. **Third-party mail clients (Spark, Airmail, and their family) strip every `<p>` and flatten the body into one `<div>`, taking the inline margin with it** — so the drafted spacing collapses entirely and the sender ends up re-adding blank lines by hand before every send. `<br><br>` is plain enough that nothing strips it.

  ⚠️ **The tell, if it ever needs re-diagnosing:** the sent HTML opens `<html xmlns=...><head><title></title></head><body><div name="messageBodySection">`. **That is not Gmail web** — Gmail emits a bare `<div dir="ltr">` with no document wrapper. `messageBodySection` is a desktop/mobile client signature.

  🔴 **The same behaviour ate a signature image in the source repo.** The headshot was the only element whose sole parent was a `<p>`; the other images sat inside `<a href>` anchors and survived. **In anything drafted for a mailbox like this, never let a `<p>` be the only thing holding an element in the document.**

  ✅ **Keep the plain-text `body` on real blank lines, and never let the two versions disagree** — some clients render the plain-text alternative.

- **Answer the actual question first.** Context and pleasantries after, not before.
- **Length matches substance, not a style rule.** Quick logistics replies stay short; genuine business correspondence should be as long as the situation warrants. **Don't truncate a substantive reply just to seem punchy.**
- **Be specific about next steps.** Propose times, not "let me know what works."
- **Address the recipient by name inside the prose** — *"...ready for you to update, Alex"* — rather than a templated "Hi Alex," header.
- **Account for stakeholders who aren't on the thread.** If a teammate or downstream collaborator needs something, name them and plan around it. This is what makes a reply read as considered rather than transactional.
- **Volunteer helpful extras** when there's a natural opening. Part of the "rarely says no" instinct, expressed proactively.

### Shape for a substantive status update

1. **What's done** — specific, often chronological ("this morning… this afternoon"), never vague ("made progress").
2. **Rationale** — if a decision was made, explain *why*, not just the outcome.
3. **Forward plan** — concrete next steps with a real timeframe ("next week," "tomorrow"), not "soon."
4. **Dependency / next action** — tie it back to what the recipient needs, so the email ends on a clear handoff rather than trailing off.

## What not to do

- 🔴 **Don't commit to deadlines, pricing, or scope on {{FIRST_NAME}}'s behalf.** Flag these instead of guessing. This doesn't mean sounding unaccommodating — *"I'll see what I can do to get this done by [date] — let me confirm and follow up"* beats both a flat decline and a hard promise.
- **No generic AI phrasing:** "I hope this email finds you well," "as per my last email," "delve into."
- 🔴 **Never write "attached" unless a file is genuinely attached.** A promise of an attachment with nothing attached reads worse than no attachment at all.

## 🔴 `update_draft` re-wraps every URL, and it moves the draft off its thread

Two behaviours of the Gmail connector's `update_draft`, both observed end to end in the source repo.

🔴 **IT REWRITES EVERY `href` AND EVERY PLAIN-TEXT URL INTO `https://www.google.com/url?q=…` ON EVERY SAVE.** So a body read back *out* of a draft already carries wrappers, and feeding that same body back *in* wraps it a second time — producing `google.com/url?q=google.com/url?q%3D<real>`. A nested open redirect still resolves, but **enterprise mail filters treat that shape as phishing**, and the plain-text alternative shows the whole ugly string to the reader.

✅ **THE RULE: strip the wrappers and send clean URLs.** The connector will wrap them once, which is the normal state. ⚠️ **This bites specifically when EDITING an existing draft; a fresh `create_draft` from clean source never hits it.**

🔴 **IT ALSO MOVES THE DRAFT ONTO A NEW THREAD OF ITS OWN**, because the tool carries no reply-to parameter. Subject and recipients survive, so the message still reads correctly — it simply will not thread.

⚠️ **That is a real cost, and the alternative is worse:** a *second* draft created with `create_draft` on the live thread. **Two drafts sharing one recipient and one subject cannot be told apart by the only rule that survives a client-side rewrite — identify by recipient and subject, never by id — so the duplicate-send risk outweighs the threading loss.** ✅ **Prefer `update_draft`, then verify with `list_drafts` that exactly one draft to that address exists.**

## The line-editing ladder — three rungs, in this order

🔴 **`reply-tone.md` → `writing-clearly-and-concisely` → `grammar-check`. The order is the whole point.**

| Rung | Decides | Skill |
|---|---|---|
| **1. Tone** *(this file)* | What the message concedes and how warm it sounds | — |
| **2. Concision** | Whether the sentences earn their length | `writing-clearly-and-concisely` (the `elements-of-style` plugin) |
| **3. Correctness** | Agreement, tense, punctuation, modifier placement, vague pronouns | `grammar-check` |

**Where 2 conflicts with 1, tone wins. Where 3 conflicts with 2, concision wins.** The concision skill will happily cut a softener that is there on purpose; the grammar checker will volunteer opinions about passive voice and "tone consistency" that belong to the rungs above it. **Take its grammar findings; discard its phrasing and tone suggestions.**

⚠️ **Rung 2 costs roughly 12K tokens on invoke, so it is for real outgoing prose only** — recruiter replies, cover letters, follow-ups. Not commit messages, not notes to {{FIRST_NAME}}. **Rung 3 is cheap** (one ~10KB `SKILL.md`, no reference docs) and **takes an objective argument — give it the real one**, e.g. *"decline on role and ask to be routed to their design desk"*. A checker that doesn't know the goal flattens prose toward generic business English.

### The four errors that recur in drafted replies

These are drafting defects, not preferences. **Check them by hand even when the skills run.** In the source repo the owner was hand-correcting five mechanical errors per draft before this ladder existed — every one of them punctuation.

1. 🔴 **Missing comma before a coordinating conjunction joining two independent clauses.** By far the most frequent.
2. 🔴 **Sentence fragments dressed as sentences** — a long noun phrase with no main verb.
3. ⚠️ **Non-parallel series** — noun phrase, then past participle, then gerund. Pick one grammatical shape and hold it across the list.
4. ⚠️ **Overlong em-dash sentences.** A dash is not a licence to run two more clauses. **A sentence with a dash and a comma-spliced tail is two sentences.**

---

*(Add real examples of {{FIRST_NAME}}'s past replies here over time to sharpen the voice match. See `../Context/mail.md`.)*
