async function request(path, options) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // response wasn't JSON — fall back to statusText
    }
    throw new Error(detail);
  }

  return res.json();
}

export function fetchPlaylist(url) {
  return request("/api/playlist", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

export function getDestinations() {
  return request("/api/destinations");
}

export function testNetworkDestination(config) {
  return request("/api/network-destination/test", {
    method: "POST",
    body: JSON.stringify(config),
  });
}

export function startDownload(playlistUrl, trackKeys, destination, network) {
  return request("/api/download", {
    method: "POST",
    body: JSON.stringify({
      playlist_url: playlistUrl,
      track_keys: trackKeys,
      destination,
      network,
    }),
  });
}

export function getJob(jobId) {
  return request(`/api/jobs/${jobId}`);
}

export function getHistory() {
  return request("/api/history");
}
