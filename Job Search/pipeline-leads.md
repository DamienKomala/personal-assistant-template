# Pipeline — Leads

The **un-worked backlog**: postings identified but not yet acted on.

> ⚠️ **A sweep APPENDS here and does not READ.** `/emailjobsearch` writes new digest finds into this file and never loads it — that is what keeps `pipeline.md` under the read cap.
>
> ✅ **`/job-search` is the one skill that genuinely needs to read this file**, because its whole job is not to re-surface a posting already shown.
>
> ✅ **Promoting a lead means MOVING it** into `pipeline.md` as an `Applied` or `Replied` row, not copying it.

## Leads — mined from aggregator digests

🔴 **When appending a new mined-leads block, make its heading an `###` UNDER THIS `##` HEADING.** `Dashboards/lib/ledger.mjs` maps a table by its nearest heading and falls back to the parent `##`, so an `###` here lands in the `lead` section. **A new `##` heading of its own is silently skipped** — that mistake cost fifteen leads in the source repo before anyone noticed. **Read the build's *"skipped tables"* line every run.**

⚠️ **A table matched only on its parent `##` must still carry one of `company / source / role / engagement` as a column**, or it is skipped as having no identity column. Narrative tables with headers like `Lead / What changed` were otherwise parsing as rows with every field null and being pushed to the ClickUp board as empty tasks.

### Template block — copy this shape for each sweep

| Company | Role | Location | Comp | Found | Source digest | Note |
|---|---|---|---|---|---|---|

### From job-board searches

| Company | Role | Location | Comp | Found | Source | Why it's a lead |
|---|---|---|---|---|---|---|

## Dead leads

Postings looked at and rejected, kept so they are never re-surfaced as new.

⚠️ **This `##` heading is deliberately NOT in `SECTION_KIND`, so this table is skipped by the build and never reaches the dashboard or the board.** That is correct — a dead lead is a memory, not a row. It will appear in the build's *"skipped tables"* line every run; **that line is expected here and nowhere else in this file.**

| Company | Role | Location | Band | Verdict |
|---|---|---|---|---|
