const JOIN_PATH =
  /^\/q\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export function joinPathFromQr(raw: string, origin: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed, origin);
    if (url.origin !== origin) return null;
    const match = url.pathname.match(JOIN_PATH);
    return match ? `/q/${match[1].toLowerCase()}` : null;
  } catch {
    return null;
  }
}
