import { Music2 } from "lucide-react";
import ClayButton from "./ClayButton.jsx";

export default function PlaylistHeader({ playlist, selectedCount, onSelectAll, onSelectNone }) {
  return (
    <div className="flex flex-col gap-4 rounded-clay bg-clay-surface p-4 shadow-clay-raised sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-clay-sm bg-clay-bg shadow-clay-pressed-sm">
          {playlist.cover_url ? (
            <img
              src={playlist.cover_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <Music2 className="h-8 w-8 text-clay-soft" aria-hidden="true" />
          )}
        </div>
        <div>
          <h2 className="text-xl font-bold leading-tight text-clay-ink sm:text-2xl">
            {playlist.name}
          </h2>
          <p className="mt-1 text-sm text-clay-soft">
            {playlist.owner ? `by ${playlist.owner} · ` : ""}
            {playlist.total} track{playlist.total === 1 ? "" : "s"} ·{" "}
            {selectedCount} selected
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2 self-start sm:self-auto">
        <ClayButton size="sm" onClick={onSelectAll}>
          Select all
        </ClayButton>
        <ClayButton size="sm" onClick={onSelectNone}>
          Select none
        </ClayButton>
      </div>
    </div>
  );
}
