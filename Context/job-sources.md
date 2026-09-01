# Job Email Sources

**The sender taxonomy: which senders are real, which are aggregators, which are junk, and how to tell.** Read by `/emailjobsearch` on every sweep and by `/triage-inbox` for categorization.

🔴 **This file is what makes the NEXT sweep cheap.** A finding left only in a sweep narrative has to be rediscovered. `/emailjobsearch` writes back to this file automatically: a new sender, a new rejection phrase, a new resolution trick, a corrected assumption.

✅ **Mark a corrected assumption as superseded rather than deleting it**, so the reasoning stays auditable.

⚠️ **Everything below is the transferable skeleton — the patterns, the tests and the traps.** The company-specific findings from the source repo were stripped. **{{FIRST_NAME}}'s own senders get added by the first few sweeps.**

---

## The four buckets, and what actually decides them

| Bucket | Test | What the sweep does |
|---|---|---|
| **Real** | A person or a firm with a specific requisition behind them | Label, star if it needs action, draft where warranted |
| **Aggregator** | Bulk sender whose value is the postings *inside* the mail | **Mine it, then archive it** |
| **Junk** | Career-styled marketing with no job content | Propose unsubscribe. **Never auto-unsubscribe.** |
| **Fraud** | See the fraud section below | **Never engage, never file under `Jobs`** |

🔴 **Anything that fits no bucket is reported as UNCLASSIFIED — never guessed at.**

---

## Real — always surface

### Applicant tracking systems (ATS relays) — infrastructure, not firms

These addresses carry **real status about real applications**, but they are the *vendor*, not the employer. **Never log the ATS as the company.**

| Relay | Vendor |
|---|---|
| `no-reply@us.greenhouse-mail.io` | Greenhouse |
| `no-reply@ashbyhq.com`, `hiring@ashbyhq.com` | Ashby |
| `no-reply@hire.lever.co` | Lever |
| `no-reply@ats.rippling.com` | Rippling |
| `notify@oorwinmail.com` | Oorwin |
| `@myworkday.com`, `@wd1.myworkdayjobs.com` | Workday |
| `@workablemail.com` | Workable |

**Resolution tricks that pay for themselves:**

- 🔍 **Unnamed employer? Read the Workday tenant slug in the status link.** `https://<tenant>.wd1.myworkdayjobs.com/...` — the tenant *is* the employer.
- 🔍 **A Workable receipt echoes the ENTIRE application back**, including who submitted it and what was answered. **If an automated service applied on {{FIRST_NAME}}'s behalf, this is where you find out what it claimed.**
- 🔍 **Read the FOOTER before deciding a decision mail has no employer.** In one source-repo case the subject was the generic *"Application Update"*, the sender was a relay, and the employer's name appeared **only in the footer link text** — "FNF Careers Page."
- 🔍 **A rejection is often the first place a role is named accurately.** One closure named the role as *Principal Product Designer* while the receipt three weeks earlier had said *Senior Product Designer*. **Read it as a correction to the ledger row, not only as an ending.**
- ⚠️ **A repeated rejection is not evidence of a second application.** One ATS sent the same rejection twice, byte-identical, two hours apart. **Read the body before logging a second row.**

### Staffing agencies and independent recruiters

**Real, and the most valuable inbound there is.** Two traps:

- 🔴 **{{FIRST_NAME}} often answers real recruiters personally, and fast.** **Check for an existing `SENT` message in the thread before drafting.** In the source repo the first full sweep found seven live recruiter conversations already handled and zero needing a draft.
- ⚠️ **The same firm can operate under two names.** Cross-check the sending domain, the phone number and the physical address before treating two threads as two firms.

### 🚨 The agency swarm — several agencies, one requisition

**A recognisable and recurring shape: three or four staffing desks pitch the same requisition within minutes to hours of each other.** They are all sub-contracting to one prime vendor, and none of them will say so.

🔴 **Answering more than one is actively harmful.** Two agencies submitting the same candidate to one client is the classic duplicate-submission problem — it can get a candidate disqualified outright, and at minimum it looks careless.

✅ **Handling: identify the swarm explicitly in the sweep output, name the requisition once, and let {{FIRST_NAME}} pick which desk to answer.** **Never draft replies to two members of the same swarm.**

