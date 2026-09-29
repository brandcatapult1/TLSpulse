"use client";

import { ExternalLink, MapPin, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DEFAULT_CENTER, loadMaps, MAP_ID, MAPS_KEY } from "@/lib/maps";
import { mapsUrl } from "@/lib/maps-url";
import { Button, Input } from "../ui";

export type LocationValue = { location: string; lat: number | null; lng: number | null; placeId: string | null };

/** Location text plus an optional Google Maps pin (search a place, or drop/drag the pin). */
export function LocationPicker({ value, onChange, recent }: { value: LocationValue; onChange: (v: LocationValue) => void; recent: string[] }) {
  const [open, setOpen] = useState(false);
  const pinned = value.lat != null && value.lng != null;
  const link = mapsUrl({ location: value.location, locationLat: value.lat, locationLng: value.lng, locationPlaceId: value.placeId });

  return (
    <div>
      <div className="flex gap-2">
        <Input
          id="location"
          list="recent-locations"
          value={value.location}
          onChange={(e) => onChange({ ...value, location: e.target.value })}
          placeholder="e.g. Aerocity, New Delhi"
        />
        {MAPS_KEY && (
          <Button variant="outline" onClick={() => setOpen(true)} title="Search and pin on Google Maps">
            <MapPin size={15} /> {pinned ? "Move pin" : "Pin on map"}
          </Button>
        )}
      </div>
      <datalist id="recent-locations">
        {recent.map((l) => (
          <option key={l} value={l} />
        ))}
      </datalist>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {pinned ? (
          <span className="inline-flex items-center gap-1 font-medium text-ok">
            <MapPin size={12} /> Pinned on Google Maps
          </span>
        ) : (
          !MAPS_KEY && <span className="text-muted">Map pinning turns on once a Google Maps key is added.</span>
        )}
        {link && (
          <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted hover:text-ink">
            <ExternalLink size={12} /> {pinned ? "Open in Google Maps" : "Search on Google Maps"}
          </a>
        )}
        {pinned && (
          <button type="button" onClick={() => onChange({ ...value, lat: null, lng: null, placeId: null })} className="inline-flex items-center gap-1 text-muted hover:text-danger">
            <X size={12} /> Remove pin
          </button>
        )}
      </div>
      {open && (
        <MapDialog
          initial={value}
          onClose={() => setOpen(false)}
          onPick={(v) => {
            onChange(v);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

function MapDialog({ initial, onClose, onPick }: { initial: LocationValue; onClose: () => void; onPick: (v: LocationValue) => void }) {
  const mapEl = useRef<HTMLDivElement>(null);
  const searchEl = useRef<HTMLDivElement>(null);
  const [picked, setPicked] = useState<LocationValue>(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const cleanups: (() => void)[] = [];
    (async () => {
      try {
        const { maps, places, marker, geocoding } = await loadMaps();
        if (cancelled || !mapEl.current || !searchEl.current) return;
        const start = initial.lat != null && initial.lng != null ? { lat: initial.lat, lng: initial.lng } : DEFAULT_CENTER;
        const map = new maps.Map(mapEl.current, { center: start, zoom: initial.lat != null ? 16 : 11, mapId: MAP_ID, streetViewControl: false, mapTypeControl: false, clickableIcons: true });
        const pin = new marker.AdvancedMarkerElement({ map, position: initial.lat != null ? start : null, gmpDraggable: true, title: "Shoot location" });
        const geocoder = new geocoding.Geocoder();

        // Dropping or dragging the pin: look up the address for that spot.
        const placeAt = async (pos: google.maps.LatLngLiteral, placeId?: string | null) => {
          pin.position = pos;
          setPicked((p) => ({ ...p, lat: pos.lat, lng: pos.lng, placeId: placeId ?? null }));
          try {
            const { results } = await geocoder.geocode(placeId ? { placeId } : { location: pos });
            const r = results[0];
            if (r && !cancelled) setPicked((p) => ({ ...p, location: p.location && placeId ? p.location : r.formatted_address, placeId: placeId ?? r.place_id ?? null }));
          } catch {
            /* address lookup is best-effort */
          }
        };
        const onMapClick = map.addListener("click", (e: google.maps.MapMouseEvent & { placeId?: string }) => {
          if (!e.latLng) return;
          if (e.placeId) e.stop?.(); // clicked a POI: use it instead of Google's info window
          placeAt(e.latLng.toJSON(), e.placeId ?? null);
        });
        const onDrag = pin.addListener("dragend", () => {
          const p = pin.position as google.maps.LatLngLiteral | google.maps.LatLng | null;
          if (p) placeAt("lat" in p && typeof p.lat === "function" ? (p as google.maps.LatLng).toJSON() : (p as google.maps.LatLngLiteral));
        });
        cleanups.push(() => onMapClick.remove(), () => onDrag.remove());

        // Place search (Places API New).
        const ac = new places.PlaceAutocompleteElement({ includedRegionCodes: ["in"], locationBias: start });
        ac.style.width = "100%";
        searchEl.current.replaceChildren(ac);
        const onSelect = async (ev: Event) => {
          const place = (ev as unknown as { placePrediction: google.maps.places.PlacePrediction }).placePrediction.toPlace();
          await place.fetchFields({ fields: ["displayName", "formattedAddress", "location", "id"] });
          if (!place.location || cancelled) return;
          const pos = place.location.toJSON();
          pin.position = pos;
          map.panTo(pos);
          map.setZoom(17);
          const name = place.displayName && place.formattedAddress && !place.formattedAddress.startsWith(place.displayName) ? `${place.displayName}, ${place.formattedAddress}` : (place.formattedAddress ?? place.displayName ?? "");
          setPicked({ location: name, lat: pos.lat, lng: pos.lng, placeId: place.id ?? null });
        };
        ac.addEventListener("gmp-select", onSelect);
        cleanups.push(() => ac.removeEventListener("gmp-select", onSelect));
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message || "Couldn't load Google Maps");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      cleanups.forEach((c) => c());
    };
  }, [initial]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (e.stopPropagation(), onClose());
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[65] grid place-items-center p-3">
      <div className="anim-fade absolute inset-0 bg-black/40" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Pin location on Google Maps" className="anim-rise relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="font-semibold">Pin the shoot location</h2>
          <button aria-label="Close" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-soft">
            <X size={18} />
          </button>
        </div>
        <div className="px-4 pb-2">
          <div ref={searchEl} className="min-h-10" />
          <p className="mt-1 text-xs text-muted">Search a place, or click the map / drag the pin to the exact spot.</p>
        </div>
        <div className="relative h-[46vh] min-h-64 bg-soft">
          <div ref={mapEl} className="absolute inset-0" />
          {loading && <div className="absolute inset-0 grid place-items-center text-sm text-muted">Loading Google Maps…</div>}
          {error && (
            <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-danger">
              {error}. Check the key and that Maps JavaScript API, Places API (New) and Geocoding API are enabled.
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
          <p className="min-w-0 flex-1 truncate text-sm">{picked.lat != null ? picked.location || "Pinned spot" : <span className="text-muted">No pin yet</span>}</p>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={picked.lat == null} onClick={() => onPick(picked)}>
            Use this location
          </Button>
        </div>
      </div>
    </div>
  );
}
