import { useEffect, useState } from "react";
import { History, ListMusic, AlertTriangle, Loader2 } from "lucide-react";
import { getHistory } from "../api.js";

function formatWhen(unixSeconds) {
  if (!unixSeconds) return "";
  const date = new Date(unixSeconds * 1000);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function HistoryPanel() {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getHistory()
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Couldn't load history.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-3 rounded-clay bg-clay-surface p-4 shadow-clay-raised">
      <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-clay-soft">
        <History className="h-3.5 w-3.5" aria-hidden="true" />
        Download history
      </span>

      {error && (
        <p className="flex items-center gap-2 text-sm text-coral">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {!entries && !error && (
        <p className="flex items-center gap-2 text-sm text-clay-soft">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading…
        </p>
      )}

      {entries && entries.length === 0 && (
        <p className="text-sm text-clay-soft">Nothing downloaded yet.</p>
      )}

      {entries && entries.length > 0 && (
        <ul className="clay-scroll flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="rounded-clay-sm bg-clay-bg p-3 shadow-clay-pressed-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-body text-sm font-medium text-clay-ink">
                  {entry.playlist_name}
                </p>
                <span className="shrink-0 text-xs text-clay-soft">
                  {formatWhen(entry.finished_at || entry.created_at)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-clay-soft">
                <span>{entry.destination}</span>
                <span>
                  {entry.completed}/{entry.total} downloaded
                </span>
                {entry.failed > 0 && (
                  <span className="text-coral">{entry.failed} failed</span>
                )}
                {entry.m3u_path && (
                  <span className="flex items-center gap-1">
                    <ListMusic className="h-3 w-3" aria-hidden="true" />
                    {entry.m3u_track_count} in .m3u
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
