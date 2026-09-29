// Google Maps links work without an API key, so they're available everywhere (incl. /bookings).
export function mapsUrl(p: { location?: string | null; locationLat?: number | null; locationLng?: number | null; locationPlaceId?: string | null }): string | null {
  if (p.locationLat != null && p.locationLng != null) {
    const q = new URLSearchParams({ api: "1", query: `${p.locationLat},${p.locationLng}` });
    if (p.locationPlaceId) q.set("query_place_id", p.locationPlaceId);
    return `https://www.google.com/maps/search/?${q.toString()}`;
  }
  if (p.location?.trim()) return `https://www.google.com/maps/search/?${new URLSearchParams({ api: "1", query: p.location.trim() }).toString()}`;
  return null;
}
