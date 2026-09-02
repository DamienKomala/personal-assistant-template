# Tools

**Executables that do what markdown cannot.** Every one of them is a *view* or an *actuator* over the ledger — 🔴 **none of them is a source of truth.**

🔴 **Credentials never enter this repo.** They live under `~/.config/`, and `.gitignore` carries belt-and-braces rules in case one is ever dropped here by mistake.

| Tool | What it does | Write boundary |
|---|---|---|
| `Tools/personalize.mjs` | **Fills in the `{{PLACEHOLDER}}` tokens across the template.** One-time, at setup | `--list` and `--dry` write nothing |
| `Dashboards/build-data.mjs` | Re-extracts the ledger into `job-tracker.html`. Run before republishing the Artifact | Writes only the dashboard |
| `Tools/clickup-sync.mjs` | Projects the ledger onto a ClickUp board | 🔴 `--pull` **never writes markdown** |
| `Tools/daily-sync.mjs` | Two-way sync between `Daily.md` checkboxes and a ClickUp list | ✅ `--pull` writes **one character per line** |
| `Tools/dashboard-overrides.mjs` | Reads stage proposals made *on* the published dashboard | 🔴 **Never writes markdown** |
| `Tools/gmail_drafts.py` | Deletes a Gmail draft **only** when it can prove a matching message already went out | Dry run by default; `--delete` required |

🔴 **ONE PARSER, ONE ROW KEY, THREE CONSUMERS.** `Dashboards/lib/ledger.mjs` is shared by the dashboard, the ClickUp board and the overrides round-trip — **it owns both the markdown parsing and the stable row key.** 🔴 **Never fork either.** **A second parser is how the applications table silently died in the source repo; a forked key is how two projections stop pointing at the same row.**

---

## `personalize.mjs` — fill in the template

```bash
node Tools/personalize.mjs --list          # what is still unfilled, and where
cp Tools/personalize.example.json Tools/personalize.json   # then fill it in
node Tools/personalize.mjs --dry           # what WOULD change. Writes nothing.
node Tools/personalize.mjs                 # apply
```

**77 distinct tokens across 27 files**, so this is not a job for `sed`.

✅ **An empty value in `personalize.json` is SKIPPED, not written as a blank** — so setup can be done in passes as the profile firms up.

🔴 **TWO TOKENS ARE PROTECTED AND THE TOOL REFUSES TO SET THEM:**

- **`{{N}}` in `job-tracker.html` is a RUNTIME token** — **the page's own JavaScript substitutes the live row count into it on every render.** Replacing it freezes the count forever.
- **`{{PLACEHOLDER}}`** is prose: it is how `SETUP.md` and `CLAUDE.md` refer to placeholders in general.

⚠️ **`SETUP.md` is skipped deliberately.** Its tables list each token beside an example value, **so substituting there would turn `{{FULL_NAME}} | Jane Rivera` into `Jane Rivera | Jane Rivera`** and destroy the instructions for the next reader.

⚠️ **One-way.** Idempotent — a second run finds nothing left to do — **but it does not un-personalize.** **Run `--dry` first, and have the repo in git.**

🔴 **`Tools/personalize.json` is gitignored, and that is deliberate.** **It is not a credential — but it holds a real name, email, phone number and salary expectations**, and a repo built from this template is public by default. **The `.example` file stays tracked; your filled-in copy does not.**

---

## The dashboard

```bash
node Dashboards/build-data.mjs          # build + inject
node Dashboards/build-data.mjs --dry    # print a summary, write nothing
```

Then **republish `Dashboards/job-tracker.html` to its existing Artifact URL.** 🔴 **Same file path = same URL.** A different path mints a new one and orphans the link {{FIRST_NAME}} already has.

### Three injected blocks, and only one of them is generated

| Block | Owner |
|---|---|
| `PIPELINE_DATA` | **Generated from the ledger. Overwritten every build.** |
| `OVERRIDES` | **Written by the PUBLISHED PAGE** when {{FIRST_NAME}} edits a row in the browser. 🔴 **PRESERVED ACROSS BUILDS, NEVER GENERATED.** Wiping it discards unreconciled browser edits. |
| `TPL` | **The page's own source**, so it can republish itself. |

### Why the page carries a copy of itself

The `artifact` capability's `publish()` wants a **complete replacement document** and explicitly forbids serializing the live DOM (it contains viewer session state and injected runtime scripts). **So the page keeps a tokenized copy of itself and re-renders from that** — the standard quine substitution:

```js
page = TPL.replace("%%DATA%%", data)
          .replace("%%OVERRIDES%%", overrides)
          .replace("%%TPL%%", enc(TPL))     // ← LAST, and it is not a typo
```

