# Pipeline — Archive

**Cold storage: every closed row and every sweep narrative.**

> ⚠️ **Never read this file whole — `grep` it.** It is provenance, not state.
>
> ✅ **Closing a row means MOVING it here** and leaving a one-line stub in `pipeline.md`. **Do not strike a row through and leave it in the live table** — that habit is what forced the ledger split in the source repo.
>
> 🔴 **A migrated row needs its OWN table header and `|---|` separator above it.** The parser only recognizes a table when a `|` line is followed by a rule. A row pasted in without one is invisible to the dashboard, the board and every count — while rendering perfectly in Markdown, which is why nobody sees it.
>
> 🔴 **The stub left behind in `pipeline.md` must carry its pointer in the `Next action` column (column 7).** Anywhere else and it parses as a real row, so the archived original and the stub are both counted and every total inflates by one per migration.

## Closed

🔴 **This heading is `## Closed` and the exact string matters** — `SECTION_KIND` in `Dashboards/lib/ledger.mjs` maps on it. Rename it and every archived row silently leaves the ledger.

| Company | Role | Source | Applied | Stage | Last touch | Outcome | Thread |
|---|---|---|---|---|---|---|---|

## Migrated from the live conversations table

Closed recruiter conversations moved out of `pipeline.md`. **Still conversations — only their storage location changed**, which is why this heading maps to `conversation` rather than `closed`.

⚠️ **The lookup strips a trailing date, so `## Migrated from the live conversations table — 2026-09-14` maps too.** **Don't add a new `SECTION_KIND` key each time a sweep migrates rows.**

| Company | Role | Source | Applied | Stage | Last touch | Next action | Thread |
|---|---|---|---|---|---|---|---|

## Sweep narrative — newest first

Each `/emailjobsearch` run writes its full narrative here and leaves only a short "Last swept" summary at the top of `pipeline.md`. **In the source repo this narrative reached 66KB — 23% of the live file — and nothing reads it during a sweep.**

*(No sweeps yet.)*
