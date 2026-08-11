import { Check, Music2, Loader2, X } from "lucide-react";
import { formatDuration } from "../utils.js";

const STATUS_META = {
  downloading: { icon: Loader2, spin: true, className: "text-pine" },
  done: { icon: Check, spin: false, className: "text-pine" },
  error: { icon: X, spin: false, className: "text-coral" },
};

export default function TrackRow({ track, selected, onToggle, status }) {
  const meta = status && STATUS_META[status.status];

  return (
    <li
      className={`flex items-center gap-3 rounded-clay-sm px-3 py-2.5 transition-shadow ${
        selected ? "bg-clay-bg shadow-clay-pressed-sm" : "bg-transparent"
      }`}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={selected}
        aria-label={`${selected ? "Deselect" : "Select"} ${track.title}`}
        onClick={() => onToggle(track.key)}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-150 active:scale-95 ${
          selected
            ? "bg-pine text-clay-surface shadow-clay-pine-pressed"
            : "bg-clay-surface text-transparent shadow-clay-raised-sm"
        }`}
      >
        <Check className="h-4 w-4" aria-hidden="true" />
      </button>

      <span className="w-6 shrink-0 text-right font-body text-xs text-clay-soft">
        {track.position}
      </span>

      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-clay-bg">
        {track.cover_url ? (
          <img src={track.cover_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Music2 className="h-4 w-4 text-clay-soft" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-body text-sm font-medium text-clay-ink">
          {track.title}
          {track.explicit && (
            <span className="ml-1.5 rounded bg-clay-deep px-1 py-0.5 align-middle text-[10px] font-semibold text-clay-soft">
              E
            </span>
          )}
        </p>
        <p className="truncate text-xs text-clay-soft">{track.artists.join(", ")}</p>
      </div>

      <span className="shrink-0 font-body text-xs text-clay-soft">
        {formatDuration(track.duration)}
      </span>

      <div className="flex w-5 shrink-0 justify-center">
        {meta && (
          <meta.icon
            className={`h-4 w-4 ${meta.className} ${meta.spin ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
        )}
      </div>
    </li>
  );
}
