# Calendar Preferences

Rules for `/manage-calendar`. **Read fresh on every run — edit this file to tune behaviour.**

## Basics

- **Timezone:** {{TIMEZONE}}
- **Working hours:** {{WORKING_HOURS}}
- **Default meeting length:** 30 minutes, unless the request implies longer
- **Buffer between meetings:** 15 minutes minimum

## Conflict handling

- **Never double-book without asking.**
- If a new request conflicts with an existing event, **propose alternative times rather than silently picking one.**
- Treat events marked "busy"/private the same as any other conflict — **do not reveal their details when proposing alternatives to a third party**, just note the time is unavailable.

## Scheduling proposals

- 🔴 **The assistant PROPOSES ONLY.** It does not create, move, or cancel calendar events without explicit confirmation in the conversation.
- When proposing times, offer 2–3 options within working hours where possible.
- **Flag anything requested outside working hours or on weekends** instead of scheduling it automatically.

## Interview-specific rules

⚠️ **A screen booked through a recruiter's own scheduling page will not always appear in email.** In the source repo the single most important calendar entry of a week — a live interview — **existed only on the calendar, because the candidate had booked it himself through a Calendly-style page.** **A sweep that only reads Gmail misses it entirely.**

✅ **So: check the calendar for interviews as well as the inbox, and cross-check both against the ledger.**

- **Read the duration as a signal.** A 15-minute slot is a screen, not an interview — plan one topic, not five.
- **Capture the join details into the ledger row** (link, meeting id, passcode, dial-in) so they are not buried in an email at 1:29pm.

## Reminders

- *(none configured — e.g. "flag anything unprepared 24h before an external meeting")*
