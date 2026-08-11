import { Link2, Loader2, ArrowRight } from "lucide-react";

export default function PlaylistForm({ url, onUrlChange, onSubmit, loading }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!loading) onSubmit();
      }}
      className="flex flex-col gap-3 rounded-clay bg-clay-surface p-3 shadow-clay-raised sm:flex-row sm:items-center"
    >
      <div className="flex flex-1 items-center gap-3 rounded-clay-sm bg-clay-bg px-4 py-3 shadow-clay-pressed-sm">
        <Link2 className="h-5 w-5 shrink-0 text-clay-soft" aria-hidden="true" />
        <input
          type="text"
          inputMode="url"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="Paste a Spotify playlist link…"
          className="w-full bg-transparent font-body text-clay-ink placeholder:text-clay-soft focus:outline-none"
          aria-label="Spotify playlist link"
        />
      </div>
      <button
        type="submit"
        disabled={loading || !url.trim()}
        className="inline-flex items-center justify-center gap-2 rounded-clay-sm bg-pine px-6 py-3.5 font-display font-semibold text-clay-surface shadow-clay-pine transition-all duration-150 hover:bg-pine-light active:scale-[0.98] active:shadow-clay-pine-pressed disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            Fetching…
          </>
        ) : (
          <>
            Get tracks
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </>
        )}
      </button>
    </form>
  );
}
