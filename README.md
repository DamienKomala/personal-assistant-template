# Personal Assistant — Job Search Template

A **Claude Code job-search assistant**, packaged as a template. It mines a Gmail inbox for real opportunities, drafts the replies, tracks every application in a markdown ledger, and projects that ledger onto a published dashboard and an optional ClickUp board.

**This is markdown configuration, not application code.** There is nothing to build. The skills read these files fresh on every run, so **editing a markdown file changes how the assistant behaves without touching any skill logic.**

🔴 **Start with [SETUP.md](SETUP.md).** Every `{{PLACEHOLDER}}` in this repo needs filling in, and several skills behave badly against a half-configured profile.

---

## What it does

**An active job search generates roughly 20 job-related emails a day, of which about 3–5 per 200 are real.** Everything here is built around separating that signal from the digest noise and then not losing track of it.

| Skill | What it does | Write boundary |
|---|---|---|
| **`/emailjobsearch`** | Sorts job mail into eight buckets, drafts replies, updates the ledger, rebuilds the dashboard. **Runs end to end in auto mode.** | Labels, stars and archives automatically *(scoped carve-out)*. **Never sends.** |
| **`/emailreply`** | Drafts a reply to one email, or sweeps for threads awaiting one. **The fast path.** | **`create_draft` only.** Nothing else. |
| **`/job-pipeline`** | Tracks stages, surfaces applications gone quiet, drafts follow-ups | Ledger writes; **Gmail untouched** |
| **`/tailor-application`** | Tailors resume and cover letter to one role, from real experience only | Writes to the assets directory |
| **`/job-search`** | Searches job boards, excluding anything already known | **Search-only** |
| **`/triage-inbox`** | Categorizes the *non-job* inbox | Draft-only |
| **`/manage-calendar`** | Reviews the calendar, proposes events | **Proposal-only** |
| **`/board`** *(optional)* | Projects the ledger onto a ClickUp board | `--pull` **never writes markdown** |
| **`/daily`** *(optional)* | Syncs `Daily.md` checkboxes to ClickUp and back | Writes **one character** per changed line |

🔴 **Nothing here can send email.** The Gmail connector has no send tool. **The design is draft-then-hand-over**, and every skill says so.

---

## 🖥️ Global installs — what a fresh Mac needs

**Nothing in this list is optional except where marked.** Versions are the ones this template was verified against.

### 1. Claude Code

```bash
npm install -g @anthropic-ai/claude-code
claude --version    # verified against 2.1.x
```

### 2. Node.js — required

**The dashboard build, the ClickUp sync and the daily sync are all ESM `.mjs` scripts.**

```bash
brew install node
node --version      # verified against v24.x; anything ≥ 18 should work
```

✅ **Zero npm dependencies.** All four scripts use only the Node standard library, so **there is no `npm install` step and no `node_modules` in this repo.** That is deliberate — it is what makes a machine move painless.

### 3. Python 3 + `uv` — required for the document skills and the draft tool

```bash
brew install python@3.13
curl -LsSf https://astral.sh/uv/install.sh | sh
python3 --version   # verified against 3.13
uv --version
```

⚠️ **`uv` matters more than it looks.** **Extracting text from a PDF resume needs `uv run --with pdfplumber`** — `pdftotext` and `pypdf` are not installed by default on macOS, and `/tailor-application` reads the live resume PDF as its base document.

### 4. Global Claude skills — required

**Install to `~/.claude/skills/` so every project can reach them.**

