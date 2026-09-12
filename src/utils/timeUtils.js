function pad(n) {
  return n < 10 ? `0${n}` : `${n}`;
}

/** 225000 -> "3:45", 3725000 -> "1:02:05" */
export function formatDuration(millis) {
  if (!millis || !isFinite(millis) || millis < 0) return '0:00';
  const totalSec = Math.floor(millis / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

/** 8100000 -> "2 hr 15 min", 2700000 -> "45 min" */
export function formatLongDuration(millis) {
  if (!millis || !isFinite(millis) || millis <= 0) return '0 min';
  const totalMin = Math.round(millis / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0 && m > 0) return `${h} hr ${m} min`;
  if (h > 0) return `${h} hr`;
  return `${m} min`;
}

/** Relative day label for "Recently Added" grouping */
export function formatRelativeDate(timestamp) {
  if (!timestamp) return '';
  const now = new Date();
  const date = new Date(timestamp);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diffDays = Math.floor((startOfToday - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) / 86400000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

export function msToSeconds(ms) {
  return (ms || 0) / 1000;
}

export function secondsToMs(sec) {
  return Math.round((sec || 0) * 1000);
}
