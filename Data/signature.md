# Email Signature

**Canonical markup: [signature.html](signature.html).** Open that file in a browser and copy from the rendered page; **it is the source, the mail client is a copy.** This file holds the reasoning.

---

## 🔴 The signature is NOT appended to drafts. It is installed in the mail client.

**This reverses the obvious design, and the reason is mechanical rather than stylistic.**

🔴 **The Gmail connector strips EVERY `<img>` tag on save.** Proven in the source repo in a single controlled draft: a remote `src`, a `cid:` inline attachment and a `data:` URI were all sent together, and **all three were gone from the saved draft.**

✅ **So an appended signature is always image-less**, and it arrives as empty `<a></a>` shells beside a dangling border — **which reads as broken rather than plain.** Appending one would only give {{FIRST_NAME}} something to delete before sending.

### Where it actually lives

| Client | How |
|---|---|
| **Gmail web** | Settings → General → Signature. **Insert into an existing draft with the compose toolbar's *Insert signature* control** — Gmail auto-inserts only on a FRESH compose, never when opening a prepared draft. Two clicks, full signature, images intact. |
| **Outlook / M365** | Settings → Mail → Compose and reply → Signature |
| **Third-party client (Spark, Airmail, …)** | Its own settings. ⚠️ **See the read-only rule below.** |

🔴 **BOTH `/emailjobsearch` AND `/emailreply` DRAFT WITHOUT A SIGNATURE, AND THEY AGREE ON THIS.** End the body at the sign-off line and stop.

## ⚠️ Third-party mail clients rewrite drafts

If {{FIRST_NAME}} opens a connector-written draft in Spark, Airmail, or a similar client, **the client rewrites the draft under a new id and leaves the original behind after the send.** In the source repo this produced a resend loop that sent one recruiter the same email **four times** — the single most damaging thing that mailbox ever did.

✅ **The fix that worked was a habit change, not a tool change: read in the third-party client, SEND from Gmail web or Outlook.** The loop fired because sends originated in the rewriting client. **A read-only client cannot cause it.**

⚠️ **Residue can still accumulate** — the client rewrites a draft when it *opens* one — **so don't open drafts there either.**

## Design notes

- **No hardcoded text colors.** Recipients read mail in light and dark themes; a hardcoded `color: #333` becomes invisible on a dark background. Let the client's default win, and use borders and spacing for structure instead.
- **Never let a `<p>` be the only thing holding an element in the document.** In the source repo the headshot was the one signature image whose sole parent was a `<p>`; the other three sat inside `<a href>` anchors. **The client stripped every `<p>`, and only the headshot vanished.** Anchoring it fixed it.
- **Lead with the link you most want clicked.** Put the portfolio first if that is the primary work-sample destination, and **keep `social.md` in the same order.**
- **A table with its own internal spacing is exempt from the `<br><br>` paragraph rule** in `../Prompts/reply-tone.md` — append it untouched, don't restyle its margins to match.

## Deploying it

**There is no settings API on any of these connectors.** Installing a signature is a manual paste, once per client, by {{FIRST_NAME}}. **Re-paste after any edit to `signature.html`.**