⚠️ **The tell is the requisition, not the sender:** same client, same title, same location, same rate ceiling, arriving inside a short window.

### Right to Represent (RTR) documents

🔴 **ALWAYS surface, ALWAYS star, regardless of how the role scores.** An RTR is a legal-ish document authorising one agency to submit {{FIRST_NAME}} to one client. Signing two for one client is the duplicate-submission problem in its most concrete form.

⚠️ **Never auto-archive an unanswered RTR**, even if the role fails criteria. The decision is {{FIRST_NAME}}'s and it has consequences.

### Human referrals

**A person — not a service — forwarding a job link.**

🔴 **Never draft an automated reply to a friend, a family member, or a former colleague.** {{FIRST_NAME}} answers those personally. **Extract the job URL, fetch it, assess fit, and report a one-line verdict.** That is the whole job.

### The two-part redirect test — for a real recruiter pitching the WRONG role

When a real human sends a full JD that hits a hard no-fit, the reply is a **redirect**: a short note that declines on role specifically, names the target titles and the adjacent ones from `../Data/job-criteria.md`, states the location rule, links the portfolio and resume, and asks what work in {{FIRST_NAME}}'s discipline is on their desk.

🔴 **One judgment call survives, and it is NOT "should I ask." It is whether this desk carries that work at all.**

- ✅ **Draft the redirect** when the firm plausibly has relevant requisitions on another desk — evidence being a past posting, a job alert, or a second recruiter from the same firm who pitched the right discipline.
- ❌ **Skip it and just label off-criteria** when the firm demonstrably has none. A pure engineering-staffing shop gets a design redirect that is **a letter to an empty room.**
- **Say which call you made and why.**

⚠️ **Quote no rate in a redirect unless they asked.** A redirect that volunteers a number answers a question nobody put.

⚠️ **Drafting a redirect does NOT make the thread archivable.** A draft is not a reply.

---

## Aggregator — mine, then archive

**LinkedIn Job Alerts, Ladders, Indeed, ZipRecruiter, Glassdoor, JobLeads, Lensa, Dice alerts, Monster relays, Handshake digests, and every "N new jobs matching your search."**

**Read the digest, extract only postings matching the target titles in `../Data/job-criteria.md`, write them to `../Job Search/pipeline-leads.md`, then archive the digest.** If a digest yields nothing, **say so in one line** rather than listing what it contained.

### 🔴 Published salary bands from aggregators are frequently WRONG, and they err in both directions

Two measurements from the source repo, on the same day:

- **One aggregator's band drifted `$22K` on an unchanged requisition in five days.**
- **Another was wrong by `$104K` on the ceiling** — and it errs the *opposite* way to the first.

✅ **So: never log an aggregator band as fact.** Record it as *"per <source>"* and **verify against the employer's own posting before it influences a decision or reaches a drafted reply.**

⚠️ **And some aggregators name no employer at all.** The employer's name sometimes survives only in a perks string or a footer. **Verify before attributing a band to a company.**

### Other aggregator traps

- ⚠️ **"Jobs Posted in the Last 24 Hours" is a claim about when it was POSTED, not whether it is still OPEN.**
- ⚠️ **The employer field in an alert is not always the employer** — some aggregators put the *poster* there, which can be a staffing intermediary or a typo'd brand.
- ⚠️ **An `(est.)` marker on a salary means the aggregator computed it.** That is the whole signal and it is the only thing in the row worth reading skeptically.
- 🔍 **The same postings get re-served under different subject lines.** **Mine the stream once, not once per mail.**
- 🔍 **A sub-brand in a receipt, the parent in a digest** — cross-read them before logging the employer.
- 🔴 **One sender can be BOTH an aggregator and real.** Handshake is the canonical case: **the same mailbox sends paid project invites and bulk digests.** **Classify by content, never by sender address.** Any sender that does this earns its own rule in this file.

---

## Junk — propose unsubscribe, never mine

- **Career-styled marketing with no job content.**
- **AI application-service vendors** — the "we read 237,132 postings last night" shape, the "most companies don't have a human reading applications" shape, the cold "are you looking to explore new roles in <city>?" shape.

⚠️ **Distinguish these from the ATS RELAYS above.** The relays carry real status about real applications; these only talk about ATSs in the abstract, and the ask *is* the reply.

