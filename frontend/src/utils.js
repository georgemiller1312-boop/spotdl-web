export function formatDuration(totalSeconds) {
  if (!totalSeconds && totalSeconds !== 0) return "";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}
