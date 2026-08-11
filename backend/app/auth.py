"""
Minimal HTTP Basic Auth gate for when this app is exposed beyond the
tailnet (e.g. via `tailscale funnel`). Applies to every request — API
routes and the static frontend alike — so there's no unauthenticated path
in front of spotdl.
"""

import base64
import secrets

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class BasicAuthMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, username: str, password: str):
        super().__init__(app)
        self.username = username
        self.password = password

    async def dispatch(self, request: Request, call_next):
        auth_header = request.headers.get("authorization", "")
        if self._is_valid(auth_header):
            return await call_next(request)

        return Response(
            status_code=401,
            content="Authentication required.",
            headers={"WWW-Authenticate": 'Basic realm="spotdl web"'},
        )

    def _is_valid(self, auth_header: str) -> bool:
        if not auth_header.lower().startswith("basic "):
            return False
        try:
            decoded = base64.b64decode(auth_header[6:]).decode("utf-8")
            username, _, password = decoded.partition(":")
        except Exception:  # noqa: BLE001
            return False

        return secrets.compare_digest(username, self.username) and secrets.compare_digest(
            password, self.password
        )
