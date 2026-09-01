---
name: triage-inbox
description: Triage recent Gmail inbox — categorize, draft replies, propose cleanup. Draft-only, never sends or deletes without confirmation.
---

# Triage Inbox

Triage the **non-job** inbox using the Gmail connector.

🔴 **This skill does NOT own job mail.** `/emailjobsearch` classifies job threads into eight buckets and applies labels, stars and archives. **If a thread is a recruiter, an application, a rejection, a job digest, or career-styled junk, leave it untouched here** — unlabelled, unstarred, unarchived — **and don't mention it in the output.** **Two skills filing the same thread is worse than one skill missing it.**

## Steps

1. **Read** `Data/me.md`, `Context/triage-rules.md`, and `Prompts/reply-tone.md`.
2. **Pull recent unread/unprocessed messages** from Gmail.
3. **Categorize each** as **Priority**, **Action-required**, **Newsletter**, or **Spam/promo** per `Context/triage-rules.md`.
4. **For anything needing a reply, create a Gmail DRAFT (never send)** following `Prompts/reply-tone.md`. **If information is missing to answer properly, draft a placeholder naming what's missing** rather than guessing.
5. **For newsletters/promo matching known safe-to-archive patterns, PROPOSE archiving** — do not act until confirmed, **unless the rules file explicitly marks that pattern as pre-approved.**
6. 🔴 **Never auto-unsubscribe.** Only propose candidates.
7. **Always flag VIP senders and anything involving contracts, payments, legal, or account security** — regardless of category.

## Output

A summary grouped by category: **sender, subject, one-line reason for the category, and what action was taken or is proposed.**

**End with a clear list of anything awaiting {{FIRST_NAME}}'s confirmation** — sends, archives, unsubscribes.