**TPL keeps its own `%%TPL%%` token intact inside the copy it emits, which is what stops the substitution recursing.** **DATA and OVERRIDES must be replaced BEFORE TPL**, or their tokens inside the embedded copy get eaten instead.

⚠️ **The file on disk is a FRAGMENT (no doctype) because the Artifact tool wraps it at publish time. TPL is the WRAPPED form**, because `publish()` from inside the page gets no such favour and rejects `invalid_content` without a doctype. **That asymmetry is deliberate; don't "fix" it.**

### 🔴 The build once ran as a no-op for three days and reported success every time

It wrote a byte-identical file on every run while printing `injected 596 rows`. **Three sweeps each reported republishing a fresh dashboard; all three republished the same stale build.**

**The cause was one word: `indexOf`.** The template block sits *earlier* in the file than the real blocks, **so `indexOf` found the TEMPLATE's markers** and injected each rebuild into the placeholder — which step 1 then re-tokenized straight back out. **Round trip, same bytes, cheerful success line.**

✅ **The fix is TWO marker strategies, not one:**

- **`"last"` for DATA and OVERRIDES** — the real blocks always sit *after* the template.
- **`"outer"` for the `__TPL__` block — FIRST open, LAST close.** 🔴 **This is the half that was missed on the first attempt.** With `lastIndexOf` on both ends, the opening tag resolved to the *innermost* nested template while the closing tag resolved to the outermost — **so each build wrapped another layer on instead of replacing it. Three runs took the page from 634KB to 1,948KB.**

✅ **The test that proves it — build three times and the hash must stop changing:**

```bash
node Dashboards/build-data.mjs && A=$(md5 -q Dashboards/job-tracker.html)
node Dashboards/build-data.mjs && B=$(md5 -q Dashboards/job-tracker.html)
node Dashboards/build-data.mjs && C=$(md5 -q Dashboards/job-tracker.html)
[ "$A" = "$B" ] && [ "$B" = "$C" ] && echo IDEMPOTENT
```

⚠️ **`git status` is the cheap version.** If `job-tracker.html` is not listed as modified after a sweep that added rows, **the build did not run.**

🔴 **GENERALISE IT: three separate silent-corruption bugs in this toolchain shared one shape — a step that reports success from its OWN intermediate state rather than from what landed.** **Verify the artefact, never the log line.**

### Checks that actually work

- ⚠️ **Read the *"skipped tables"* line every run.** A table only counts if its heading is one `SECTION_KIND` maps. **A new `##` heading of its own is silently skipped** — that cost fifteen leads once.
- ⚠️ **Verify the STAGE HISTOGRAM (`by stage:`), not just the row total.** **A block of `Unrecorded` means a table is column-shifted, and a column shift does not lose rows — it corrupts them, so the total can go UP.**
- ⚠️ **After a migration, `by section` must show the live section DROP by exactly the number migrated and `closed` RISE by the same number, with the TOTAL UNCHANGED.** **A total that goes up means the migration duplicated** — the stub's pointer is in the wrong column.

---

## The dashboard round trip

The published Artifact is **writable**. Its **Live rows** table has a *"Your call"* column — a stage dropdown and a note per row — and **Save to artifact** republishes the page with those proposals baked into the `OVERRIDES` block.

```
pipeline.md ──build-data.mjs──▶ job-tracker.html ──publish──▶ Artifact
     ▲                                                          │
     │  applied BY HAND, after the report                       │ edited
     └──────── dashboard-overrides.mjs ◀── OVERRIDES block ◀─────┘ in the browser
```

```bash
node Tools/dashboard-overrides.mjs                    # read the local build
node Tools/dashboard-overrides.mjs <fetched.html>     # read a copy fetched from the live artifact — usually what you want
node Tools/dashboard-overrides.mjs --json             # machine-readable
```

🔴 **Proposals are NOT the ledger and never write to it.** **Reconciling is deliberate and manual**, the same rule `clickup-sync --pull` follows. **Apply what you agree with by hand, then rebuild and push.**

🔴 **Three things that are NOT possible, so nobody re-tries them:**

1. **The page cannot talk to ClickUp and never will** — the artifact CSP blocks external hosts, and the one capability that crosses the network reaches first-party connectors only.
2. **The page cannot write to the filesystem.** Round-tripping through the ledger is the design, not a compromise.
3. **The page cannot serialize its own live DOM to republish** — hence the tokenized copy above.

---

## `clickup-sync.mjs` — project the ledger onto a ClickUp board

