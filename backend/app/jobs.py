"""
In-memory download job tracking + orchestration.

A job is a batch of songs (either the whole playlist or a hand-picked
subset) downloaded concurrently through spotdl's Downloader, into one of
the configured destinations. Live/in-progress state lives in memory only;
once a job finishes, a summary is persisted to SQLite via history.py so it
survives a container restart.
"""

import asyncio
import logging
import time
import uuid
from pathlib import Path
from typing import Dict, List, Optional

from spotdl.download.downloader import Downloader
from spotdl.types.song import Song
from spotdl.utils.formatter import create_file_name, sanitize_string
from spotdl.utils.m3u import create_m3u_file

from . import history
from . import network_dest
from .config import DOWNLOAD_FORMAT, OUTPUT_SUFFIX, output_template_for
from .network_dest import NetworkTarget
from .playlist_service import track_key

logger = logging.getLogger("spotdl-web")

JOBS: Dict[str, dict] = {}


def new_job(
    playlist_name: str,
    playlist_url: str,
    songs_to_download: List[Song],
    destination: str,
) -> str:
    job_id = uuid.uuid4().hex[:12]
    JOBS[job_id] = {
        "id": job_id,
        "status": "queued",  # queued -> running -> complete -> error
        "playlist_name": playlist_name,
        "playlist_url": playlist_url,
        "destination": destination,
        "created_at": time.time(),
        "finished_at": None,
        "total": len(songs_to_download),
        "completed": 0,
        "failed": 0,
        "tracks": {
            track_key(song): {
                "title": song.name,
                "artists": song.artists,
                "status": "pending",
                "error": None,
            }
            for song in songs_to_download
        },
        "m3u_path": None,
        "m3u_track_count": 0,
        "error": None,
    }
    return job_id


async def _download_one(downloader: Downloader, song: Song):
    """Download a single song, always returning a result instead of raising."""
    try:
        _, path = await downloader.pool_download(song)
        return song, path, None
    except Exception as exc:  # noqa: BLE001 - a bad match must not sink the job
        logger.warning("Download failed for %s: %s", song.display_name, exc)
        return song, None, str(exc)


def _existing_files_for(all_songs: List[Song], output_template: str) -> List[Song]:
    """Whatever in this playlist already has an audio file on disk, in order."""
    existing = [
        song
        for song in all_songs
        if create_file_name(song, output_template, DOWNLOAD_FORMAT).exists()
    ]
    existing.sort(key=lambda s: s.list_position or 0)
    return existing


def _write_m3u(
    playlist_name: str, all_songs: List[Song], destination_path: str, output_template: str
) -> Optional[tuple]:
    existing = _existing_files_for(all_songs, output_template)
    if not existing:
        return None

    safe_name = sanitize_string(playlist_name)
    m3u_path = Path(destination_path) / f"{safe_name}.m3u"
    create_m3u_file(str(m3u_path), existing, output_template, DOWNLOAD_FORMAT)
    return m3u_path, len(existing)


async def run_job(
    job_id: str,
    downloader: Downloader,
    songs_to_download: List[Song],
    all_playlist_songs: List[Song],
    destination_path: str,
) -> None:
    job = JOBS[job_id]
    job["status"] = "running"
    for song in songs_to_download:
        job["tracks"][track_key(song)]["status"] = "downloading"

    output_template = output_template_for(destination_path)

    tasks = [_download_one(downloader, song) for song in songs_to_download]
    for coro in asyncio.as_completed(tasks):
        song, path, error = await coro
        track = job["tracks"].get(track_key(song))
        if track is None:
            continue
        if path is not None:
            track["status"] = "done"
            job["completed"] += 1
        else:
            track["status"] = "error"
            track["error"] = error or "No match found on YouTube"
            job["failed"] += 1

    try:
        result = _write_m3u(job["playlist_name"], all_playlist_songs, destination_path, output_template)
        if result is not None:
            m3u_path, count = result
            job["m3u_path"] = str(m3u_path)
            job["m3u_track_count"] = count
    except Exception as exc:  # noqa: BLE001
        logger.exception("Failed to write m3u for job %s", job_id)
        job["error"] = f"Downloads finished but the .m3u file failed to write: {exc}"

    job["status"] = "complete"
    job["finished_at"] = time.time()

    try:
        history.record_job(job)
    except Exception:  # noqa: BLE001
        logger.exception("Failed to persist history for job %s", job_id)


# Same shape as the local OUTPUT_SUFFIX: no per-playlist subfolder, files go
# straight into the destination (here, the SMB share/subfolder root).
RELATIVE_TEMPLATE = OUTPUT_SUFFIX


async def run_job_network(
    job_id: str,
    downloader: Downloader,
    songs_to_download: List[Song],
    all_playlist_songs: List[Song],
    target: NetworkTarget,
) -> None:
    """
    Same as run_job, but the Downloader passed in writes to a per-job local
    staging folder (its `output` setting is set up by the caller to point
    there), and each finished file is uploaded to the SMB target and then
    removed from local staging.
    """
    job = JOBS[job_id]
    job["status"] = "running"
    for song in songs_to_download:
        job["tracks"][track_key(song)]["status"] = "downloading"

    staging = network_dest.staging_dir(job_id)

    tasks = [_download_one(downloader, song) for song in songs_to_download]
    for coro in asyncio.as_completed(tasks):
        song, local_path, error = await coro
        track = job["tracks"].get(track_key(song))
        if track is None:
            continue

        if local_path is None:
            track["status"] = "error"
            track["error"] = error or "No match found on YouTube"
            job["failed"] += 1
            continue

        remote_subpath = str(
            create_file_name(song, RELATIVE_TEMPLATE, DOWNLOAD_FORMAT)
        )
        try:
            await asyncio.to_thread(network_dest.upload_file, target, local_path, remote_subpath)
            track["status"] = "done"
            job["completed"] += 1
        except Exception as exc:  # noqa: BLE001
            logger.warning("SMB upload failed for %s: %s", song.display_name, exc)
            track["status"] = "error"
            track["error"] = f"Downloaded but failed to upload to {target.label}: {exc}"
            job["failed"] += 1

    try:
        existing_locally = _existing_files_for(
            all_playlist_songs, output_template_for(str(staging))
        )
        if existing_locally:
            safe_name = sanitize_string(job["playlist_name"])
            local_m3u = staging / f"{safe_name}.m3u"
            create_m3u_file(
                str(local_m3u), existing_locally, output_template_for(str(staging)), DOWNLOAD_FORMAT
            )
            remote_m3u_path = f"{safe_name}.m3u"
            await asyncio.to_thread(network_dest.upload_file, target, local_m3u, remote_m3u_path)
            job["m3u_path"] = f"{target.unc_path(remote_m3u_path)}"
            job["m3u_track_count"] = len(existing_locally)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Failed to write/upload m3u for job %s", job_id)
        job["error"] = f"Downloads finished but the .m3u file failed to upload: {exc}"

    network_dest.cleanup_staging(job_id)

    job["status"] = "complete"
    job["finished_at"] = time.time()

    try:
        history.record_job(job)
    except Exception:  # noqa: BLE001
        logger.exception("Failed to persist history for job %s", job_id)
