#!/usr/bin/env python3
"""Write Gmail / Calendar snapshots for the dashboard to read.

The dashboard's email-triage and calendar views normally call Google directly
(lib/google.mjs, needs a one-time OAuth setup). This is the no-setup
alternative: Claude Code, which already has Gmail and Calendar access, dumps
what it sees into two JSON files and serve.mjs serves those instead.

Trade-off: the data is a snapshot, not live. Freshness is stamped into each
file and shown in the dashboard, so it can never silently look current.

Usage:
    python write_snapshot.py --inbox inbox_raw.json --calendar cal_raw.json
    python write_snapshot.py --check           # just report current freshness
"""
import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _data_dir():
    """--data-dir, then DASHBOARD_DATA_DIR, then <repo>/data (same order as the server)."""
    for i, a in enumerate(sys.argv):
        if a == "--data-dir" and i + 1 < len(sys.argv):
            return Path(sys.argv[i + 1]).resolve()
        if a.startswith("--data-dir="):
            return Path(a.split("=", 1)[1]).resolve()
    if os.environ.get("DASHBOARD_DATA_DIR"):
        return Path(os.environ["DASHBOARD_DATA_DIR"]).resolve()
    return ROOT / "data"


DATA = _data_dir()
# Where the server reads each snapshot (server/routes/google.mjs).
FOLDER = {"inbox.json": DATA / "email", "calendar.json": DATA / "calendar"}


def stamp():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def write(name, payload):
    FOLDER[name].mkdir(parents=True, exist_ok=True)
    path = FOLDER[name] / name
    data = json.dumps(payload, indent=1, ensure_ascii=False).encode("utf-8")
    tmp = path.with_suffix(".json.tmp")
    tmp.write_bytes(data)
    tmp.replace(path)
    return path


def check():
    for name in ("inbox.json", "calendar.json"):
        p = FOLDER[name] / name
        if not p.exists():
            print(f"  {name}: missing")
            continue
        try:
            d = json.loads(p.read_text(encoding="utf-8"))
            n = len(d.get("emails") or d.get("events") or [])
            print(f"  {name}: {n} items, fetched {d.get('fetchedAt')}")
        except Exception as e:
            print(f"  {name}: unreadable ({e})")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--inbox", help="JSON file of [{id,subject,sender,snippet,date}]")
    ap.add_argument("--calendar", help="JSON file of [{id,summary,start,end,location}]")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--data-dir", help="the dashboard data folder (default: DASHBOARD_DATA_DIR, then <repo>/data)")
    args = ap.parse_args()

    if args.check:
        check()
        return 0

    if args.inbox:
        emails = json.loads(Path(args.inbox).read_text(encoding="utf-8"))
        p = write("inbox.json", {
            "source": "claude-code-snapshot",
            "fetchedAt": stamp(),
            "emails": emails,
        })
        print(f"  wrote {p.name}: {len(emails)} emails")

    if args.calendar:
        events = json.loads(Path(args.calendar).read_text(encoding="utf-8"))
        p = write("calendar.json", {
            "source": "claude-code-snapshot",
            "fetchedAt": stamp(),
            "events": events,
        })
        print(f"  wrote {p.name}: {len(events)} events")

    if not args.inbox and not args.calendar:
        ap.error("give --inbox and/or --calendar, or --check")
    return 0


if __name__ == "__main__":
    sys.exit(main())
