"""Print the full lifecycle of one article: every ADDED/UPDATED/REMOVED
event recorded in Postgres, oldest first.

Usage:
    python history.py how-to-use-youtube-with-optisigns

Requires DATABASE_URL — only meaningful when the daily job has been
running against the Postgres backend (see src/db_state.py).
"""

from __future__ import annotations

import os
import sys

from dotenv import load_dotenv

from src.db_state import connect, get_history


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: python history.py <slug>")
    slug = sys.argv[1]

    load_dotenv()
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise SystemExit("DATABASE_URL is required")

    conn = connect(database_url)
    events = get_history(conn, slug)

    if not events:
        print(f"No history found for slug '{slug}'")
        return

    print(f"History for {slug}:")
    for event in events:
        content_hash = event["content_hash"] or "-"
        print(f"  {event['created_at']}  {event['action']:8s}  hash={content_hash[:12]}")


if __name__ == "__main__":
    main()
