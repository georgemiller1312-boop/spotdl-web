"""
spotdl-web backend.

Flow:
  1. POST /api/playlist     -> fetch track listing for a Spotify playlist URL
  2. GET  /api/destinations -> configured save locations to choose from
  3. POST /api/download     -> download all or a chosen subset, to a chosen
                                destination
  4. GET  /api/jobs/{id}    -> poll progress; a .m3u is (re)written once the
                                job's downloads finish, reflecting everything
                                currently on disk for that playlist
  5. GET  /api/history      -> persisted record of past jobs (survives restarts)
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import history
from . import jobs as jobs_module
from .auth import BasicAuthMiddleware
from .config import DEFAULT_DESTINATION, DESTINATIONS, SITE_PASSWORD, SITE_USERNAME, STATIC_DIR
from .downloader_instance import create_downloaders, create_staging_downloader
from .network_dest import NetworkTarget, staging_dir, test_connection
from .playlist_service import fetch_playlist, song_to_dict
from .spotify_client import init_spotify_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("spotdl-web")

# Cache of the last-fetched Playlist object per URL, so /api/download can
# resolve the user's selection without trusting song data from the client.
PLAYLIST_CACHE: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_spotify_client()
    history.init_db()
    loop = asyncio.get_running_loop()
    app.state.downloaders = create_downloaders(loop)
    logger.info(
        "spotdl-web backend ready — destinations: %s",
        ", ".join(f"{name}={path}" for name, path in DESTINATIONS.items()),
    )
    yield


app = FastAPI(title="spotdl-web", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

if SITE_USERNAME and SITE_PASSWORD:
    app.add_middleware(BasicAuthMiddleware, username=SITE_USERNAME, password=SITE_PASSWORD)
    logger.info("Basic auth enabled — every request requires SITE_USERNAME/SITE_PASSWORD")
else:
    logger.warning(
        "No SITE_USERNAME/SITE_PASSWORD set — running with no authentication. "
        "Fine for Tailscale-only access; set both before using `tailscale funnel`."
    )


class PlaylistRequest(BaseModel):
    url: str


class NetworkDestinationPayload(BaseModel):
    ip: str
    share: str
    subfolder: str = ""
    username: Optional[str] = None
    password: Optional[str] = None


class DownloadRequest(BaseModel):
    playlist_url: str
    track_keys: Optional[List[str]] = None  # None/omitted = whole playlist
    destination: Optional[str] = None  # a saved destination name — ignored if `network` is set
    network: Optional[NetworkDestinationPayload] = None  # save straight to an IP/share instead


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/destinations")
async def get_destinations():
    return {
        "default": DEFAULT_DESTINATION,
        "destinations": [
            {"name": name, "path": path} for name, path in DESTINATIONS.items()
        ],
    }


@app.post("/api/network-destination/test")
async def test_network_destination(payload: NetworkDestinationPayload):
    target = NetworkTarget(
        ip=payload.ip,
        share=payload.share,
        subfolder=payload.subfolder,
        username=payload.username,
        password=payload.password,
    )
    try:
        await asyncio.to_thread(test_connection, target)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Couldn't reach {target.label}: {exc}") from exc
    return {"ok": True, "label": target.label}


@app.post("/api/playlist")
async def get_playlist(payload: PlaylistRequest):
    try:
        playlist = await asyncio.to_thread(fetch_playlist, payload.url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("Failed to fetch playlist")
        raise HTTPException(
            status_code=502, detail=f"Couldn't reach Spotify: {exc}"
        ) from exc

    PLAYLIST_CACHE[payload.url] = playlist

    return {
        "name": playlist.name,
        "owner": playlist.author_name,
        "cover_url": playlist.cover_url,
        "url": playlist.url,
        "total": len(playlist.songs),
        "songs": [song_to_dict(s) for s in playlist.songs],
    }


@app.post("/api/download")
async def start_download(payload: DownloadRequest):
    playlist = PLAYLIST_CACHE.get(payload.playlist_url)
    if playlist is None:
        raise HTTPException(
            status_code=404,
            detail="That playlist isn't loaded anymore — fetch it again before downloading.",
        )

    if payload.track_keys:
        wanted = set(payload.track_keys)
        selected = [
            s
            for s in playlist.songs
            if f"{s.list_position}-{s.song_id}" in wanted
        ]
        if not selected:
            raise HTTPException(status_code=400, detail="No matching tracks selected.")
    else:
        selected = list(playlist.songs)

    if payload.network:
        target = NetworkTarget(
            ip=payload.network.ip,
            share=payload.network.share,
            subfolder=payload.network.subfolder,
            username=payload.network.username,
            password=payload.network.password,
        )
        job_id = jobs_module.new_job(playlist.name, playlist.url, selected, target.label)
        loop = asyncio.get_running_loop()
        staging_path = str(staging_dir(job_id))
        downloader = create_staging_downloader(loop, staging_path)
        asyncio.create_task(
            jobs_module.run_job_network(job_id, downloader, selected, playlist.songs, target)
        )
        return {"job_id": job_id}

    destination = payload.destination or DEFAULT_DESTINATION
    if destination not in DESTINATIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown destination '{destination}'. Options: {', '.join(DESTINATIONS)}",
        )

    job_id = jobs_module.new_job(playlist.name, playlist.url, selected, destination)
    downloader = app.state.downloaders[destination]
    destination_path = DESTINATIONS[destination]
    asyncio.create_task(
        jobs_module.run_job(job_id, downloader, selected, playlist.songs, destination_path)
    )
    return {"job_id": job_id}


@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str):
    job = jobs_module.JOBS.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Unknown job")
    return job


@app.get("/api/jobs")
async def list_jobs():
    return sorted(
        jobs_module.JOBS.values(), key=lambda j: j["created_at"], reverse=True
    )[:20]


@app.get("/api/history")
async def get_history(limit: int = 50):
    return history.list_history(limit=limit)


# Serve the built frontend (frontend/dist, copied to STATIC_DIR at build time).
# Mounted last so it never shadows the /api/* routes above.
if STATIC_DIR.exists():
    app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")
