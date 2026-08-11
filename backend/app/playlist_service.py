"""
Turns a Spotify playlist URL into a Playlist object with fully-tagged
Song objects, and serializes songs for the frontend.
"""

import re

from spotdl.types.playlist import Playlist, PlaylistError
from spotdl.types.song import Song

PLAYLIST_URL_RE = re.compile(r"open\.spotify\.com/(intl-[a-zA-Z-]+/)?playlist/[a-zA-Z0-9]+")


def is_playlist_url(url: str) -> bool:
    return bool(PLAYLIST_URL_RE.search(url.strip()))


def track_key(song: Song) -> str:
    """Stable per-song key, safe even if a playlist repeats the same track."""
    return f"{song.list_position}-{song.song_id}"


def song_to_dict(song: Song) -> dict:
    return {
        "key": track_key(song),
        "id": song.song_id,
        "url": song.url,
        "title": song.name,
        "artists": song.artists,
        "artist": song.artist,
        "album": song.album_name,
        "duration": song.duration,
        "cover_url": song.cover_url,
        "position": song.list_position,
        "explicit": song.explicit,
    }


def fetch_playlist(url: str) -> Playlist:
    """
    Fetch playlist metadata + track listing from Spotify.
    This is metadata-only (no YouTube matching, no downloading), so it's fast
    even for long playlists.
    """

    if not is_playlist_url(url):
        raise ValueError("That doesn't look like a Spotify playlist link.")

    try:
        playlist = Playlist.from_url(url, fetch_songs=False)
    except PlaylistError as exc:
        raise ValueError(str(exc)) from exc

    if not playlist.songs:
        raise ValueError("That playlist doesn't have any tracks spotdl can read.")

    # from_url(fetch_songs=False) doesn't stamp list_name/list_url/list_length
    # onto each song (that normally happens deeper in spotdl's CLI query
    # pipeline) — do it here so downstream output-path templating and m3u
    # generation both key off the same playlist name.
    for song in playlist.songs:
        song.list_name = playlist.name
        song.list_url = playlist.url
        song.list_length = len(playlist.songs)

    return playlist
