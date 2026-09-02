# Setup

**Work top to bottom.** Steps 1–4 are required; everything after is optional and can be added later.

⚠️ **Don't run a sweep before step 4 is done.** `/emailjobsearch` reads the criteria file to decide what is real, so **against an unfilled `job-criteria.md` it will bucket almost everything as unclassified** — and against a half-filled one it will bucket things *wrongly*, which is worse.

---

## 0. Prerequisites

**Install everything under [README.md § Global installs](README.md#-global-installs--what-a-fresh-mac-needs) first**, then verify:

```bash
node --version && python3 --version && uv --version && claude --version
ls ~/.claude/skills/docx ~/.claude/skills/pdf ~/.claude/skills/humanizer ~/.claude/skills/grammar-check
```

**And confirm the Gmail connector is live** — ask Claude to run `list_labels`. **Connections drop; a sweep against a dead connector fails in a confusing way.**

---

## 1. Get your own copy, under your own git history

🔴 **Clone it, then cut the cord.** You want the files, **not this template's commit history and not its `origin`** — otherwise your first `git push` aims at somebody else's repo.

```bash
git clone https://github.com/DamienKomala/personal-assistant-template ~/"Job Search Assistant"
cd ~/"Job Search Assistant"

rm -rf .git                                     # drop the template's history AND its remote
git init -b main && git add -A
git commit -m "Initial commit from template"
```

✅ **Git is worth having even if you never push it.** **It is what makes a ledger edit revertible**, and the ledger is the only thing here that can't be regenerated. **`node Tools/personalize.mjs` rewrites 27 files in one pass** — you want to be able to `git diff` that.

⚠️ **If you'd rather keep the history** so you can pull template updates later, **skip the `rm -rf .git`** and instead rename the remote so you never push to it by accident:

```bash
git remote rename origin template               # `git pull template main` for updates
git remote add origin <your-own-repo-url>
```

---

## 2. Fill in the placeholders

**Every `{{PLACEHOLDER}}` in the repo — there are 77 distinct ones across 27 files, so do it with the tool rather than by hand.**

```bash
node Tools/personalize.mjs --list          # what is still unfilled, and where

cp Tools/personalize.example.json Tools/personalize.json
$EDITOR Tools/personalize.json             # fill in what you know

node Tools/personalize.mjs --dry           # what WOULD change. Writes nothing.
node Tools/personalize.mjs                 # apply
```

✅ **An empty value is SKIPPED, not written as a blank** — so you can do this in passes as the profile firms up, and re-run `--list` to see what's left.

✅ **`Tools/personalize.json` is gitignored.** It is not a credential, **but it holds a real name, email, phone and salary expectations** — and a repo built from this template is public by default. **The `.example` stays tracked; your copy does not.**

🔴 **TWO TOKENS ARE PROTECTED AND THE TOOL REFUSES TO TOUCH THEM. Do not replace them by hand either:**

- **`{{N}}` in `Dashboards/job-tracker.html`** is a **RUNTIME** token. **The page's own JavaScript substitutes the live row count into it on every render** — replacing it freezes the count forever.
- **`{{PLACEHOLDER}}`** is prose: it is how `SETUP.md` and `CLAUDE.md` refer to placeholders *in general*.

⚠️ **`SETUP.md` itself is skipped deliberately.** Its tables list each token beside an example value, **so substituting here would turn `{{FULL_NAME}} | Jane Rivera` into `Jane Rivera | Jane Rivera`** and destroy the instructions for anyone who re-reads them.

⚠️ **The tool is one-way.** It's idempotent — a second run finds nothing left to do — **but it does not un-personalize.** **Run `--dry` first, and have the repo in git** (step 1) before running it for real.

### The identity set — appears everywhere

| Placeholder | Example |
|---|---|
| `{{FULL_NAME}}` | `Jane Rivera` |
| `{{FIRST_NAME}}` | `Jane` |
| `{{EMAIL}}` | the **working Gmail address** the connector is attached to |
| `{{PHONE}}` · `{{PHONE_TEL}}` | `(555) 123-4567` · `+15551234567` |
| `{{CITY_STATE}}` · `{{METRO}}` | `Austin, TX` · `greater Austin` |
| `{{TIMEZONE}}` | `Central Time (Austin)` |
| `{{CURRENT_TITLE}}` | the title that goes in the signature |
| `{{ASSETS_DIR}}` | where resumes live — **outside this repo**, e.g. `~/Jobs` |

### Links

`{{PORTFOLIO_URL}}` · `{{SITE_URL}}` · `{{LINKEDIN_URL}}` · `{{HEADSHOT_URL}}` · `{{RESUME_DOC_URL}}` · `{{IMPACT_DOC_URL}}` · `{{RESUME_PDF}}` · `{{RESUME_DOCX}}`

🔴 **Verify every link before the first sweep.** A dead portfolio link in a recruiter reply is worse than no link.

### Voice

`{{SIGNOFF}}` — the default sign-off · `{{SIGNOFF_NEUTRAL}}` — the fallback when there is no opportunity on the table.

🔴 **Pick one of each and hold it.** Substituting "Best regards" for "Best" is not a change — **it is the same reflex in a longer coat.**

### Criteria — the ones that decide behaviour

`{{TARGET_TITLE_*}}` · `{{ADJACENT_TITLES}}` · `{{NO_FIT_*}}` · `{{YEARS}}` · `{{REMOTE_POLICY}}` · `{{RELOCATION_POLICY}}` · `{{TIER1_RANGE}}` · `{{TIER2_RANGE}}` · `{{TIER3_CEILING}}` · `{{GOAL}}` · `{{DREAM}}` · `{{STEP_UP}}` · `{{ASK_RANGE}}` · `{{LABEL_*}}` · `{{INDUSTRIES}}` · `{{PREFERRED_WORK}}` · `{{DISPREFERRED_WORK}}` · `{{GIG_POLICY}}`

---

## 3. Write the four files that carry the actual content

**Placeholders are mechanical. These four take real thought, and they are what makes the difference between a useful assistant and a generic one.**

### `Data/me.md` — the fact base 🔴

**Every date, employer, title, tool and metric that will ever appear on a tailored resume.** `/tailor-application` may only reorder and reweight what is in this file — **it may never invent.**

⚠️ **Keep it in sync with the live resume PDF.** In the source repo it fell nine days behind and was **missing a current role** — and the tailoring guardrail ("use only what is in `me.md`") **would have quietly dropped that job from a resume and reported clean.** The skill now diffs the two and stops on a disagreement, **but that check only works if you keep this file current.**

### `Data/job-criteria.md` — the filter 🔴

**Target titles, location rules, hard no-fits, employer exclusions, seniority floor, three compensation tiers, and the `Career/*` role taxonomy.**

✅ **Edit this one file to retune every job skill at once.** None of them hardcode these rules.

**Read the "goal / ask / step-up line" section carefully before filling in the numbers.** It separates three figures that are easy to collapse into one — **and collapsing them makes every below-band role get reported wrong.**

### `Context/mail.md` — voice samples ⭐

**Paste two or three of your own sent emails and write down what they reveal.** **A voice guide derived from real sent mail beats one written from adjectives**, and `Prompts/reply-tone.md` is only as good as this file.

⚠️ **Watch for a sampling trap.** If the mailbox the connector can read isn't where the substantive writing happens, **say so in the file and get samples directly** — in the source repo the terse pattern that got documented was an artifact of *which mailbox was connected*, not of how the person writes.

### `Prompts/soul.md` — how the assistant talks to you

**Pure preference, and the first file worth rewriting.** The default is opinionated and blunt. **Some people want a calm formal collaborator instead. Both are fine — what matters is that it is deliberate.**

🔴 **Whatever you write there governs conversation only.** Drafted email takes its voice from `reply-tone.md`, and the skills say so explicitly.

---

## 4. Create the Gmail labels

**`/emailjobsearch` applies exactly one `Career/*` label per real opportunity.** Create the labels named in `Data/job-criteria.md` — either by hand in Gmail settings, or by asking Claude to `create_label` each one.

**Also create a parent `Jobs` label**, which is what rejections and mined digests get filed under.

⚠️ **Confirm IDs with `list_labels` on every run rather than recording them.** **A stale ID applied automatically files a thread somewhere nobody will look for it.**

---

## 4b. Optional — quiet the permission prompts

```bash
cp .claude/settings.local.json.example .claude/settings.local.json
```

It allowlists the **read-only and idempotent** commands the job skills run constantly — `build-data.mjs`, the `--dry` and `--pull` modes, and read-only git — **so they stop prompting.**

🔴 **Nothing in it grants a write to email, the calendar, or git.** **Read it before copying it**, and add to it only commands you'd approve every time anyway.

---

## 5. First run — in this order

```
/emailjobsearch
```

**It will read everything, classify the last 14 days, and write the first rows.** **Read its output closely** — the first sweep is where the sender taxonomy gets its real entries.

⚠️ **Expect a large "unclassified" list on run one.** That is correct, not a failure. **Every unclassified sender is a line to add to `Context/job-sources.md`**, and the sweep writes most of them back automatically. **Run two will be dramatically quieter.**

Then:

```bash
node Dashboards/build-data.mjs
```

**Then publish `Dashboards/job-tracker.html` as an Artifact** and **keep the URL** — republishing the same file path updates the same page. 🔴 **A different path mints a new URL and orphans the old one.**

---

## 6. Optional — ClickUp

**Only if you want to tick tasks off on a phone.** Full setup, and the three permanent guardrails, in [Tools/README.md](Tools/README.md).

```bash
node Tools/clickup-sync.mjs --dry     # no token, no network, no writes
node Tools/clickup-sync.mjs --push
node Tools/daily-sync.mjs --push
```

🔴 **Three rules that must never be undone:** never create a ClickUp custom field *(60 uses for the workspace **lifetime**, never reset)* · never use ClickUp's MCP server *(50 calls/24h on free — one sweep exhausts it)* · never put `/` in a tag name *(the endpoint 404s on a slash, so the tag can be created but never removed)*.

---

## 7. Optional — the Gmail draft-delete tool

**Only worth doing once the Drafts folder starts accumulating.** The OAuth setup has **three traps that cost fourteen days in the source repo**, all written up in [Tools/README.md](Tools/README.md).

⚠️ **Read the trap list before starting, not after getting stuck.** The most expensive one is a page in the Cloud console's left nav that **looks like a required step and is not a step at all.**

---

## 8. Decide the git mode

**`CLAUDE.md` ships with a two-mode git rule:** on your own machine the assistant **makes file edits and does not commit**; a cloud or mobile session commits to a dated branch and never to `main`.

🔴 **The rule exists because concurrent sessions forked the history twice in three days in the source repo, and one collision destroyed live ledger rows** that had to be rebuilt from the published dashboard.

✅ **If you will only ever run one session at a time, you can relax it** — edit the table in `CLAUDE.md` § Guardrails. **But read the note above that table first**; the failure was silent and expensive, and it was not caused by anything exotic.

---

## What to expect in week one

- **Run one is noisy.** Large unclassified list, several senders you have to bucket by hand. **Normal.**
- **Run two is quiet**, because the taxonomy learned.
- ⚠️ **Prune `Daily.md` aggressively from day one.** Anything untouched for two weeks wasn't real, **and a to-do list nobody prunes is a guilt generator.**
- ⚠️ **Watch `pipeline.md`'s size.** **When a `Next action` cell passes ~1,200 characters, move the history to `pipeline-dossiers.md`.** In the source repo this file twice grew past the read cap — at which point the step that says "read the ledger" **became silently impossible.**
- 🔴 **Read `pipeline.md` § Notes once, properly.** It is the accumulated failure log of this toolchain, and every entry in it is something that broke silently and reported success.
