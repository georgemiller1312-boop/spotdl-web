# spotdl web

Paste a Spotify playlist link, see the tracklist, pick which songs you want,
and download them with [spotdl](https://github.com/spotDL/spotify-downloader).
A `.m3u` playlist file is written alongside the audio, named after the
playlist, and kept up to date with whatever's actually on disk.

- Backend: FastAPI, talks to spotdl directly as a Python library (not the CLI)
- Frontend: React + Vite + Tailwind, claymorphism UI
- Ships as a single Docker image/container

## How files are organised

```
<destination path>/<Playlist Name>/<Artist> - <Title>.mp3
<destination path>/<Playlist Name>/<Playlist Name>.m3u
```

You can configure one or more named destinations (see Configuration below)
and pick which one to use per download from the web UI — handy for "usual
music library" vs. "a NAS on the network" vs. wherever else.

Every time a download job finishes, the `.m3u` for that destination is
rebuilt by checking which of the playlist's tracks actually have a file on
disk — so downloading a
few tracks now and the rest later still produces one correct, complete
playlist file.

## First-time setup

1. **Create a new GitHub repo** and push this folder to it, the same way
   Spool is set up:

   ```bash
   cd spotdl-web
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/georgemiller1312-boop/spotdl-web.git
   git push -u origin main
   ```

2. **On the server**, clone it next to your other projects and point the
   volume at wherever you want the music to land. Open
   `docker-compose.yml` and check the volume line:

   ```yaml
   volumes:
     - /DATA/Downloads/spotdl-web/music:/music
   ```

   Change the left-hand path to wherever you actually want files to end up
   (a Jellyfin/Plex library folder, etc). Then:

   ```bash
   ssh george@server
   cd /DATA/Downloads   # or wherever you keep these
   git clone https://github.com/georgemiller1312-boop/spotdl-web.git
   cd spotdl-web
   mkdir -p /DATA/Downloads/spotdl-web/music   # match whatever path you set above
   ./deploy.sh
   ```

3. **Expose it over Tailscale**, the same way as Spool:

   ```bash
   tailscale serve --bg 8811
   ```

   (Adjust the port if you changed it in `docker-compose.yml`.) Then it's
   reachable at `https://server.tailc9fe55.ts.net` on whatever path/port
   you configure Tailscale Serve with.

That's it — no Spotify Developer account needed. spotdl ships with its own
default API credentials, which is what this app uses unless you set
`SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` yourself in
`docker-compose.yml`.

## Making it reachable from anywhere (not just Tailscale)

By default this only works on your tailnet, via `tailscale serve`. To make
it reachable from any device on the internet — phone on cellular, a
friend's laptop, whatever — use **Tailscale Funnel**, which publishes your
existing Serve setup with a real HTTPS cert. No router port-forwarding, no
public IP needed.

1. **Set a password first.** In `docker-compose.yml`, change:

   ```yaml
   SITE_USERNAME: "george"
   SITE_PASSWORD: "change-me-before-going-public"
   ```

   to real values. With both set, every request — the site and the API —
   requires that username/password over HTTP Basic Auth. Skip this only if
   you're fine with literally anyone on the internet who finds the URL
   being able to trigger downloads through your server.

2. **Redeploy** so the new env vars take effect:

   ```bash
   git add docker-compose.yml
   git commit -m "Add site auth before going public"
   git push          # if you're editing locally
   ./deploy.sh
   ```

3. **Enable Funnel** (one-time, per tailnet — the first run walks you
   through approving it in the Tailscale admin console). Funnel's public
   HTTPS slots are limited to ports 443, 8443, or 10000 — if Spool (or
   anything else) is already using 443, put spotdl-web on 8443 instead so
   they don't collide:

   ```bash
   tailscale funnel --bg --https=8443 8811
   ```

4. Check it's live:

   ```bash
   tailscale funnel status
   ```

   That confirms the mapping. With a non-default port your URL needs the
   port in it: `https://server.tailc9fe55.ts.net:8443`. It'll ask for the
   username/password from step 1 the first time any browser hits it.

To turn public access back off without undoing anything else:

```bash
tailscale funnel 8811 off
```

That drops back to tailnet-only access via `tailscale serve`, which keeps
running underneath it.

## Redeploying after changes

Same pattern as Spool:

```bash
git pull   # after pushing changes from your dev machine
./deploy.sh
```

`deploy.sh` runs `git pull`, `docker compose build`, `docker compose up -d`.

## Local development (optional)

Two terminals, no Docker:

```bash
# backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
MUSIC_DIR=./dev-music uvicorn app.main:app --reload --port 8000

# frontend
cd frontend
npm install
npm run dev
```

Vite's dev server proxies `/api` to `localhost:8000` (see
`frontend/vite.config.js`), so just open the Vite URL it prints.

