# Profile

**Facts about {{FULL_NAME}}.** Read by `/emailjobsearch`, `/emailreply`, `/tailor-application`, `/job-search`, and `/manage-calendar`.

🔴 **This file is the fact base for anything a recruiter will read.** `/tailor-application` may only reorder, reweight, and reword what appears here and in `../Context/impact.md`. **It may never invent an employer, a date, a title, a tool, a metric, or a certification.** Get this file right and the whole job-search skillset gets honest output for free.

⚠️ **Keep it in sync with the live resume.** In the source repo, `me.md` fell nine days behind the PDF and was missing a *current role* — and `/tailor-application`'s guardrail ("use only what is in `me.md`") would have quietly dropped that job from a tailored resume while reporting clean. **The skill now diffs the live resume against this file before mapping anything and stops if they disagree. That check only works if you keep this file current.**

---

## About

- **Name:** {{FULL_NAME}}
- **Location:** {{CITY_STATE}}
- **Phone:** {{PHONE}}
- **Email:** {{EMAIL}}
- **Timezone:** {{TIMEZONE}}
- **Current title / target:** {{CURRENT_TITLE}}
- **Focus areas:** {{FOCUS_AREAS}}
- **Personal fit note:** *(one line on temperament — used to calibrate tone, not to claim anything)*

## Work authorization & logistics

*Recruiters ask these in the first message more often than anything else. Fill them in and the draft answers them without a round trip.*

- **Work authorization:** {{WORK_AUTH}}
- **Sponsorship required:** {{SPONSORSHIP}}
- **Earliest start date:** {{START_DATE}}
- **Willing to relocate:** {{RELOCATE}}
- **On-site tolerance:** *(see `job-criteria.md` § Location — this is the fact, that file is the filter)*

## Hobbies & interests

- *(optional — occasionally useful for a warm human reply, never for a resume)*

## Work experience

> **Format each role exactly like this.** `/tailor-application` reads employer, city, title and date range as a unit, and reweights the bullets. **Dates and titles are copied verbatim into tailored output — they are never adjusted to fit a posting.**

**{{EMPLOYER}}**, {{EMPLOYER_CITY}} — {{TITLE}} ({{START}} – {{END}})
- *(achievement bullet — specific, with a real number where one exists)*
- *(achievement bullet)*
- *(achievement bullet)*

**{{EMPLOYER_2}}**, {{CITY}} — {{TITLE_2}} ({{START_2}} – {{END_2}})
- *(…)*

**Prior:** *(earlier roles as a single line, if they no longer earn bullets)*

## Education

{{SCHOOL}} — {{DEGREE}}

## Certifications

*(name, issuer, year. Leave empty rather than aspirational — an invented certification is the single worst failure mode of a tailoring skill.)*

## Technologies & tools

{{TOOLS}}

---

## Where the binary versions live

**Resume artifacts live OUTSIDE this repo**, in `{{ASSETS_DIR}}/Resumes/` and `{{ASSETS_DIR}}/Cover Letters/`. This repo holds configuration, not artifacts.

| File | Role |
|---|---|
| `{{ASSETS_DIR}}/Resumes/{{RESUME_PDF}}` | **The live resume.** What recruiters actually received, so it is the record of what was claimed. |
| `{{ASSETS_DIR}}/Resumes/{{RESUME_DOCX}}` | Editable export, kept in sync with the PDF |
| `{{RESUME_DOC_URL}}` | Google Doc — the canonical *shareable* copy, link-viewable, offers PDF and Word download from the File menu |
| `{{IMPACT_DOC_URL}}` | Impact profile, same arrangement |

✅ **`.docx` and `.pdf` are both readable and writable** via the globally installed `docx` and `pdf` skills. **Regenerate the exports in the same pass as the source edit** — a source change with stale exports beside it is a bug, not a fact of life.

⚠️ **Extracting text from a PDF needs `uv run --with pdfplumber`** unless `pdftotext` or `pypdf` is installed system-wide. Neither was, in the source repo.

⚠️ **Do not keep `.txt` copies as a parallel source of truth.** In the source repo two archived `.txt` resumes were still being read as current nine days after the PDF had been regenerated with a new role in it. **The Google Docs and the live PDFs are canonical; everything else is a derivative.**
