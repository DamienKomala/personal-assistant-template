# Draft Audit

**The Gmail connector cannot delete a draft.** Clearing stale ones is manual, or done with `Tools/gmail_drafts.py`. **This file holds the procedure and the two evidentiary corrections that make it necessary.**

---

## 🔴 The two corrections, and both were expensive

### 1. A draft that DISAPPEARS has usually been SENT, not lost

**Sending consumes the draft and it vanishes from `list_drafts`.** 🔴 **Its absence reads identically to "it never existed" — and misreading that once sent a recruiter the same email twice.**

✅ **The definitive check is `get_draft` on the draft id:**

| Result | Meaning |
|---|---|
| `labelIds: ["DRAFT"]` | **Still pending.** |
| `labelIds: ["SENT"]`, and the `messageId` has **changed** | 🔴 **Already sent.** The send consumed the draft and re-pointed the id at the sent message. |

⚠️ **`list_drafts` is not that check.** **Absence from it is a prompt to run `get_draft`, never a conclusion.**

✅ **Second confirmation, worth running when the answer matters: `in:sent to:<address>`.** It names the message, the timestamp and the thread.

### 2. An EMPTY `plaintextBody` does NOT mean the draft is empty

**One draft that listed with an empty body went out as a full three-paragraph follow-up minutes later.**

---

## 🔴 Before re-creating any draft, check `in:sent` on its thread

**The Drafts folder is not a to-do list and must never be reported as one.**

**Third-party mail clients (Spark, Airmail, and their family) rewrite a draft when they OPEN one** — new id, new copy — **and the send then leaves the original behind.** So a draft sitting in the folder is **at least as likely to be the residue of a completed send as a task waiting to happen.**

⭐ **The tell is the draft id prefix.** Connector drafts look like `r-…` / `r…` / `s:…`. A rewriting client's look like `draft-rewrite-…`.

**Thread state is the truth; the folder is an artifact of an editing habit.**

✅ **The durable fix is a habit change, not a tool change: read in the third-party client, SEND from Gmail web or Outlook.** The resend loop fires because sends originate in the rewriting client. ⚠️ **Residue can still accumulate if drafts are opened there, so don't.**

---

## Deleting a draft — the three paths, in order of preference

### 1. `Tools/gmail_drafts.py` — the real answer

**Hits the Gmail API directly and deletes a draft only when it can prove a matching message already went out on the same thread.** **Dry run by default; `--delete` required.**

🔴 **It is BIASED TOWARD KEEPING and proved it** — on its first run it refused three drafts a sweep was confident about, scoring them 39–62% against their supposed sends. **A false positive costs a lost draft; a false negative costs one more manual deletion.**

Setup and the OAuth traps: [`../Tools/README.md`](../Tools/README.md).

### 2. {{FIRST_NAME}} deletes it by hand

**Always available, always safe.** For anything the tool refuses, this is the answer.

### 3. `trash_thread` — 🔴 ONLY when the thread contains nothing but the draft

⚠️ **The general rule is: NEVER trash a draft's thread.** **A stale draft usually sits on a thread carrying real correspondence** — in the source repo one draft's thread held the recruiter's original phone-interview request, **the founding message of a live two-round process.** Trashing it would have destroyed that.

✅ **THE ONE EXCEPTION: when the thread contains NOTHING BUT THE DRAFT, `trash_thread` deletes it and destroys nothing else.** Proven once, on explicit authorisation.

🔴 **Conditions, all of them:**

- **{{FIRST_NAME}} says so in the moment.** Not a standing permission.
- **It is a trash, not a purge** — recoverable for 30 days.
- ⚠️ **Verifying "draft-only" is awkward.** `get_thread` returns *"The caller does not have permission"* on such a thread, **so read access is neither required nor evidence.** ✅ **Use `list_drafts` — it returns each draft's `threadId`.**

⚠️ **Orphan threads arise because `update_draft` has no reply-to parameter and rewriting a threaded draft moves it to a new thread.** 🔴 **That is a defect, not a technique — never create one to gain a delete path.**

### What does NOT work, so nobody re-tries it

- **`trash_message` with a draft id** → `Invalid id value`. **It fails safely — it does not hit the wrong message.**
- **`apply_sensitive_message_label`** needs a **message** id, **and the connector never exposes one for a draft.** `list_drafts` returns only a draft id; `search_threads` returns empty for `in:draft`; `get_thread` omits drafts from the thread.
- ⚠️ **Tool descriptions have changed to say *"to find the draft message ID, use tools like `list_drafts`"*, which reads like the gap closed. It has not** — that was re-tested twice in the source repo. **Do not re-test a third time unless a `delete_draft` tool actually appears.**

---

## Re-running the audit

1. **`list_drafts`** with `DRAFT_VIEW_FULL`. ⚠️ **The full listing can overflow the token cap — pass a `query` like `to:<address>`, or save it and `jq` the file.**
2. **For each draft, `get_draft` on its id.** `SENT` → already gone out; nothing to do.
3. **For anything still `DRAFT`, `get_thread` with `METADATA_ONLY`** on its `threadId`. 🔴 **Never settle this from a `search_threads` message list — it truncates silently and drops both sends and inbound mail.**
4. **Compare the draft's creation time against the latest `SENT` message on that thread.** **A draft created just before a send is RESIDUE — report it as residue, not as work outstanding.**
5. **Also check `in:sent to:<address>`** — **a reply sometimes starts a new thread instead of threading**, so the thread check alone under-reports.
6. **Record the verdict per draft below.** Then run `gmail_drafts.py` (dry first), and hand the refusals to {{FIRST_NAME}}.

---

## Verdicts

| Draft id | To | Subject | Verdict | Evidence |
|---|---|---|---|---|

*(No audit has been run against this repo yet.)*
