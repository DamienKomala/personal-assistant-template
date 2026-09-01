---
name: manage-calendar
description: Review calendar and scheduling-relevant email, propose new events/reschedules/conflict resolutions. Proposes only — never creates or modifies events without confirmation.
---

# Manage Calendar

Review the calendar using the Calendar connector.

## Steps

1. **Read** `Data/me.md` and `Data/calendar-preferences.md`.
2. **Pull upcoming events** (next 7–14 days) and check for scheduling-relevant email (meeting requests, reschedule asks) if Gmail is available.
3. **Detect conflicts** — overlaps, insufficient buffer per `Data/calendar-preferences.md` — and flag them.
4. **For any new scheduling request, propose 2–3 candidate times** within working hours, avoiding conflicts. 🔴 **Do not create the event.**
5. **For conflicts on existing events, propose a resolution** — a reschedule option, or a note on who takes priority if determinable. 🔴 **Do not modify anything.**
6. **If a request falls outside working hours or on a weekend, flag it explicitly** instead of scheduling it.

## 🔴 Cross-check interviews against the ledger

⚠️ **A screen booked through a recruiter's own scheduling page never touches the mailbox.** In the source repo the single most important calendar entry of one week — **a live interview that day** — **existed only on the calendar**, because {{FIRST_NAME}} had booked it himself through a Calendly-style page. **A job sweep that only reads Gmail misses it entirely.**

✅ **So: if an upcoming event looks like an interview or a screen, check it against `Job Search/pipeline.md`** and report any row that should have moved stage.

- **Read the duration as a signal.** **A 15-minute slot is a screen, not an interview** — one topic, not five.
- **Surface the join details early** (link, meeting id, passcode, dial-in) so they aren't buried in an email at 1:29pm.

## Output

**Upcoming conflicts found**, **proposed new events awaiting confirmation**, and **proposed reschedules awaiting confirmation.**

🔴 **Only create, update, or delete a calendar event after {{FIRST_NAME}} explicitly confirms which proposal to act on.**
