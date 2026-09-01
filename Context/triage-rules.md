# Email Triage Rules

Rules for `/triage-inbox`. **Read fresh on every run — edit this file to tune behaviour.**

## Categories

- **Priority** — needs a timely response. Default signal: direct email (not cc'd), from a real person, asking a question or requiring a decision.
- **Action-required** — not urgent, but needs a reply or action eventually (invoices, form requests, scheduling).
- **Newsletter** — recurring bulk/marketing content from senders {{FIRST_NAME}} subscribed to.
- **Spam/promo** — unsolicited marketing, cold outreach, no prior relationship.

## VIP senders — always Priority, always flag

- *(none set — add names and addresses here: current employer contacts, recruiters in a live conversation, family, an accountant, a lawyer)*

## Job search context

**The detail lives elsewhere — don't duplicate it here:**

- `../Data/job-criteria.md` — target titles, location rules, hard no-fits, seniority floor
- `job-sources.md` — which senders are real, which are aggregators, which are junk
- `../Job Search/pipeline.md` — what {{FIRST_NAME}} has actually applied to

**For triage purposes, only the category matters:**

- **Real recruiter or application correspondence tied to a specific company** (ATS replies from Ashby/Greenhouse/Lever/Workday, "regarding your application with [Company]") is **Action-required**, even arriving mixed in with alert spam. **Read sender and subject carefully.**
- **Job-alert digests** are **Newsletter** and safe to archive per the list below.
- **Cold recruiter blasts for roles failing the criteria file** are **Spam/promo**.
- **Career-styled marketing with no job content** is **Spam/promo**.

🔴 **Run `/emailjobsearch` for the real work.** It classifies job mail into eight buckets and feeds the ledger. **`/triage-inbox` only needs to not mishandle it — and specifically, it must not label, star, or archive a job thread.** Two skills filing the same thread is worse than one skill missing it.

## Safe to auto-archive / label without asking

- Newsletters and promo mail from senders already categorized as such in past runs
- Automated notifications with no action needed (receipts, shipping confirmations, calendar auto-replies)
- Job-alert digests from the aggregator list in `job-sources.md`

## Must ALWAYS be flagged, never auto-archived

- Anything from a VIP sender above
- Anything mentioning **contracts, payments, legal, or client/employer decisions**
- **Financial and collections notices** — always Priority, never auto-archived, unless it matches a known phishing pattern recorded below
- **Account security notices** (security alerts, sign-in codes, 2FA) — always Priority
- Real recruiter or application-status correspondence per the job-search context above
- **Anything the assistant is not confident how to categorize**

### Known phishing patterns

- *(none recorded yet — add confirmed ones here with the exact sender address, so a future run marks them Spam/promo instead of Priority. In the source repo one bank-impersonation address earned a permanent entry this way.)*

## Unsubscribe policy

🔴 **Do NOT auto-unsubscribe from anything.** Propose candidates in the triage summary and wait for confirmation. **There is no unsubscribe tool anyway.**

## Reply drafting

- 🔴 **Draft-only: create a Gmail Draft, never send.**
- Match `../Prompts/reply-tone.md`.
- **If a reply requires information the assistant doesn't have** — pricing, availability, a decision only {{FIRST_NAME}} can make — **draft a placeholder naming what's missing rather than guessing.**
