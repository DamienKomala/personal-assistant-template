---
name: job-search
description: Search job boards for roles matching the profile, excluding anything already in the pipeline or inbox. Search-only — never applies or contacts anyone without confirmation.
---

# Job Search

**Search job boards for roles matching {{FIRST_NAME}}'s profile.** This skill covers ground the inbox doesn't — **`/emailjobsearch` already handles anything that arrived by email, so surfacing the same companies again is wasted output.**

## Steps

### 1. Read what's already known

`Job Search/pipeline.md`, **`Job Search/pipeline-leads.md`**, `Data/job-criteria.md`, `Data/me.md`, and `Context/impact.md`.

⚠️ **This skill is the one exception that genuinely needs the leads file.** A search that skips `pipeline-leads.md` **re-surfaces every posting {{FIRST_NAME}} has already been shown** — in the source repo that was 134 of them.

**Also `grep pipeline-archive.md` for any company you're about to present.** **A closed row means {{FIRST_NAME}} already applied and it ended, which is exactly the thing not to hand back as new.**

**Build an exclusion set from:**

- Every company in the pipeline, active or closed
- Every company seen in the inbox in the last 30 days (`in:anywhere newer_than:30d`) — `/emailjobsearch` covered those

### 2. Build search terms

From `Data/job-criteria.md` — **target titles plus core focus areas.** Default to remote unless told otherwise. **Honor the hard no-fits, the employer exclusions, and the seniority floor.**

### 3. Primary output: stable saved-search links, not individual job-detail links

🔴 **Individual postings expire within days to weeks, and most boards block unauthenticated verification** — dead links return 404/410, or the board silently redirects an expired posting to a generic search feed. **A deep link pulled from a search index is frequently dead on arrival.**

✅ **Saved-search URLs don't rot; they load live results whenever clicked.** Construct one per board per major title/remote combination:

- **LinkedIn:** `https://www.linkedin.com/jobs/search/?keywords=<title>&f_WT=2` (`f_WT=2` = remote)
- **Dice:** `https://www.dice.com/jobs/q-<query>-jobs`
- **Indeed:** `https://www.indeed.com/jobs?q=<query>&l=Remote`
- **Built In / Otta / Wellfound / an industry-specific board** — add whichever boards actually serve {{FIRST_NAME}}'s discipline

⚠️ **Tune this list.** The four boards a designer needs are not the four an SRE needs. **Record the ones that produce real hits and drop the ones that don't.**

### 4. Hunt for individual standouts

Use WebSearch for strong company/title/comp fits. 🔴 **Before including any individual posting in the output, verify it with WebFetch.** **Drop it silently** if the fetch returns 404/410/403, **or redirects to a generic search-results page instead of the specific listing.** **Never guess or include an unverified link.**

### 5. Apply the exclusion set

**Drop any posting from a company already in the pipeline or already seen in the inbox.** ✅ **Report the count dropped so {{FIRST_NAME}} knows the filter ran — but don't list them.**

### 6. Filter and rank what survives

Remove clear mismatches by seniority and domain, then **rank by fit against the core competencies and industry experience in `Context/impact.md`.**

### 7. Offer promotion to the pipeline

For each verified standout, **offer to add it to `Job Search/pipeline-leads.md` as a `Lead`** — 🔴 **leads live in that file, not in `pipeline.md`.**

**Don't add rows without {{FIRST_NAME}}'s say-so — a board hit is a suggestion, not a commitment.**

⚠️ **Append under an `###` heading beneath the existing `## Leads` heading.** A new `##` heading of its own is **silently skipped** by the dashboard build.

## Output

**A saved-search link per board**, grouped by board and labelled with what it searches for.

**Then any WebFetch-verified standout postings** with a one-line fit note, newest and best-fitting first.

**Note plainly if a board yielded no verified standouts this run**, and **state how many results were dropped as already-known.**

🔴 **This skill only searches and reports.** It does not apply, save, bookmark, or contact any employer or recruiter without explicit confirmation.
