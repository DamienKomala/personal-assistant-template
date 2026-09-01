#!/usr/bin/env python3
"""
gmail_drafts.py — delete Gmail drafts whose content has already been sent.

The claude.ai Gmail connector cannot delete a draft. This closes that gap using
the Gmail API directly, and it is deliberately conservative: it will only delete
a draft when it can PROVE the same message already went out on the same thread.

Run it with uv so nothing has to be installed globally:

    uv run --with google-api-python-client \
           --with google-auth-oauthlib \
           Tools/gmail_drafts.py

Default is a dry run. Nothing is deleted without --delete.

See Tools/README.md for the one-time OAuth setup.
"""

from __future__ import annotations

import argparse
import base64
import difflib
import json
import os
import re
import sys
from pathlib import Path

# Read + delete drafts. gmail.modify covers drafts.delete and reading SENT;
# it cannot permanently delete messages or threads, which is the point.
SCOPES = ["https://www.googleapis.com/auth/gmail.modify"]

# Credentials live OUTSIDE the repo so they can never be committed.
CONFIG_DIR = Path(
    os.environ.get("GMAIL_DRAFTS_CONFIG", Path.home() / ".config" / "gmail-draft-tool")
)
CLIENT_SECRET = CONFIG_DIR / "credentials.json"
TOKEN = CONFIG_DIR / "token.json"

# How similar a draft body must be to an already-sent body to count as sent.
# 0.90 is intentionally strict: a false positive deletes unsent work, while a
# false negative only means the owner deletes one more draft by hand.
DEFAULT_THRESHOLD = 0.90

# Drafts that must never be deleted regardless of what the comparison says.
# Add ids here when a draft is live and must survive a sweep of the folder.
PROTECTED: set[str] = set()


# ---------------------------------------------------------------- auth


def service():
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build

    creds = None
    if TOKEN.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not CLIENT_SECRET.exists():
                sys.exit(
                    f"No OAuth client at {CLIENT_SECRET}\n"
                    "Run the one-time setup in Tools/README.md first."
                )
            flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_SECRET), SCOPES)
            creds = flow.run_local_server(port=0)
        CONFIG_DIR.mkdir(parents=True, exist_ok=True)
        TOKEN.write_text(creds.to_json())
        TOKEN.chmod(0o600)

    return build("gmail", "v1", credentials=creds)


# ------------------------------------------------------------- parsing


def decode(data: str) -> str:
    return base64.urlsafe_b64decode(data.encode()).decode("utf-8", errors="replace")


def plain_body(payload: dict) -> str:
    """Depth-first search for a text/plain part, falling back to text/html."""
    stack, html = [payload], ""
    while stack:
        part = stack.pop(0)
        mime = part.get("mimeType", "")
        data = part.get("body", {}).get("data")
        if data:
            if mime == "text/plain":
                return decode(data)
            if mime == "text/html" and not html:
                html = decode(data)
        stack.extend(part.get("parts", []) or [])
    return re.sub(r"<[^>]+>", " ", html) if html else ""


QUOTE_MARKERS = (
    re.compile(r"^On .{0,120}wrote:\s*$", re.M),
    re.compile(r"^-{2,}\s*Original Message\s*-{2,}\s*$", re.M | re.I),
    re.compile(r"^_{5,}\s*$", re.M),
    re.compile(r"^From:\s.+$", re.M),
)


