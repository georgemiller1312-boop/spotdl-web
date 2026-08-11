import { useCallback, useEffect, useRef, useState } from "react";
import { Disc3, AlertTriangle, Music2, History as HistoryIcon } from "lucide-react";
import PlaylistForm from "./components/PlaylistForm.jsx";
import PlaylistHeader from "./components/PlaylistHeader.jsx";
import TrackList from "./components/TrackList.jsx";
import DestinationPicker from "./components/DestinationPicker.jsx";
import NetworkDestinationForm, { EMPTY_NETWORK_CONFIG } from "./components/NetworkDestinationForm.jsx";
import DownloadPanel from "./components/DownloadPanel.jsx";
import HistoryPanel from "./components/HistoryPanel.jsx";
import { fetchPlaylist, startDownload, getJob, getDestinations } from "./api.js";

const POLL_MS = 1200;

export default function App() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [playlist, setPlaylist] = useState(null);
  const [selectedKeys, setSelectedKeys] = useState(new Set());

  const [destinations, setDestinations] = useState([]);
  const [destination, setDestination] = useState(null);

  const [networkEnabled, setNetworkEnabled] = useState(false);
  const [networkConfig, setNetworkConfig] = useState(EMPTY_NETWORK_CONFIG);

  const [starting, setStarting] = useState(false);
  const [job, setJob] = useState(null);
  const pollRef = useRef(null);

  const [showHistory, setShowHistory] = useState(false);
  const [historyKey, setHistoryKey] = useState(0); // bump to force HistoryPanel to refetch

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  useEffect(() => {
    getDestinations()
      .then((data) => {
        setDestinations(data.destinations);
        setDestination(data.default);
      })
      .catch(() => {
        // Non-fatal — the backend will just use its own default destination.
      });
  }, []);

  async function handleFetchPlaylist() {
    setLoading(true);
    setError(null);
    setJob(null);
    stopPolling();
    try {
      const data = await fetchPlaylist(url.trim());
      setPlaylist(data);
      setSelectedKeys(new Set(data.songs.map((s) => s.key)));
    } catch (err) {
      setPlaylist(null);
      setError(err.message || "Couldn't fetch that playlist.");
    } finally {
      setLoading(false);
    }
  }

  function toggleTrack(key) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleDownload() {
    if (!playlist || selectedKeys.size === 0) return;
    setStarting(true);
    setError(null);
    try {
      const allSelected = selectedKeys.size === playlist.songs.length;
      const { job_id } = await startDownload(
        playlist.url,
        allSelected ? null : Array.from(selectedKeys),
        networkEnabled ? null : destination,
        networkEnabled ? networkConfig : null
      );
      const initial = await getJob(job_id);
      setJob(initial);

      pollRef.current = setInterval(async () => {
        try {
          const latest = await getJob(job_id);
          setJob(latest);
          if (latest.status === "complete") {
            stopPolling();
            setHistoryKey((k) => k + 1); // refresh history once this job lands
          }
        } catch {
          stopPolling();
        }
      }, POLL_MS);
    } catch (err) {
      setError(err.message || "Couldn't start the download.");
    } finally {
      setStarting(false);
    }
  }

  const trackStatuses = job ? job.tracks : null;

  return (
    <div className="min-h-screen px-4 py-10 sm:py-16">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pine text-clay-surface shadow-clay-pine">
              <Disc3 className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-clay-ink sm:text-2xl">spotdl web</h1>
              <p className="text-sm text-clay-soft">Playlist in, tracks and an .m3u out.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            aria-pressed={showHistory}
            aria-label="Toggle download history"
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all duration-150 active:scale-95 ${
              showHistory
                ? "bg-pine text-clay-surface shadow-clay-pine-pressed"
                : "bg-clay-surface text-clay-soft shadow-clay-raised-sm"
            }`}
          >
            <HistoryIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        {showHistory && <HistoryPanel key={historyKey} />}

        <PlaylistForm
          url={url}
          onUrlChange={setUrl}
          onSubmit={handleFetchPlaylist}
          loading={loading}
        />

        {error && (
          <div className="flex items-start gap-2 rounded-clay-sm bg-clay-surface p-4 text-sm text-coral shadow-clay-raised-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {playlist && (
          <>
            <PlaylistHeader
              playlist={playlist}
              selectedCount={selectedKeys.size}
              onSelectAll={() => setSelectedKeys(new Set(playlist.songs.map((s) => s.key)))}
              onSelectNone={() => setSelectedKeys(new Set())}
            />

            <TrackList
              tracks={playlist.songs}
              selectedKeys={selectedKeys}
              onToggle={toggleTrack}
              trackStatuses={trackStatuses}
            />

            <DestinationPicker
              destinations={destinations}
              selected={destination}
              onSelect={setDestination}
            />

            <NetworkDestinationForm
              enabled={networkEnabled}
              onToggle={setNetworkEnabled}
              config={networkConfig}
              onChange={setNetworkConfig}
            />

            <DownloadPanel
              selectedCount={selectedKeys.size}
              totalCount={playlist.songs.length}
              onDownload={handleDownload}
              job={job}
              busy={starting}
            />
          </>
        )}

        {!playlist && !loading && !error && (
          <div className="flex flex-col items-center gap-3 rounded-clay bg-clay-surface p-10 text-center shadow-clay-raised">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-clay-bg shadow-clay-pressed-sm">
              <Music2 className="h-6 w-6 text-clay-soft" aria-hidden="true" />
            </div>
            <p className="max-w-sm text-sm text-clay-soft">
              Paste a Spotify playlist link above to see its tracks, pick the
              ones you want, and send them to spotdl.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
