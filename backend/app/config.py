"""
Central configuration for the spotdl-web backend.
Everything here is overridable with environment variables so the
docker-compose.yml is the only place you should need to touch settings.
"""

import os
from pathlib import Path

# --- Download destinations -------------------------------------------------
# One or more named locations songs can be saved to, e.g.:
#   DOWNLOAD_DESTINATIONS=Music:/music,NAS:/nas-music
# Each path must be something mounted into the container (a plain Docker
# volume, or a network share like CIFS/NFS — see docker-compose.yml for how
# to mount one of those by IP). The web UI lets you pick between them.
# The first entry is used when nothing is specified.
_raw_destinations = os.environ.get("DOWNLOAD_DESTINATIONS", "Music:/music")

DESTINATIONS: dict[str, str] = {}
for _entry in _raw_destinations.split(","):
    _entry = _entry.strip()
    if not _entry or ":" not in _entry:
        continue
    _name, _path = _entry.split(":", 1)
    DESTINATIONS[_name.strip()] = _path.strip().rstrip("/")

if not DESTINATIONS:
    DESTINATIONS = {"Music": "/music"}

DEFAULT_DESTINATION = next(iter(DESTINATIONS))

# Audio format/quality. mp3 is the safest choice for compatibility with
# basically every player, phone, and media server.
DOWNLOAD_FORMAT = os.environ.get("SPOTDL_FORMAT", "mp3")
BITRATE = os.environ.get("SPOTDL_BITRATE", "320k")

# How many songs to download concurrently.
THREADS = int(os.environ.get("SPOTDL_THREADS", "4"))

# Songs are written straight into <destination> (no per-playlist subfolder),
# as <destination>/<Artist> - <Title>.mp3, with the .m3u alongside them in
# that same folder. jobs.py relies on this exact shape (no leading path
# segment before the filename) to check what has already been downloaded.
OUTPUT_SUFFIX = "{artists} - {title}.{output-ext}"


def output_template_for(destination_path: str) -> str:
    return f"{destination_path}/{OUTPUT_SUFFIX}"


# spotdl ships its own default (rate-limited, free-tier) Spotify API app
# credentials so it works out of the box. Set these two env vars if you'd
# rather use your own Spotify Developer app.
SPOTIFY_CLIENT_ID = os.environ.get("SPOTIFY_CLIENT_ID") or None
SPOTIFY_CLIENT_SECRET = os.environ.get("SPOTIFY_CLIENT_SECRET") or None

# Where the built frontend (frontend/dist) is copied to inside the image.
STATIC_DIR = Path(os.environ.get("STATIC_DIR", "/app/static"))

# Small SQLite file recording download history. Point this at a mounted
# volume (see docker-compose.yml) so history survives container restarts.
HISTORY_DB = os.environ.get("HISTORY_DB", "/data/history.db")

# Base folder for typing a one-off local destination path directly into the
# UI, without pre-configuring it in DOWNLOAD_DESTINATIONS and redeploying.
# Anything typed into the "custom local path" field is resolved *underneath*
# this and rejected if it tries to escape it. Mount a broad folder here in
# docker-compose.yml (e.g. all of /DATA) to make it useful.
DATA_ROOT = os.environ.get("DATA_ROOT", "/data-root").rstrip("/")

# Scratch space for network (SMB/IP-address) destinations. spotdl/ffmpeg
# need a real local path to write into, so those jobs download here first,
# then upload the finished folder over SMB and delete the local copy.
STAGING_ROOT = os.environ.get("STAGING_ROOT", "/tmp/spotdl-web-staging").rstrip("/")

# If BOTH are set, every request (API + the site itself) requires this
# username/password via HTTP Basic Auth. Leave unset for Tailscale-only
# access where the tailnet itself is the access control. Set these before
# exposing the app with `tailscale funnel` — otherwise it's a public,
# unauthenticated download endpoint.
SITE_USERNAME = os.environ.get("SITE_USERNAME") or None
SITE_PASSWORD = os.environ.get("SITE_PASSWORD") or None
