export function minutesAgo(iso: string, now = Date.now()) {
  const then = new Date(iso).getTime();
  const minutes = Math.max(0, Math.round((now - then) / 60000));
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 min ago";
  return `${minutes} min ago`;
}