⚠️ **A scraped-profile tell worth knowing:** if the mail personalises on a city {{FIRST_NAME}} never writes — the USPS normalisation of the ZIP rather than the neighbourhood name — the sender scraped a profile rather than read one.

🔴 **NEVER AUTO-UNSUBSCRIBE.** There is no tool for it anyway. **Propose candidates and let {{FIRST_NAME}} act.**

---

## 🔴 Rejection language — and the test that outranks the phrase list

**A confirmed rejection is the one thing `/emailjobsearch` archives automatically.** That makes this the one auto-applied step that can *hide* something {{FIRST_NAME}} needed to see, so the bar is high.

### The load-bearing test

🔴 **Does the body name (a) another candidate, or (b) a decision already taken about {{FIRST_NAME}}?**

**The phrase list is a guide. The test is the rule.** In the source repo two unambiguous rejections nearly survived because they used the construction *inverted* — moving forward **with someone else** rather than **not** with the candidate — and the list only covered the negated form.

### Phrases confirmed load-bearing

> "moving forward with other candidates" · "pursuing other candidates at this time" · "position has been filled" · "decided not to move forward" · "we've selected another candidate" · "will not be progressing" · "decided to move forward with another candidate" · "decided to move forward with candidates who more closely match" · "we will not be moving forward with your application" · "you were not selected to move forward" · "we did not find a match with what the team is looking for" · "we've decided to continue with other candidates" · "we've filled the role with another candidate" · "regret to inform you that at this time your application was not successful" · "we don't see an ideal fit for this position" · "are going in a direction that better fits our needs"

⭐ **When a body uses the word "rejection" about itself, no test is needed.**

### 🔴 What is NOT a rejection — and this half is more useful than the list

**Four shapes that read adjacent to a rejection and must NEVER be auto-archived:**

| Shape | Example wording | Why it's different |
|---|---|---|
| **Cancelled requisition** | *"our hiring plans have shifted"* · *"we have closed the position but will keep your information on file"* | Nobody decided anything about the candidate. **The seat was withdrawn.** |
| **Paused requisition** | *"we are pausing interviews for this role… we'd like to keep your resume on file"* | A hiring freeze, plus an explicit invitation to stay. |
| **Closed role** | *"the position is now closed"* · *"the role has been closed"* | A decision about the **ROLE**, saying nothing at all about the candidate. |
| **Soft decline, relationship open** | *"doesn't fall as per the client's requirement"* while offering future reqs · *"no relevant opportunities at this time"* while keeping the profile active | A decline that **closes no door.** |

✅ **Handling for all four: log the row `Closed`, apply the role label, STAR it, and LEAVE IT IN THE INBOX.**

🔴 **THE HARDEST CALL THIS FILE HAS RECORDED, and the rule it produced:** one message said *"we have fulfilled the needs for this position and the role is no longer open"* — **filled AND closed in one sentence**, the two shapes this section deliberately keeps apart. ✅ **The tie goes to the inbox.** 🔴 **AND THE PHRASE WAS DELIBERATELY NOT ADDED TO THE LIST. A wording that required reasoning to classify is exactly the wording that must not become an automatic archive next time.**

⚠️ **Nurture boilerplate does not soften the test.** *"We encourage you to keep an eye on future opportunities"*, *"your talent may align perfectly with a different role down the road"*, *"at the moment!"* — **the question is who the sentence is about, never how warm it sounds.**

⚠️ **Volume language says nothing about how close the call was.** *"An overwhelming response"*, *"many qualified candidates"*, *"candidates whose qualifications more closely align"* is ATS-relay boilerplate. **It should never be read as encouragement.**

⚠️ **One ATS wrapper carries every kind — rejection, cancellation, and live requests for action.** **The wrapper decides nothing. Read the sentence.**

### The verbatim rule

🔴 **The phrase must appear VERBATIM IN THE MESSAGE BODY.** Not the subject, not the preview, not an inference from tone, and **not a Workday business-process heading.**

⚠️ **A real case: a Workday digest headed *"Follow up on Req-48986"* was a rejection — and the identical wrapper carries live requests for action.** **If the body is ambiguous, borderline, or you are reading the outcome off the wrapper rather than the text — don't archive. Label it, star it, report it.**

### Turnaround as a signal

