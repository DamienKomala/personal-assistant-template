# {{FIRST_NAME}}'s Email Writing Style — Reference from Sent Mail

**The evidence base for `../Prompts/reply-tone.md`.** That file states the rules; this one holds the samples the rules were derived from.

---

## ⚙️ Fill this in first — it is the highest-leverage file in the template

🔴 **Paste two or three of {{FIRST_NAME}}'s own sent emails below, then write down what they reveal.** A voice guide derived from real sent mail beats one written from adjectives, every time — and `reply-tone.md` is only as good as this file.

**Pick samples that differ:** one substantive business/project update, one quick logistics reply, one reply to a stranger. **The three read very differently and the difference is the voice.**

⚠️ **Watch for a sampling trap.** In the source repo the mailbox the assistant could read skewed heavily toward quick problem-solving — recruiter logistics, customer service — and **almost none of it was real business correspondence.** The terse pattern that produced was documented and then explicitly demoted, because it was an artifact of *which mailbox was connected*, not of how the person writes. **If the accessible mailbox is not where the substantive writing happens, say so here and get samples from {{FIRST_NAME}} directly.**

---

## Sample 1 — substantive business correspondence

> *(paste here)*

**What it reveals:**

- *(structure — is it status → rationale → plan → dependency, or something else?)*
- *(does it explain reasoning, or just state conclusions?)*
- *(does it volunteer unprompted help?)*
- *(does it track stakeholders who aren't on the thread?)*
- *(greeting and sign-off — verbatim)*

## Sample 2 — quick logistics reply

> *(paste here)*

**What it reveals:**

- *(length — how short is short?)*
- *(greeting and sign-off, or neither?)*

## Sample 3 — first contact with a stranger

> *(paste here)*

**What it reveals:**

- *(how much warmth survives when there's no relationship?)*

---

## Plain-text sign-off block

*(As it appears in {{FIRST_NAME}}'s actual sent mail — this is a record, not the signature. The signature is `../Data/signature.html` and it is installed in the client, not appended to drafts.)*

```
{{FULL_NAME}}
{{CURRENT_TITLE}}
{{PHONE}} | {{SITE_URL}} | {{EMAIL}}
```

## Signature

🔴 **Do NOT append a signature to a drafted email.** The Gmail connector strips every `<img>` on save, so a drafted signature is always image-less and arrives broken. **Both `/emailjobsearch` and `/emailreply` draft without one.** Full reasoning: [../Data/signature.md](../Data/signature.md).

## Drafting guidance

**Use [`../Prompts/reply-tone.md`](../Prompts/reply-tone.md).** Everything above is evidence; that file is the instruction.
