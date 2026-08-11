"""
Tiny SQLite-backed history of past download jobs, so past runs survive a
container restart (unlike the in-memory JOBS dict in jobs.py).
"""

import sqlite3
from pathlib import Path
from typing import List

from .config import HISTORY_DB

_SCHEMA = """
CREATE TABLE IF NOT EXISTS history (
    id TEXT PRIMARY KEY,
    playlist_name TEXT NOT NULL,
    playlist_url TEXT,
    destination TEXT,
    total INTEGER,
    completed INTEGER,
    failed INTEGER,
    m3u_path TEXT,
    m3u_track_count INTEGER,
    created_at REAL,
    finished_at REAL
);
"""


def _connect() -> sqlite3.Connection:
    Path(HISTORY_DB).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(HISTORY_DB)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _connect() as conn:
        conn.execute(_SCHEMA)


def record_job(job: dict) -> None:
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO history
                (id, playlist_name, playlist_url, destination, total,
                 completed, failed, m3u_path, m3u_track_count, created_at, finished_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                completed=excluded.completed,
                failed=excluded.failed,
                m3u_path=excluded.m3u_path,
                m3u_track_count=excluded.m3u_track_count,
                finished_at=excluded.finished_at
            """,
            (
                job["id"],
                job["playlist_name"],
                job.get("playlist_url"),
                job.get("destination"),
                job["total"],
                job["completed"],
                job["failed"],
                job.get("m3u_path"),
                job.get("m3u_track_count", 0),
                job["created_at"],
                job.get("finished_at"),
            ),
        )


def list_history(limit: int = 50) -> List[dict]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM history ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(row) for row in rows]