def normalize(text: str) -> str:
    """Strip the quoted reply, the signature and all whitespace variation.

    Two copies of one message differ in quoting depth, link wrappers and
    signature rendering. Comparing raw bodies produces false negatives, which
    here means failing to delete something that really was sent.
    """
    # Cut everything from the first quote marker onward.
    cut = len(text)
    for marker in QUOTE_MARKERS:
        m = marker.search(text)
        if m:
            cut = min(cut, m.start())
    text = text[:cut]

    # Drop quoted lines and the signature block.
    lines = []
    for line in text.splitlines():
        if line.lstrip().startswith(">"):
            continue
        if line.strip().startswith("IMPORTANT: The contents of this email"):
            break
        lines.append(line)
    text = "\n".join(lines)

    # Google wraps every link in a tracking redirect; drop URLs entirely.
    text = re.sub(r"https?://\S+", " ", text)
    text = re.sub(r"[^\w\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip().lower()


def header(msg: dict, name: str) -> str:
    for h in msg.get("payload", {}).get("headers", []):
        if h.get("name", "").lower() == name.lower():
            return h.get("value", "")
    return ""


# -------------------------------------------------------------- verdicts


def classify(api, draft: dict, threshold: float) -> dict:
    """Decide whether one draft is a duplicate of something already sent."""
    did = draft["id"]
    msg = draft.get("message", {})
    thread_id = msg.get("threadId")

    detail = (
        api.users()
        .drafts()
        .get(userId="me", id=did, format="full")
        .execute()
        .get("message", {})
    )
    body = normalize(plain_body(detail.get("payload", {})))
    to = header(detail, "To")
    subject = header(detail, "Subject") or "(no subject)"

    row = {
        "id": did,
        "to": to,
        "subject": subject,
        "thread": thread_id,
        "verdict": "KEEP",
        "why": "",
        "score": 0.0,
    }

    if did in PROTECTED:
        row["why"] = "protected by name in PROTECTED"
        return row

    if not body:
        # An empty plaintext body does NOT mean an empty draft — a documented
        # trap. Never delete on the strength of a body we could not read.
        row["why"] = "no readable body — cannot verify, so never delete"
        return row

    if not thread_id:
        row["why"] = "no thread — nothing to compare against"
        return row

    try:
        thread = api.users().threads().get(userId="me", id=thread_id, format="full").execute()
    except Exception as exc:  # thread deleted, or draft is its own thread
        row["why"] = f"thread unreadable ({exc.__class__.__name__})"
        return row

    best, best_id = 0.0, None
    for m in thread.get("messages", []):
        if "SENT" not in m.get("labelIds", []):
            continue
        sent = normalize(plain_body(m.get("payload", {})))
        if not sent:
            continue
        score = difflib.SequenceMatcher(None, body, sent).ratio()
        if score > best:
            best, best_id = score, m["id"]

    row["score"] = round(best, 3)
    if best_id is None:
        row["why"] = "no sent message on this thread"
    elif best >= threshold:
        row["verdict"] = "DELETE"
        row["why"] = f"matches sent message {best_id} at {best:.0%}"
    else:
        row["why"] = f"closest sent message only {best:.0%} — below {threshold:.0%}"
    return row


# ------------------------------------------------------------------ cli


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Delete Gmail drafts whose content was already sent."
    )
    ap.add_argument(
        "--delete",
        action="store_true",
        help="actually delete. Without this the script only reports.",
    )
    ap.add_argument(
        "--threshold",
        type=float,
        default=DEFAULT_THRESHOLD,
        help=f"similarity required to call a draft sent (default {DEFAULT_THRESHOLD})",
    )
    ap.add_argument(
        "--keep",
        action="append",
        default=[],
        metavar="DRAFT_ID",
        help="never delete this draft id. Repeatable.",
    )
    ap.add_argument("--json", action="store_true", help="emit the verdict table as JSON")
    args = ap.parse_args()

    PROTECTED.update(args.keep)

    api = service()
    drafts = api.users().drafts().list(userId="me", maxResults=200).execute().get("drafts", [])
    if not drafts:
        print("No drafts.")
        return 0

    rows = [classify(api, d, args.threshold) for d in drafts]

    if args.json:
        print(json.dumps(rows, indent=2))
    else:
        width = max(len(r["subject"][:44]) for r in rows)
        print(f"\n{len(rows)} drafts\n")
        for r in rows:
            mark = "🗑 " if r["verdict"] == "DELETE" else "✓ "
            print(f"{mark}{r['subject'][:44]:<{width}}  {r['to'][:38]:<38}  {r['why']}")
            print(f"   {r['id']}")
        print()

    doomed = [r for r in rows if r["verdict"] == "DELETE"]
    print(f"{len(doomed)} of {len(rows)} drafts are duplicates of sent messages.")

    if not args.delete:
        print("Dry run — nothing deleted. Re-run with --delete to remove them.")
        return 0

    if not doomed:
        return 0

    print("\nDeleting:")
    failed = 0
    for r in doomed:
        try:
            api.users().drafts().delete(userId="me", id=r["id"]).execute()
            print(f"  deleted  {r['subject'][:60]}")
        except Exception as exc:
            failed += 1
            print(f"  FAILED   {r['id']}: {exc}")
    print(f"\n{len(doomed) - failed} deleted, {failed} failed.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