| Skill | Source | Used by |
|---|---|---|
| **`docx`** | [`anthropics/skills`](https://github.com/anthropics/skills) | `/tailor-application` — writes `.docx` exports |
| **`pdf`** | [`anthropics/skills`](https://github.com/anthropics/skills) | `/tailor-application` — reads the base resume, writes `.pdf` exports |
| **`humanizer`** | community skill | `/tailor-application` — strips AI tells from cover letters |
| **`grammar-check`** | community skill (`pm-skills`) | Rung 3 of the line-editing ladder |

```bash
mkdir -p ~/.claude/skills
git clone https://github.com/anthropics/skills /tmp/anthropic-skills
cp -R /tmp/anthropic-skills/document-skills/docx ~/.claude/skills/
cp -R /tmp/anthropic-skills/document-skills/pdf  ~/.claude/skills/
```

**Or ask Claude Code to find and install them:** `/find-skills docx pdf humanizer grammar-check`.

🔴 **There is NO official Grammarly skill.** A package literally named `grammarly` exists with a low install count and an unknown author. **Do not install it.**

### 5. Claude plugin — required for the concision pass

**`elements-of-style`** (provides `writing-clearly-and-concisely`), from the `superpowers-marketplace`:

```
/plugin marketplace add obra/superpowers-marketplace
/plugin install elements-of-style@superpowers-marketplace
```

⚠️ **Its reference doc costs ~12K tokens on invoke** — the skills fire it for real outgoing prose only, never for commit messages or notes.

### 6. Optional but recommended

| Thing | Why |
|---|---|
| **`episodic-memory`** plugin (same marketplace) | Makes past sessions semantically searchable — **the *why* behind a rule this repo only records as a rule.** ⚠️ It ships without `node_modules` and needs a manual `npm install --omit=dev` in its cache directory after every upgrade, **and it fails silently when it doesn't**. |
| **`gh` CLI** (`brew install gh`) | Only if you back this repo up to GitHub |

### 7. Connectors — configured in claude.ai, not in this repo

**Settings → Connectors. OAuth; nothing is stored here.**

| Connector | Status | Notes |
|---|---|---|
| **Gmail** | 🔴 **Required.** | Drafts, labels, stars, archive, search. **No send tool** — that is a hard limit, and the whole design assumes it. **No `delete_draft` tool either** — see `Tools/README.md`. |
| **Google Calendar** | Recommended | Needed by `/manage-calendar`. ⚠️ **Also the only place an interview booked through a recruiter's scheduling page ever appears.** |
| **Google Drive** | Optional | Only if the resume lives in Google Docs |

**Verify each is live before the first sweep** — `list_labels` for Gmail, `list_calendars` for Calendar. **Connections drop.**

### 8. ClickUp — fully optional

**Free Forever plan.** Enables `/board` and `/daily` — **the half that lets tasks be ticked off on a phone.** **Nothing else in the repo depends on it**, and both skills skip cleanly when it isn't configured.

**Setup, the three permanent guardrails, and what each is defending against: [Tools/README.md](Tools/README.md).**

---

## Repo structure

```
SETUP.md                 🔴 START HERE — the fill-in checklist
CLAUDE.md                Claude Code entry point — personality, skills, guardrails, file map
README.md                This file
Daily.md                 The working to-do list

Data/                    Facts about the person (profile, criteria, links, signature, calendar)
Context/                 Domain rules (sender taxonomy, triage rules, voice samples, proof points)
Prompts/                 soul.md (how Claude talks to you) + reply-tone.md (how your email sounds)
Job Search/              The ledger — four files, one ledger
Dashboards/              Published Artifact + build script + the shared parser
Tools/                   Executables that do what markdown cannot
                         — including personalize.mjs, which fills in the template
.claude/skills/          The nine skills
```

**Markdown is the substrate; `Dashboards/` and `Tools/` are the exceptions** — and **both are views or actuators over the markdown, never a source of truth.** 🔴 **If the dashboard, the board and `Job Search/pipeline.md` disagree, the ledger is right and the other two are stale.**

### The ledger — four files

| File | What's in it | When to read it |
|---|---|---|
| `pipeline.md` | Active conversations, live applications, gig/contract, **and the Notes section** | **Every sweep, whole** |
| `pipeline-dossiers.md` | Long-form history behind live rows | **Never in a sweep** |
| `pipeline-leads.md` | The un-worked backlog | **Only when working leads** — a sweep appends |
| `pipeline-archive.md` | Closed rows and sweep narratives | **Never whole — `grep` it** |

🔴 **Read `pipeline.md` § Notes once before doing any ledger work.** It documents every silent-failure mode this toolchain has produced — **a column shift that raised the row count while corrupting 112 rows, a build that reported success while writing nothing, a migration stub that double-counted, a table heading that silently swallowed fifteen leads.** **That section is the single most valuable thing in this template.**

---

## The dashboard round trip

The published Artifact is **writable**: its **Live rows** table has a *"Your call"* column, and **Save to artifact** republishes the page with those proposals baked in.

```
pipeline.md ──build-data.mjs──▶ job-tracker.html ──publish──▶ Artifact
     ▲                                                          │
     │  applied BY HAND, after the report                       │ you edit
     └──────── dashboard-overrides.mjs ◀── OVERRIDES block ◀─────┘ in the browser
```

🔴 **Proposals are not the ledger and never write to it.** Reconciling is deliberate and manual — **the same rule `clickup-sync --pull` follows.**

🔴 **ONE PARSER, ONE ROW KEY, THREE CONSUMERS.** `Dashboards/lib/ledger.mjs` is shared by the dashboard, the board and the overrides round-trip. **Never fork either** — a second parser is how the applications table silently died.

---

## Security

- 🔴 **No credentials live in this repo.** Tokens go in `~/.config/clickup-sync/` and `~/.config/gmail-draft-tool/`, both mode `600`. `.gitignore` carries belt-and-braces rules in case one is dropped here by mistake.
- 🔴 **Every write-capable action requires explicit confirmation** — sending email, calendar writes, deletes, unsubscribes — **with exactly one documented exception**, the `/emailjobsearch` label/star/archive carve-out. **All four of its mutations are recoverable, and every one is listed in the skill's output so it can be undone.**
- 🔴 **Git is two-mode.** On the owner's own machine the assistant **makes file edits and does not commit** — concurrent sessions forked the history twice in three days in the source repo and one collision destroyed live ledger rows. **A cloud or mobile session commits to a dated branch and never to `main`.** Full rule in `CLAUDE.md`.

---

## License

**[CC0 1.0 Universal](LICENSE)** — public domain dedication. Take it, fork it, strip it for parts. No attribution required.

⚠️ **The hard-won notes throughout this repo describe real failures from the job search this was extracted from.** They are the reason it is worth cloning rather than rebuilding — **but they are observations about a toolchain at a point in time, not guarantees.** Verify a connector behaviour before depending on it; **they change.**
