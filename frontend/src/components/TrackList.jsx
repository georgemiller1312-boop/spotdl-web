import TrackRow from "./TrackRow.jsx";

export default function TrackList({ tracks, selectedKeys, onToggle, trackStatuses }) {
  return (
    <ul className="clay-scroll max-h-[28rem] space-y-1 overflow-y-auto rounded-clay bg-clay-surface p-3 shadow-clay-raised">
      {tracks.map((track) => (
        <TrackRow
          key={track.key}
          track={track}
          selected={selectedKeys.has(track.key)}
          onToggle={onToggle}
          status={trackStatuses?.[track.key]}
        />
      ))}
    </ul>
  );
}
