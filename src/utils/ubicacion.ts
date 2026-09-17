// Ported from v1's geocoding helpers (index.html ~line 5201-5273): extract lat/lng
// directly from a pasted Google Maps link or a raw "lat,lng" pair — covers the common
// "share this pin" case without needing a full address geocoder.

export function parseCoords(text: string): [number, number] | null {
  if (!text) return null;
  const trimmed = text.trim();

  const direct = trimmed.match(/^(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)$/);
  if (direct) {
    const lat = parseFloat(direct[1]);
    const lng = parseFloat(direct[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return [lat, lng];
  }

  const at = trimmed.match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
  if (at) return [parseFloat(at[1]), parseFloat(at[2])];

  const q = trimmed.match(/[?&]q=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
  if (q) return [parseFloat(q[1]), parseFloat(q[2])];

  const ll = trimmed.match(/[?&]ll=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
  if (ll) return [parseFloat(ll[1]), parseFloat(ll[2])];

  const place = trimmed.match(/place\/(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
  if (place) return [parseFloat(place[1]), parseFloat(place[2])];

  return null;
}

export function isGoogleMapsUrl(text: string): boolean {
  return (
    !!text &&
    (text.includes("maps.google") ||
      text.includes("google.com/maps") ||
      text.includes("goo.gl") ||
      text.includes("maps.app"))
  );
}

// Shortened links (goo.gl/maps.app.goo.gl) don't embed @lat,lng themselves, and the
// browser can't read a cross-origin redirect's final URL directly — so this follows the
// redirect through a public CORS proxy (same one v1 uses) and parses coordinates out of
// wherever it actually lands.
export async function resolveGoogleMapsUrl(url: string): Promise<[number, number] | null> {
  const proxyUrl = "https://api.allorigins.win/get?url=" + encodeURIComponent(url);
  const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(7000) });
  const data = await res.json();
  const finalUrl: string = data?.status?.url ?? "";
  return finalUrl ? parseCoords(finalUrl) : null;
}
