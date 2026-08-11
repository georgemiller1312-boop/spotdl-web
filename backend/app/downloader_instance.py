"""
Builds one spotdl Downloader per configured destination (see
config.DESTINATIONS), all sharing the same event loop. Each Downloader's
`output` setting is baked to that destination's path, so a job just needs
to pick which Downloader to hand songs to.
"""

import asyncio
from typing import Dict

from spotdl.download.downloader import Downloader

from .config import BITRATE, DESTINATIONS, DOWNLOAD_FORMAT, THREADS, output_template_for


def create_downloaders(loop: asyncio.AbstractEventLoop) -> Dict[str, Downloader]:
    return {
        name: build_downloader(path, loop)
        for name, path in DESTINATIONS.items()
    }


def build_downloader(destination_path: str, loop: asyncio.AbstractEventLoop) -> Downloader:
    """Build a single Downloader writing to an arbitrary path — used for
    presets at startup, and for one-off local/staging paths per job."""
    return Downloader(
        settings={
            "output": output_template_for(destination_path),
            "format": DOWNLOAD_FORMAT,
            "bitrate": BITRATE,
            "threads": THREADS,
            "print_errors": True,
            "restrict": None,
        },
        loop=loop,
    )


def create_staging_downloader(loop: asyncio.AbstractEventLoop, staging_path: str) -> Downloader:
    """One-off Downloader for a network-destination job, writing locally to
    a per-job staging folder before each file gets uploaded over SMB."""
    return Downloader(
        settings={
            "output": output_template_for(staging_path),
            "format": DOWNLOAD_FORMAT,
            "bitrate": BITRATE,
            "threads": THREADS,
            "print_errors": True,
            "restrict": None,
        },
        loop=loop,
    )
