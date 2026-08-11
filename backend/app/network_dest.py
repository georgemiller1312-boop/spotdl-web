"""
Lets a download job write straight to a network share (e.g. \\\\192.168.1.50\\Music)
given at request time in the UI, instead of only a pre-mounted local path.

spotdl itself still needs a real local path to download+convert+tag into
(ffmpeg can't write to a network protocol directly), so the flow here is:
  1. spotdl downloads to a per-job local staging folder
  2. each finished file is uploaded to the SMB share
  3. the staging folder is cleaned up once the job's done
"""

import logging
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import smbclient

logger = logging.getLogger("spotdl-web")

STAGING_ROOT = Path("/tmp/spotdl-web-staging")


@dataclass(frozen=True)
class NetworkTarget:
    ip: str
    share: str
    subfolder: str = ""
    username: Optional[str] = None
    password: Optional[str] = None

    @property
    def label(self) -> str:
        parts = f"//{self.ip}/{self.share}"
        if self.subfolder:
            parts += f"/{self.subfolder.strip('/')}"
        return parts

    def unc_path(self, *parts: str) -> str:
        segments = [self.subfolder.strip("/")] if self.subfolder else []
        segments.extend(p.strip("/") for p in parts if p)
        tail = "\\".join(segments)
        base = f"\\\\{self.ip}\\{self.share}"
        return f"{base}\\{tail}" if tail else base


def staging_dir(job_id: str) -> Path:
    path = STAGING_ROOT / job_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def cleanup_staging(job_id: str) -> None:
    path = STAGING_ROOT / job_id
    shutil.rmtree(path, ignore_errors=True)


def test_connection(target: NetworkTarget) -> None:
    """Raises with a readable message if the share isn't reachable/usable."""
    smbclient.register_session(
        target.ip, username=target.username or None, password=target.password or None
    )
    smbclient.makedirs(target.unc_path(), exist_ok=True)


def upload_file(target: NetworkTarget, local_path: Path, remote_subpath: str) -> None:
    smbclient.register_session(
        target.ip, username=target.username or None, password=target.password or None
    )
    remote_path = target.unc_path(remote_subpath)
    remote_dir = "\\".join(remote_path.split("\\")[:-1])
    smbclient.makedirs(remote_dir, exist_ok=True)
    with open(local_path, "rb") as src, smbclient.open_file(remote_path, mode="wb") as dst:
        shutil.copyfileobj(src, dst)
