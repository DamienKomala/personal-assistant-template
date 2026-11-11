---
name: custom-apply
description: Apply to ONE job with a custom resume and cover letter. Tailors both to the posting from the owner's real record, humanizes the cover letter until it sounds like them, then autofills the application form in Chrome from their standing answers and uploads the tailored files. Stops at the review screen; submits only on their word.
---

# Custom Apply

**One posting at a time.** Pass a job URL, a board job id, or the open tab, or call it while a posting is on screen. **Invoking it counts as the Chrome request** — browser automation is token-expensive, so nothing else in this repo opens a browser unasked.

## What it reads

| File | Why |
|---|---|
| `Data/job-criteria.md` | Fit check and the salary-field rule |
| `Data/application-answers.md` | **Every standing form answer** (contact, eligibility, EEO, salary, consents, experience questions). The autofill source. |
| `Data/me.md`, `Context/impact.md` | The only permitted facts |
| `{{RESUME_PDF}}` | The live master resume, the starting draft |
| `{{ASSETS_DIR}}/Cover Letters/` | A real past letter in {{FIRST_NAME}}'s voice; start the letter from it |
| `Prompts/reply-tone.md` | Voice. Recruiter register: warm and candid, no buddy words. |
| `Job Search/sweep-brief.md` | Company index for the repeat check |

## Steps

1. **Read the posting.** Use `get_page_text` on the employer's own page (or WebFetch if it's public). Capture the company, exact title, location and remote terms, the posted band, the named tools, any hiring manager's name, and the ATS (Greenhouse, Ashby, Lever, Workday, LinkedIn Easy Apply…).

2. **Fit and repeat check, before writing anything.**
   - Check it against `job-criteria.md`: hard no-fits, location rule, seniority floor. On a miss, **stop and say why**.
   - If the band tops out under the floor in `job-criteria.md`, stop and ask. **Don't enter a sub-floor number to make it fit.**
   - Check for a repeat: `grep -i "<company>" "Job Search/sweep-brief.md"`, then a Gmail search `in:anywhere "<company>"`. If {{FIRST_NAME}} applied before or was declined, say so and ask whether to send a second application.
   - If the posting **bans AI-written answers**, stop. That application is {{FIRST_NAME}}'s to write.

3. **Tailor the resume.** Follow `/tailor-application` steps 3–6 exactly (reconcile, map, report gaps, reweight). Its hard guardrail applies in full: **reorder and reword real material only, and never invent or inflate anything.**

4. **Write the cover letter, starting from the real past letter, and make it about this role.**
   - Open with why *this* company and seat, using a real detail from the posting. Never open with "I am writing to express my interest".
   - Use two or three proof points that match the posting's own priorities, each from `me.md` or `impact.md`.
   - Address the hiring manager by name if the posting gives one; otherwise "Hi [Company] team,".
   - Keep it to **one page, about 250–350 words**, with short paragraphs and contractions.

5. **Humanize it so it sounds like {{FIRST_NAME}}, not AI. Not optional; three passes, in this order:**
   1. **`humanizer` skill** over the letter body (and any free-text form answers). It strips em dashes, rule-of-three padding, "not just X but Y", promotional adjectives, and stock openers.
   2. **Voice pass against `Prompts/reply-tone.md`** and the real past letter. Warm first, then useful, plain-spoken, candid, one clear ask at the end. If a sentence sounds like a LinkedIn post, rewrite it the way it would be said across a table.
   3. **`grammar-check`, mechanical fixes only** (Oxford commas, comma splices, agreement). Give it the real objective, e.g. *"cover letter for <role> at <company>; keep the voice"*. **Discard its tone and passive-voice suggestions** — tone outranks Strunk, and Strunk outranks grammar-check.
   - **Then re-verify every fact** against `me.md`. A rewrite is where numbers drift. **If the voice wants a rounder number, the real number wins.**

6. **Write the files** to `{{ASSETS_DIR}}/Resumes/Tailored/<Company>-<Role>/` — `.md`, `.docx` and `.pdf` for both, plus a `notes.md`, exactly as `/tailor-application` step 10 describes. **Name the upload copies with the company in them** (`Firstname_Lastname_Resume_<Company>.pdf`) — recruiters see the filename. Render page 1 of each PDF and look at it. **The cover letter must fit on one page.**

7. **Autofill the application in Chrome.**
   - Use "Continue with Google" if a board asks for sign-in. 🔴 **Never type a password, never create an account, never solve a CAPTCHA.** If one appears, leave the tab open and say so.
   - Fill every field from `Data/application-answers.md`. **The salary field follows the posted band** (see that file). Use the Workday cent format where needed.
   - Upload the **tailored** resume and cover letter PDFs with `file_upload`. If a board only takes a profile resume (LinkedIn Easy Apply), select the newest master and paste the letter text if there's a field for it.
   - **Decline every "autofill/sync my profile from this resume" offer** that would overwrite profile text {{FIRST_NAME}} wrote. Fill the form fields directly.
   - **Free-text questions:** write each answer fresh from the real record, and humanize it with the same three passes. Never reuse a paragraph from another company's application.
   - **A question the answers file doesn't cover:** stop and ask. Record the answer under *Log of new answers* in `Data/application-answers.md`, then continue.
   - 🔴 **Check sponsorship and work authorization before every submit.**
   - ⚠️ **If the board pre-fills experience from a stale profile, don't submit over it.** Correct the fields on the form, or stop and flag it.

8. **Stop at the review screen** and show a short summary: the files attached, the salary entered, and every non-obvious answer. **Submit only on {{FIRST_NAME}}'s word**, or when the invocation itself said to submit (e.g. `/custom-apply <url> and submit`). After submitting, confirm the success screen or the confirmation email.

9. **Record it, only after a confirmed submit.**
   - Add an `Applied` row to `Job Search/pipeline.md`, in the column format of the existing rows, and run the column validator described in that file's Notes.
   - Add a line under today's block in `Daily.md`.
   - Save any new standing answer to `Data/application-answers.md`.

## Output

- **Fit:** one honest line, including the gap to the goal figure if the band sits below it.
- **Files:** paths to the tailored resume and cover letter.
- **The cover letter:** the full text, so the voice can be checked by the person whose voice it is.
- **Form summary:** salary entered, attachments, any new answers recorded, anything left blank and why.
- **Status:** *ready for your OK at the review screen*, or *submitted* with the confirmation seen.

## Guardrails

- **Never invent or inflate experience.** The `/tailor-application` guardrail outranks the humanizer.
- **One posting per run.** For a batch, run it once per job and report each one.
- **Never send an email, message a recruiter, or post anything.** Applying through the form is the only outbound act, and only after the go-ahead.
- **If a form fails twice** (a stuck upload, a submit that won't go through), stop and leave the tab open. Don't brute-force it.
