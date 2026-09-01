---
name: tailor-application
description: Tailor the resume and cover letter to a specific role, drawing only on real experience from the profile files. Writes to the assets directory — never invents experience, dates, tools, or metrics.
---

# Tailor Application

**Produces a resume and cover letter aimed at one specific role, by reweighting real material — never by inventing it.**

## Input

**A company and role from the ledger, or a job description {{FIRST_NAME}} pastes or links.**

If given only a company name, look it up first: **`Job Search/pipeline.md`** (live), then **`pipeline-leads.md`** (a lead being acted on — the common case for this skill), then **`grep pipeline-archive.md`** (a closed row — **worth knowing {{FIRST_NAME}} already applied and it ended before tailoring a second application**).

If the JD is a URL, fetch it.

## Source files

**Profile — the facts:**

- `Data/me.md` — work history, dates, tools, education
- `Context/impact.md` — career highlights and proof points
- `Context/business.md` — value proposition and approach
- `Data/job-criteria.md` — targeting and the compensation rule

**Base documents — the starting drafts:**

- `{{ASSETS_DIR}}/Resumes/{{RESUME_PDF}}` — **the live resume and the most current one.** Extract its text with `uv run --with pdfplumber` unless `pdftotext` or `pypdf` is installed system-wide.
- `{{ASSETS_DIR}}/Cover Letters/` — existing cover letters, for structure and voice

🔴 **Do not use archived `.txt` copies as a source of current fact.** In the source repo an earlier version of this skill named two archived `.txt` resumes as the base documents. **They were nine days stale and missing a current role.** They are useful for phrasing history, nothing more.

## Steps

1. **Read the JD closely.** Pull out the actual requirements, the named tools, the domain, the seniority, and whatever the posting clearly cares about most.

2. **Check fit against `Data/job-criteria.md`.** **If the role hits a hard no-fit, an employer exclusion, or falls below the seniority floor, say so before doing the work** rather than tailoring for something {{FIRST_NAME}} shouldn't pursue.

3. 🔴 **Reconcile the profile against the live resume BEFORE mapping anything.**

   `Data/me.md` can lag the live resume, **and when it does the hard guardrail below turns into a trap:** it permits only what `me.md` contains, so **followed literally it would quietly drop a current job from the resume and still report clean.**

   **Diff the live PDF against the profile files first.** If the PDF has a role, employer, date, or metric the profile lacks, 🔴 **STOP and tell {{FIRST_NAME}}** rather than silently omitting it or silently importing it. **Getting `Data/me.md` updated is the fix; tailoring around the gap is not.**

   *(This happened once in the source repo. The live PDF carried a current role the profile files didn't, and `me.md` was corrected the same day. `impact.md` still had no proof points for it — so that role had a resume entry and no highlight material to draw on, which is worth reporting rather than discovering mid-draft.)*

4. **Map JD requirements to real evidence.** For each significant requirement, find the specific proof in `Data/me.md` or `Context/impact.md`. **Name the project, not the skill.**

5. **Report the gaps.** Where the JD asks for something {{FIRST_NAME}} genuinely doesn't have, **list it plainly.** {{FIRST_NAME}} decides whether to apply anyway — **a gap is information, not a reason to fudge.**

6. **Tailor the resume.** Reorder and reweight: **lead with the most relevant roles, expand bullets that match the JD, compress those that don't, and mirror the posting's vocabulary where it honestly describes what {{FIRST_NAME}} did.** 🔴 **Every date, employer, title, tool, and number stays exactly as it appears in `Data/me.md`.**

7. **Write the cover letter.** Follow `Prompts/reply-tone.md`. **Address a real person if the JD names one. Open with why THIS specific role, not a generic hook.**

   ⚠️ **Honor the project-type preferences in `job-criteria.md` by OMISSION, never by declining.** If the role includes work {{FIRST_NAME}} privately dislikes, **leave it unmentioned and lead with the work he/she wants more of.** **Never write a paragraph declining a project type** — it answers a question nobody asked and hands an employer a reason to hesitate.

8. **Run the humanizer pass.** Invoke the `humanizer` skill in **embedded mode** over the cover letter body and the resume's prose bullets. Embedded mode returns final text only — no draft, no audit bullets, no commentary.

   It strips what makes application material read as machine-written: **em dash overuse, rule-of-three padding, "not just X, but Y" parallelisms, promotional adjectives, vague attributions, meta-commentary,** and the stock openers ("I hope this email finds you well", "I am writing to express my interest"). **Note that it removes em and en dashes outright.**

   🔴 **THEN RE-VERIFY THE RESUME AGAINST `Data/me.md`. A rewrite is exactly where a number drifts.** Every employer, date, title, tool, and metric in the humanized resume must **still match `Data/me.md` verbatim**; restore anything that moved.

   **Leave untouched:** contact details, section headers, employer names, dates, job titles, links, and `notes.md`. **Humanize prose, not data.**

9. **Write the output** to `{{ASSETS_DIR}}/Resumes/Tailored/<Company>-<Role>/` as `resume.md` and `cover-letter.md`, plus a short `notes.md` recording **which requirements were matched, which were gaps, and what was emphasized.**

   **That directory sits outside this repo, which holds configuration rather than artifacts.** Create it if it doesn't exist.

10. **Export in the same pass.** **Recruiters need real files, so `.md` alone is not a deliverable.** Invoke the `docx` and `pdf` skills to write `resume.docx` / `resume.pdf` and `cover-letter.docx` / `cover-letter.pdf` beside the markdown.

    🔴 **Never leave a `.md` edit with stale or missing exports next to it.** That drift is preventable, so it counts as a bug. **No `.txt`; the `.md` supersedes it.**

## 🔴 Hard guardrail

**Reorder, reweight, and reword ONLY material that already exists in `Data/me.md` and `Context/impact.md`.**

**Never invent or inflate an employer, a date, a title, a tool, a metric, a certification, or a responsibility.** **Never move a number up because the JD asks for a bigger one. Never claim familiarity with a technology that appears nowhere in the profile files.**

**If tailoring well would require something {{FIRST_NAME}} doesn't have, report the gap** — that outcome is correct and useful, **and a fabricated resume is worse than a mismatched one.**

🔴 **This outranks the humanizer pass in step 8.** The humanizer runs its own fabrication check, **but it is a prose tool and its job is to make sentences sound human, not to protect facts.** **Where a more natural phrasing would soften, round, or blur a real number, the number wins and the sentence stays a little stiff.**

## Output

- **Fit assessment** — one paragraph, honest, **including whether this is worth applying to.**
- **Requirement → evidence map** — what the JD asks for and what actually backs it.
- **Gaps** — requirements with no real backing.
- **Files written** — paths, plus what was emphasized and what was cut.
- **Humanizer note** — one line confirming the pass ran **and that the resume's facts were re-verified against `Data/me.md` afterward.** **If the pass altered a number, date, or tool and it was restored, say which.**
