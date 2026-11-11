# Application Answers

The standing answers for job application forms, collected from the applications {{FIRST_NAME}} has already submitted. `/custom-apply` reads this file to autofill forms, and it appends any new answer {{FIRST_NAME}} gives so the same question never has to be asked twice.

**This holds form answers only.** Work history lives in [me.md](me.md), and the salary rule lives in [job-criteria.md](job-criteria.md). If this file disagrees with either of them, they win.

⚠️ **This file holds real contact details and EEO choices. If your repo is public, think before committing it filled in.**

## Identity and contact

| Field | Answer |
|---|---|
| First / last name | {{FULL_NAME}} |
| Email | {{EMAIL}} |
| Phone | {{PHONE}} — note the digits-only and `+1` forms here too, for fields that want them |
| City / address | {{CITY_STATE}} |
| Country | United States |
| Timezone | {{TIMEZONE}} |
| LinkedIn | {{LINKEDIN_URL}} |
| Portfolio / website | {{PORTFOLIO_URL}} |
| Headline / desired title | {{TARGET_TITLE_1}} |
| Current employer / title | {{CURRENT_TITLE}} |

## Eligibility

| Question | Answer |
|---|---|
| Legally authorized to work in the U.S.? | {{WORK_AUTH}} |
| Need visa sponsorship, now or in future? | {{SPONSORSHIP}} 🔴 **Check this on every form before submit — a wrong answer here cost the source repo's owner a rejection.** |
| 18 or older? | Yes |
| Willing to relocate? | {{RELOCATE}} |
| Start date / notice period | {{START_DATE}} |
| Background check / drug screen consent | |

## Voluntary self-identification (EEO)

**Decide once and record it here** — e.g. *"I don't wish to answer"* for race/ethnicity, gender, sexual orientation, veteran status, and disability. **Never guess a different answer on a form.**

## Compensation

- **Salary expectation field:** match it to the **posted band**, as `job-criteria.md` describes. A workable rule: your goal figure when no band is posted, the band floor when the floor is above your goal, and the band top when the top is below it.
- 🔴 **Hard floor: {{TIER1_FLOOR}}.** If a band tops out below that, stop and ask.
- **Hourly / W2 contract fields:** {{TIER2_RANGE}} (tier 2). **Never enter a tier-3 project rate.**
- **Workday** needs the full amount to the cent (`$150,000.00`), or the field errors and blocks submit.

## AI and recording consents

| Question | Answer |
|---|---|
| Consent to AI-assisted evaluation of the application | |
| Consent to recording an interview | |
| "Did you use AI to write this application?" | **Answer honestly.** |

## Experience questions

| Question | Answer |
|---|---|
| Years of experience (dropdown) | The **top bucket that is true**. |
| Years of experience (free text) | |
| Managed people? | |
| Fully remote in the last 5 years? | |
| How did you hear about this role? | The real source: the board it was found on, or "Company website". |

## Free-text answers

Write each one fresh for the posting, from `me.md` and `Context/impact.md`. Humanize it the same way as the cover letter. **Never paste the same paragraph into two companies.**

## Log of new answers

Append here when {{FIRST_NAME}} answers a question this file doesn't cover yet. Add the date and company, then move the answer into the right section above.
