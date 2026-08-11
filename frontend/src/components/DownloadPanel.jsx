import { Download, Loader2, CheckCircle2, AlertTriangle, ListMusic } from "lucide-react";
import ClayButton from "./ClayButton.jsx";

export default function DownloadPanel({ selectedCount, totalCount, onDownload, job, busy }) {
  const isAll = selectedCount === totalCount;
  const label = selectedCount === 0
    ? "Select at least one track"
    : `Download ${isAll ? `all ${totalCount}` : selectedCount} track${selectedCount === 1 ? "" : "s"}`;

  const running = job && job.status !== "complete";
  const done = job && job.status === "complete";
  const progress = job && job.total > 0 ? Math.round(((job.completed + job.failed) / job.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-4 rounded-clay bg-clay-surface p-5 shadow-clay-raised">
      {!job && (
        <ClayButton
          variant="pine"
          onClick={onDownload}
          disabled={selectedCount === 0 || busy}
          className="w-full"
        >
          {busy ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              Starting…
            </>
          ) : (
            <>
              <Download className="h-5 w-5" aria-hidden="true" />
              {label}
            </>
          )}
        </ClayButton>
      )}

      {job && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-display font-semibold text-clay-ink">
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-pine" aria-hidden="true" />
                  Downloading “{job.playlist_name}”
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-pine" aria-hidden="true" />
                  Done with “{job.playlist_name}”
                </>
              )}
            </span>
            <span className="text-clay-soft">
              {job.completed + job.failed} / {job.total}
            </span>
          </div>

          <div className="h-3 w-full overflow-hidden rounded-full bg-clay-bg shadow-clay-pressed-sm">
            <div
              className="h-full rounded-full bg-pine transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-clay-soft">
            <span>{job.completed} downloaded</span>
            {job.failed > 0 && (
              <span className="flex items-center gap-1 text-coral">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                {job.failed} failed
              </span>
            )}
          </div>

          {done && (
            <div className="mt-1 flex flex-col gap-2 rounded-clay-sm bg-clay-bg p-3 shadow-clay-pressed-sm">
              {job.m3u_path ? (
                <p className="flex items-start gap-2 text-sm text-clay-ink">
                  <ListMusic className="mt-0.5 h-4 w-4 shrink-0 text-pine" aria-hidden="true" />
                  <span>
                    Wrote <span className="font-medium">{job.m3u_track_count}</span> track
                    {job.m3u_track_count === 1 ? "" : "s"} to{" "}
                    <code className="break-all text-xs text-clay-soft">{job.m3u_path}</code>
                  </span>
                </p>
              ) : (
                <p className="text-sm text-clay-soft">
                  No .m3u was written — none of this playlist's tracks made it to disk yet.
                </p>
              )}
              {job.error && (
                <p className="flex items-start gap-2 text-sm text-coral">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {job.error}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
