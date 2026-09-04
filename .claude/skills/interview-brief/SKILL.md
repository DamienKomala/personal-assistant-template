---
name: interview-brief
description: Build a prep brief for one specific interview — recruiter screen, hiring-manager round, or panel. Researches the company, the product, and the actual people in the room, matches the job description's own phrases to real recorded experience, frames compensation honestly, and publishes it as an Artifact readable on a phone. Research and drafting only; never contacts anyone, never invents experience.
---

# Interview Brief

One brief per interview, published as an Artifact, read on a phone shortly before the call. **It is a working document under mild time pressure, not a research report** — scannable and honest beats comprehensive.

**Invoke with a company name, a ledger row, or a Gmail thread id.** If more than one round is in flight, ask which — a screen and a panel need different briefs.

## The six things that make this useful instead of a company summary

**1. 🔴 RESEARCH THE PEOPLE, NOT ONLY THE COMPANY. This is the highest-value step and the easiest to skip.**

In the run this skill was extracted from, one name lookup changed the whole opportunity: a contact recorded in the ledger as nothing but an email address turned out to be the company's **Chief Operating Officer**. That reframed a warm introduction as an introduction from the person who runs the business — and the ledger had carried him as an address for four days.

**Look up every named human: the interviewer, the referrer, the sourcer, the likely next-round manager.** Title, tenure, prior companies, route into the role.

⚠️ **A recruiter's own background tells you which room you are in, and that changes what to lead with.** A career recruiter runs a fit-and-filter call; a design or engineering manager runs a craft conversation. Establish which before deciding what the brief emphasises.

**2. Calibrate to the round.**

| Round | Lead with |
|---|---|
| Recruiter screen | Clarity, sector fluency, motivation, logistics. **Save deep craft reasoning for round two.** |
| Hiring manager | Craft, process, trade-offs — one concrete story per claim |
| Panel | Who each person is and what each will probe |

**3. Match the job description's OWN PHRASES to the real record.** Quote the requirement verbatim, then answer it from `../../../Data/me.md` and `../../../Context/impact.md`. A "what they asked / what you say" table is the most useful thing in the brief.

🔴 **Never invent experience, metrics, tools, or dates.** If a requirement has no genuine match, say so and give the honest bridge instead of manufacturing one. The same guardrail `/tailor-application` runs on applies here.

**4. Read the compensation band honestly, and refuse to anchor.**

State what the band actually *includes* — base only, or base plus bonus, or base plus bonus plus equity. **A very wide spread on a single requisition usually means the ceiling is level- and bonus-loaded rather than reachable.** Give the gap to `{{GOAL}}` from `../../../Data/job-criteria.md`.

✅ **The standing line: on a first call, the published band IS the answer to "what are your expectations."** Nothing is gained by naming a number inside it on day one.

⚠️ **Keep `{{PRIOR_COMP}}` in reserve.** Several US states — California's Labor Code §432.3 among them — bar an employer from *asking* salary history while allowing an applicant to *volunteer* it. Where that holds, it is a card to play when a number is actually being set, and worth more late than early. **Jurisdiction-specific and not legal advice; verify before relying on it.**

🔴 **Never draft a figure that has not been authorised, and never quote independent/project rates at all** — `job-criteria.md` governs which tiers may appear in writing.

**5. Include a "what not to say" section.** It is the least obvious part of the brief and consistently the most valued. Typical entries: competitive positioning the candidate knows but should not volunteer in a screen, a tool oversold rather than qualified, a referral leaned on twice, a recorded call forgotten mid-answer. **Four items is about right; more reads as nagging.**

**6. Mark sourced facts against indicative ones.** An employer-published band is a fact. Glassdoor process detail is candidate-reported — label it. **A brief that hedges nothing will eventually be wrong in the room.**

## Steps

**1. Read what the ledger already knows — do not re-derive it.** `grep` the company in `Job Search/pipeline.md`, open its `pipeline-dossiers.md` section if it has one, and read the thread with `get_thread`. The referral chain, prior applications, rate conversations and stage history are already recorded. Then read `Data/me.md`, `Data/job-criteria.md`, and `Context/impact.md` — the source for every fit claim.

**2. Fetch the live job posting.** The ledger holds a summary; the brief needs the employer's own words. Greenhouse, Lever, Ashby and Workable postings all fetch cleanly.

**3. Research, in this order:**

- **The people** — every named human (see above).
- **The product, especially anything shipped in the last six months.** A role can be named for something only months old; a brief written from company boilerplate misses it entirely.
- **The interview process** — rounds, length, difficulty, tone. Candidate-reported, so label it.
- **Company shape** — size, funding, market position. ⚠️ **Competitive positioning is round-two material, not screen material.**

**4. Write the brief.** The structure that worked, in order:

1. The three facts needed in the room — when, who, published band
2. What changed since applying
3. Where this call sits in the process
4. The company in usable terms
5. The fit table — their phrase, your answer
6. Compensation
7. Questions to ask
8. What not to say

**Adapt it. Do not follow it mechanically when the round is different.**

⚠️ **Questions to ask must be calibrated to the interviewer's actual role.** Asking a recruiter about team structure or process is fine; asking them to defend a technical trade-off is not.

**5. Publish as an Artifact.** Load `artifact-design` first. ✅ **`reference-brief.html` in this directory is the reference implementation** — keep its structure and its theme-token architecture: the complete light palette on bare `:root`, then `@media (prefers-color-scheme: dark)` guarded with `:not([data-theme="light"])`, then `:root[data-theme="dark"]`.

🔴 **Re-pitch the accent colour to the employer's world, and never copy their brand colours** — the brief belongs to the candidate, not the company's marketing.

⚠️ **Title it as a name, not a caption** — *"<Company> Screen Brief"*, never *"Interview Preparation Document"*.

**6. Write it back.** Add the artifact URL to the ledger row's `Next action`, and add a `Daily.md` block carrying the URL and the two or three things that actually have to be done before the call.

## Guardrails

- **Research and drafting only.** Never contact the company, the recruiter, or the referrer.
- 🔴 **Never draft a message owed to a friend, a family member, a client, or a personal referral contact.** Name the item, leave it to `{{FIRST_NAME}}`. Those relationships are not the assistant's to write into.
- **Never invent experience, metrics, dates, or tools.** Every fit claim traces to a reference file or the ledger.
- **Never state an inference as a fact.** *"Likely the senior manager who owns this reporting line"* is honest; *"you will meet the senior manager"* is not.
- **Do not pad.** This gets read before a call. If a section has nothing real in it, cut the section.