## Configuration

All set via environment variables in `docker-compose.yml`:

| Variable | Default | Notes |
|---|---|---|
| `DOWNLOAD_DESTINATIONS` | `Music:/music` | Comma-separated `Name:/container-path` pairs. Each path needs a matching entry under `volumes:`. The web UI lets you pick between them per download. |
| `SPOTDL_FORMAT` | `mp3` | Also supports `opus`, `m4a`, `flac`, `ogg`, `wav` |
| `SPOTDL_BITRATE` | `320k` | Audio quality |
| `SPOTDL_THREADS` | `4` | Concurrent downloads |
| `HISTORY_DB` | `/data/history.db` | SQLite file recording finished jobs — point `/data` at a volume so history survives restarts |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | *(spotdl's built-in defaults)* | Only needed if you want your own Spotify Developer app |

### Two ways to save somewhere other than the default

**Pre-configured destinations** — for places you'll reuse. Add to
`DOWNLOAD_DESTINATIONS` in `docker-compose.yml` and mount the path, e.g.
`Music:/music,NAS folder:/nas-music`, redeploy. Shows up as a button in
the "Save to" picker in the UI.

**Type in an IP address, right on the site — no redeploy** — for
anywhere else, on demand. On the site, flip "Save to a network location
by IP instead" and fill in:

- **IP address** — e.g. `192.168.1.50`
- **Share name** — the SMB/Windows-shared folder name on that machine
- **Subfolder** *(optional)* — a path within the share
- **Username / password** *(optional)* — only if the share needs them

Hit **Test connection** before downloading to confirm it's reachable.
Nothing about the network destination is saved anywhere — it's used for
that one download and forgotten.

Technically: spotdl needs a real local disk to download and convert into
(ffmpeg can't write straight to a network protocol), so a network-destination
job downloads to a temporary local folder first, uploads each finished file
to the share over SMB as it completes, then deletes the local copy. No
`cifs-utils` or special container privileges needed for this path — it's
pure-Python (`smbprotocol`), unlike the CIFS-Docker-volume route above.

## Download history

Every finished job (playlist, destination — a preset name or the network
share it went to, how many tracks succeeded/failed, the resulting `.m3u`)
is written to a small SQLite database at `HISTORY_DB`. Click the clock
icon in the top right of the site to see it. Point that path at a mounted
volume (already done in `docker-compose.yml`) so it survives container
restarts — unlike the live in-progress job state, which is memory-only.

## Known limitations (v1)

- Live job progress (the in-progress bar while something's downloading)
  is memory-only — restarting the container mid-download loses that job's
  progress bar, though already-downloaded files are untouched and the
  *finished-job* history persists fine. Just re-run the download.
- No auth by default — fine behind Tailscale-only access, but set
  `SITE_USERNAME`/`SITE_PASSWORD` before using `tailscale funnel`.
- Matching is only as good as spotdl/YouTube Music's search — an
  occasional track will fail to match. Failed tracks are shown clearly in
  the UI and simply left out of the `.m3u`.
