"""
Initializes spotdl's SpotifyClient singleton once, at app startup.
"""

import logging

from spotdl.utils.config import DEFAULT_CONFIG
from spotdl.utils.spotify import SpotifyClient, SpotifyError

from .config import SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET

logger = logging.getLogger("spotdl-web")


def init_spotify_client() -> None:
    """Initialize the SpotifyClient singleton if it isn't already."""

    try:
        SpotifyClient()
        logger.info("Spotify client already initialized")
        return
    except SpotifyError:
        pass

    SpotifyClient.init(
        client_id=SPOTIFY_CLIENT_ID or DEFAULT_CONFIG["client_id"],
        client_secret=SPOTIFY_CLIENT_SECRET or DEFAULT_CONFIG["client_secret"],
        user_auth=False,
        no_cache=True,
        headless=True,
    )
    logger.info("Spotify client initialized")