**Optional.** Nothing else in the repo depends on it.

```bash
node Tools/clickup-sync.mjs --dry       # validate + report. No token, no network, no writes. START HERE, ALWAYS.
node Tools/clickup-sync.mjs --push      # upsert every row
node Tools/clickup-sync.mjs --pull      # what changed on the board that the ledger doesn't know about?
node Tools/clickup-sync.mjs --capture "chase X on Y" [--due YYYY-MM-DD]
node Tools/clickup-sync.mjs --clear-dates
```

### One-time setup

**Steps 1–3 need a ClickUp account and cannot be automated from here.**

1. **Create a free workspace** at [clickup.com](https://clickup.com) — **Free Forever, unlimited tasks, no card.**
2. **Build the Space.** One Space named exactly **`Job Search`**, containing these eight Lists:

   `Conversations` · `Applications` · `Off-criteria` · `Gig / Contract` · `Other` · `Leads` · `Archive` · `Daily`

   Then set the Space's statuses to exactly these eleven, with **`Closed` as the *done* type**:

   `Lead` · `Applied` · `Screening` · `Interviewing` · `Offer` · `Replied` · `Needs you` · `Off-criteria` · `Paused` · `Paid` · `Closed`

   ⚠️ **ClickUp statuses are UI-only — the API cannot create them.** The script checks all eleven exist and **refuses to run if any is missing, naming the ones to add.**

3. **Get the token** — *Settings → Apps → API Token → Generate*. It starts `pk_` and never expires. **Put it where the script looks, outside this repo:**

   ```bash
   mkdir -p ~/.config/clickup-sync
   printf '%s' 'pk_XXXXXXXX' > ~/.config/clickup-sync/token
   chmod 600 ~/.config/clickup-sync/token
   ```

   *(Or export `CLICKUP_TOKEN` in the shell.)*

4. **Run `--dry` first.** Then `--push`. **`Tools/clickup-config.json` is created on the first push** with the team, space and list ids resolved **by name** and cached — **you never fill it in by hand.**

### 🔴 Three permanent rules

1. **NEVER CREATE A CLICKUP CUSTOM FIELD.** The free plan allows **60 uses for the LIFETIME of the workspace, and they never reset** — about twelve tasks, then permanently dead. **Everything here uses native statuses, tags, priority and dates, all unlimited. There is no code path that writes one; do not add it.**
2. **NEVER USE CLICKUP'S MCP SERVER** (`mcp.clickup.com`). **50 calls per 24 hours on the free plan — one sweep exhausts it.** **The REST API on the same plan allows 100/minute.**
3. **NEVER PUT `/` IN A TAG NAME.** ClickUp's tag endpoints **404 on a slash even URL-encoded**, so a slash tag can be created but **never removed by any endpoint.** Use `.` — `sec.conversation`, `mark.urgent`.

### What `--dry` checks, and why each check exists

| Check | Defending against |
|---|---|
| **Pipe count per row vs its separator** | The column-shift corruption. **A row count cannot detect it — the total goes UP.** |
| **Stage inside the canonical enum** | A `Stage` cell holding narrative instead of a stage |
| **All eleven ClickUp statuses present** | A push that half-succeeds and leaves the board inconsistent |

**All three are real ledger bugs. Fix the ledger — do not work around the check.**

### `--force`, and why a normal push will not fix the board

**A plain `--push` skips rows whose hash is unchanged — deliberately, so a sweep never stomps what {{FIRST_NAME}} changed on a phone.** ⚠️ **So a board-side edit survives a normal push.**

**`--push --force` overwrites every row.** ⚠️ **It discards board-side edits — run `--pull` first and read it.**

### Identity, and why there is no id column

**The row key is computed by `assignKeys` in `Dashboards/lib/ledger.mjs` and cached in `Tools/clickup-map.json`.** 🔴 **The same key is stamped into the dashboard payload**, which is what makes the override round-trip exact: an override names a key, that key names a ClickUp task, and it names exactly one ledger row.

⚠️ **Every migration leaves an ORPHAN task behind.** The script **creates and updates but never deletes** — deliberately, so nothing can destroy work. **Orphans accumulate and must be cleared by hand in the ClickUp UI.** Task ids are in `clickup-map.json`.

### 🔴 The board is dateless and unassigned

In the source repo `start_date` was the applied/found date, and **106 of 157 due dates were DERIVED from that same receipt date** (applied +14d, replied +7d, needs-you +2d). **An invented deadline computed from a receipt is not a deadline, and a column that is two-thirds fabricated teaches you to ignore all of it.** All tasks were cleared with `--clear-dates` and `dueOf()` now returns null.

⚠️ **THIS REMOVES THE ONLY REMINDER MECHANISM. ClickUp notifies a due date solely to a task's ASSIGNEE**, so with nothing dated there is nothing to fire — **and assignment is off too, or *My Tasks* would hold every row and none could ever come due.**

✅ **Nothing is lost:** re-check dates live in `pipeline.md` as `⏰ Re-check <date>` prose, which is what a sweep reads.

🔴 **DO NOT RE-ADD DATES BECAUSE THE COLUMN LOOKS EMPTY.** **If they are ever wanted back, restore ONLY the explicit `⏰` branch of `dueOf()`** — the derived ones are commented out with the reasoning and must stay that way.

---

## `daily-sync.mjs` — two-way sync between `Daily.md` and the ClickUp `Daily` list

```bash
node Tools/daily-sync.mjs --dry       # parse + report. No token, no network, no writes.
node Tools/daily-sync.mjs --anchor    # stamp anchors into Daily.md and nothing else
node Tools/daily-sync.mjs --push      # Daily.md -> ClickUp
node Tools/daily-sync.mjs --pull      # ClickUp -> Daily.md   ← the half that makes it worth having
```

**Same token, same workspace, same setup as above.** ✅ **A normal day is `--pull` then `--push`.**

### 🔴 This is the ONE `--pull` in the repo that writes markdown

**`clickup-sync.mjs --pull` never writes markdown, because it projects the LEDGER — a source of truth a board must not edit.** **`Daily.md` is the opposite case: a to-do list holding no state anything else reads. So the loop is safe HERE AND NOWHERE ELSE.**

✅ **Even then it writes ONE CHARACTER per changed line: `[ ]` → `[x]`.** **It never edits an item's text, never reorders, never deletes, never touches a line without a matching anchor.**

### 🔴 The merge is monotonic in both directions, which is why it needs no clock

**`--pull` only ticks. `--push` only closes.** **Done is absorbing in both directions, so the two sides can never fight and there is no race to lose work to.** **No timestamps, no conflict resolution.**

**Un-ticking is a manual act on whichever side you mean it.** The other side is **reported** in the next run rather than silently overwritten.

### 🔴 Identity is an anchor, not a content hash

Every synced checkbox carries `<!--cu:xxxxxxxx-->` at the end of its line. **It renders as nothing and it is the item's identity.**

**It has to be an anchor because sweeps rewrite this file daily** — *"fifth day carried"* → *"sixth day carried"* — **and a hash would orphan the task every time the wording moved.** A tick coming back would then land on the wrong line or nowhere.

⚠️ **Carry the anchor forward when rewriting an item.** Drop it and the item re-syncs as a new task while the old one is reported as an orphan. **Nothing is lost; it is noise.**

### What it will not do

- **Never deletes a board task** — a missing anchor is *reported* as an orphan, because the usual cause is a sweep rewriting a line.
- **Never touches un-anchored tasks** — `--capture` items and anything added on the board by hand are invisible to it. **The pull report counts them so their presence is never a surprise.**
- **Never creates a custom field.** Same permanent rule as above.
- **Sets no dates.** **A date derived from when something was written is not a deadline.**

---

## `gmail_drafts.py` — delete drafts whose content was already sent

**The Gmail connector has no `delete_draft` tool.** This closes that gap **outside** the connector, by hitting the Gmail API directly.

```bash
uv run --with google-api-python-client --with google-auth-oauthlib Tools/gmail_drafts.py          # DRY RUN — reports verdicts, deletes nothing
uv run --with google-api-python-client --with google-auth-oauthlib Tools/gmail_drafts.py --delete # actually delete the proven duplicates
```

🔴 **It is BIASED TOWARD KEEPING, and it proved it:** on its first real run it **refused to delete three drafts a sweep was confident about**, scoring them 39–62% against their supposed sends. **A false positive costs a lost draft; a false negative costs one more manual deletion. The asymmetry is deliberate.**

🔴 **This does not make deleting drafts an automatic step in any skill.** **It is a tool {{FIRST_NAME}} runs, and clearing the folder stays a decision.**

### One-time setup

**Needs a Google account and cannot be automated from here.**

⚠️ **BEFORE ANYTHING: confirm a project is actually SELECTED** in the dropdown at the top of the Cloud console. **If it reads *Select a project*, every step below is silently inert.**

1. **Create a project** at [console.cloud.google.com](https://console.cloud.google.com/) — any name — **and select it.**
2. **Enable the Gmail API** — *APIs & Services → Library → Gmail API → Enable*. 🔴 **On the SAME project as the credential you are about to create.**
3. **Configure the consent screen** — now called **Google Auth Platform** (*APIs & Services → OAuth consent screen* redirects there). **A four-screen wizard:** App Information → **Audience: External** → Contact Information → Finish. ⚠️ ***Internal* is greyed out on a personal Google account. That is expected and is not the blocker.**
4. **Add yourself as a Test user** — ***Audience → Test users → Add users*** → your address → Save. ✅ **Leave publishing status on *Testing*.**
5. **Create the client** — ***Clients → Create client → Application type: Desktop app*** → Create → **Download JSON.**

   🔴 **IT MUST BE *DESKTOP APP*.** The script uses `InstalledAppFlow` with `run_local_server`, which requires a JSON whose top-level key is `"installed"`. **A *Web application* client produces `"web"` and fails with a `redirect_uri_mismatch` that looks nothing like the real cause.** ⚠️ **If a Web client already exists, don't try to fix it — create a second client of the correct type.**

6. **Put it where the script looks, outside this repo:**

   ```bash
   mkdir -p ~/.config/gmail-draft-tool
   mv ~/Downloads/client_secret_*.json ~/.config/gmail-draft-tool/credentials.json
   chmod 600 ~/.config/gmail-draft-tool/credentials.json
   ```

### 🔴 Three traps that cost fourteen days in the source repo

**Each one alone produces a different misleading error. Diagnose in this order:**

1. **NO TEST USERS** *(Audience → Test users is empty)* → consent dies with ***"Access blocked: … has not completed the Google verification process"*** **and no bypass link.**
2. **GMAIL API ENABLED ON THE WRONG PROJECT** → **consent SUCCEEDS and a token is written**, then the first API call returns **`403 accessNotConfigured`**. ⚠️ **Nastiest of the three, because auth working makes it look like a code fault.**
3. **A RED-HERRING BANNER** — *"Your app's OAuth configuration is incomplete… visit the Branding page."* ✅ **IGNORE IT.** It sits under *Publishing status* above a greyed-out *Publish app*, **so it is about PUBLISHING, which this tool must never do.**

🔴🔴 **DO NOT GO TO THE VERIFICATION CENTER.** `console.cloud.google.com/auth/verification` sits in the same left nav as *Audience* and *Clients*, **so it reads as part of the sequence. It is not a step at all.**

⚠️ **It offers NO option to verify, and that is CORRECT** — a Testing-mode app has nothing to submit, so the page is inert by design. 🔴 **The natural reading of an inert page is "I am blocked here", and the natural fix — clicking *Publish app* — is the one thing that must NOT be done.** **Publishing is precisely what REMOVES the consent bypass and makes verification mandatory.**

✅ **Reaching that page is actually good news:** it doesn't exist until the wizard in step 3 is finished, **so seeing it means step 3 is done and only steps 4 and 5 remain.**

**How to tell the two blocked screens apart:**

| Screen | Meaning |
|---|---|
| *"Google hasn't verified this app"* **WITH** an *Advanced → Go to (unsafe)* link | ✅ **Expected and harmless.** Click through. It is your own OAuth client talking to your own mailbox. |
| *"Access blocked: … has not completed the Google verification process"* **with NO bypass** | 🔴 **Either you're not on the Test-user list, or the app was published.** **Both fixes are on the *Audience* page:** if *Publishing status* reads *In production*, click **Back to testing**; then add the account under **Test users**. |

**Deep links beat navigation here — the left nav is what misleads.** *(Substitute your project id.)*

| Step | Direct URL |
|---|---|
| Enable Gmail API | `console.cloud.google.com/apis/library/gmail.googleapis.com?project=<ID>` |
| Add the Test user | `console.cloud.google.com/auth/audience?project=<ID>` |
| Create the Desktop client | `console.cloud.google.com/auth/clients?project=<ID>` |
| ❌ **Never needed** | `console.cloud.google.com/auth/verification` |

⚠️ **ONE CAVEAT THE STEPS DO NOT MENTION, AND IT BITES ON DAY EIGHT:** while the consent screen sits in *Testing*, **Google expires the refresh token after ~7 days.** **The tool then reopens the browser for one click and carries on — nothing breaks and nothing is lost.** ✅ **For an occasional housekeeping tool that is the right trade**, which is why *Testing* stays the recommendation.

### How it decides, and why it is biased toward keeping

**For each draft it finds the candidate sent messages on the same thread and to the same recipient, then scores the draft body against each.** **It deletes only above a high similarity threshold**, and it reports every score so a refusal is legible rather than mysterious.

🔴 **Dry run by default. `--delete` is required and is never passed by a skill.**
