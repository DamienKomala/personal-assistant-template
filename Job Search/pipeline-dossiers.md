# Pipeline — Dossiers

The **long-form history** behind live rows in [`pipeline.md`](pipeline.md).

> 🔴 **A SWEEP NEVER READS THIS FILE.** Open one section when a specific row's provenance matters — why a rate was refused, what a recruiter actually said, which assumption got corrected.
>
> ⚠️ **It holds no tables and `Dashboards/build-data.mjs` deliberately does not parse it.** Nothing here is a ledger row.
>
> 🔴 **On any conflict, `pipeline.md` wins.** A dossier records what was thought at the time, including things later reversed.

## Why this file exists

`pipeline.md` twice grew past the read cap in the source repo, and **both times the weight was narrative packed inside live table cells** rather than dead rows. One `Next action` cell reached 29.9KB — eleven percent of the file.

✅ **The rule: `Next action` answers "what happens next", not "what happened".** When a cell passes roughly **1,200 characters**, move the history here and leave a link.

## How to write a section

One `##` heading per company, named exactly as the ledger row names it, so a link from the row resolves.

⚠️ **A heading's anchor is its FULL slug: lowercase, punctuation stripped, spaces to hyphens, and every internal hyphen KEPT.** Two ways to break it, both seen in the source repo: **truncating the slug** (25 anchors were cut at 60 characters) and **collapsing hyphens that live inside words** — `e-commerce` → `ecommerce`, `re-application` → `reapplication`, `2026-08-10` → `20260810`. Each produces a link that renders fine and goes nowhere.

⚠️ **And the check that misses it: comparing with a PREFIX match.** A truncated anchor is a prefix of the real one, so a prefix test passes on a broken link. **Compare for EQUALITY against the set of heading slugs, and expect zero mismatches.**

---

*(No dossiers yet.)*