⭐ **Record the clock on a rejection.** The fastest in the source repo was **eleven hours thirty-three minutes** from application, from an ATS that reads applications in that discipline constantly. **A same-day turnaround from a high-volume desk is a real signal about fit, not a queue artefact.**

---

## 🚨 Fraud — never engage, never file under `Jobs`

**The recurring shapes:**

- A "recruiter" writing from a bulk-mail or newsletter platform rather than a company domain.
- A named company whose domain does not resolve, or resolves to something unrelated.
- An interview conducted entirely over a chat app, with an offer before any call.
- **Any request for bank details, a "starter equipment" payment, or a check to deposit.**
- Free-mail addresses claiming to represent a named enterprise.

✅ **Handling: report it, label it as fraud (or leave it unlabelled), never file it under `Jobs`, and never draft a reply.** ⚠️ **Do not mark it spam automatically either** — that trains a filter on {{FIRST_NAME}}'s behalf. **Propose it.**

✅ **Envelope checks that separate fraud from mere cold sales:** a real domain, a named officer, and a real street address usually mean cold B2C sales rather than fraud. **Those still get "propose unsubscribe, draft nothing" — not a fraud flag.**

---

## 🔴 Automated application services — read this before logging their receipts

**If {{FIRST_NAME}} ever uses an AI application service, a "we apply for you" bot, or a one-click relay, this section becomes the most important one in the file.**

In the source repo these services ran for roughly four months and produced **no interview, no screen, and no recruiter conversation.** What they *did* produce:

- 🔴 **Applications to employers the criteria file explicitly excludes** — because **none of these services shows the employer before submitting.**
- 🔴 **Duplicate submissions to the same employer**, days apart, from two different bots — including to a local employer, which is the worst kind to duplicate.
- 🔴 **A class of PERMANENTLY BLOCKED applications** whose candidate account is an alias belonging to the service (`name-145094@<service>.net`) that {{FIRST_NAME}} **cannot log into.** Those applications can never be followed up, corrected, or withdrawn.
- ⚠️ **A seventeen-day mail tail after cancellation**, plus eight further applications lodged twenty-five hours *after* the account was closed.

**Rules that follow:**

- ✅ **Rows already lodged are real and keep running** — some advanced through recruiter relays. **Don't dismiss an inbound because a bot created the row.**
- 🔴 **A NEW submission receipt from a cancelled service is an ANOMALY to report, not a row to log quietly.**
- ⭐ **The sourcing mechanism is usually visible if you look:** one service was reading the candidate's own LinkedIn recommendation feed — the same postings appeared in a LinkedIn alert and in the bot's queue the same night. **A lead written to `pipeline-leads.md` off a job alert may be submitted within hours, by something nobody asked.**
- ⚠️ **Log these under `Applied but off-criteria` in the ledger** so the ratio stays visible and the behaviour stays auditable.

---

## Search hygiene — two rules that cost something to learn

### 🔴 Search `in:anywhere`, never `in:inbox` alone

**A Gmail filter can auto-file job mail straight to a label so it never touches the inbox.** An inbox-only sweep in the source repo **missed four rejections and a live Workday request for action** — all of it sitting under a label, unread. **Application status is exactly the category most likely to be auto-filed.**

✅ **Then run a SECOND, explicit pass over unread inbox mail: `in:inbox is:unread -in:draft`, no date bound.** `in:anywhere` covers the inbox in principle, but only within the date window and only for senders this taxonomy already knows about. **An older unread thread or a first-time sender falls through — and this pass is the one that most often surfaces a sender missing from this file.**

### 🔴 `search_threads` finds threads. It never decides what is in one.

**It truncates its message list silently, dropping both `SENT` and inbound messages.** See `../Job Search/pipeline.md` § Notes for the two incidents. **Every claim about a thread's contents goes through `get_thread`.**

---

## Maintenance

**Every sweep should leave this file slightly better.** Write back:

1. **A new sender** — which bucket, and the tell that decides it.
2. **A new rejection phrase** — **added only after it archived on the load-bearing test.**
3. **A new resolution trick** — a tenant slug, a footer link, a job-id pairing.
4. **A corrected assumption** — **mark the old text superseded rather than deleting it.**

⚠️ **Prune empty label searches.** If a `Career/*` sublabel holds zero messages across several sweeps, **record it as retired here** so no future sweep searches it again.
