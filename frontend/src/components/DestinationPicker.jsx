import { FolderOpen } from "lucide-react";

export default function DestinationPicker({ destinations, selected, onSelect }) {
  if (!destinations || destinations.length <= 1) return null;

  return (
    <div className="flex flex-col gap-2 rounded-clay bg-clay-surface p-4 shadow-clay-raised">
      <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-clay-soft">
        <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
        Save to
      </span>
      <div className="flex flex-wrap gap-2">
        {destinations.map((dest) => {
          const isSelected = dest.name === selected;
          return (
            <button
              key={dest.name}
              type="button"
              onClick={() => onSelect(dest.name)}
              title={dest.path}
              className={`rounded-clay-sm px-4 py-2 text-sm font-medium font-display transition-all duration-150 active:scale-[0.98] ${
                isSelected
                  ? "bg-pine text-clay-surface shadow-clay-pine-pressed"
                  : "bg-clay-bg text-clay-ink shadow-clay-raised-sm hover:shadow-clay-raised"
              }`}
            >
              {dest.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
