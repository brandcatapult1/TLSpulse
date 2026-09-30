"use client";

import clsx from "clsx";
import { Clock, ExternalLink, Loader2, MapPin, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_CENTER, loadMaps, MAP_ID, MAPS_KEY } from "@/lib/maps";
import { mapsUrl } from "@/lib/maps-url";
import { Input } from "../ui";

export type LocationValue = { location: string; lat: number | null; lng: number | null; placeId: string | null };

type Suggestion =
  | { kind: "place"; id: string; main: string; secondary: string; prediction: google.maps.places.PlacePrediction }
  | { kind: "recent"; id: string; main: string; secondary: string };

type Maps = Awaited<ReturnType<typeof loadMaps>>;

/**
 * Location field with Google place suggestions as you type and a map underneath.
 * Picking a suggestion drops the pin; clicking the map or dragging the pin fine-tunes it.
 * Without a Maps key it's a plain text field with recent-location suggestions.
 */
export function LocationPicker({ value, onChange, recent }: { value: LocationValue; onChange: (v: LocationValue) => void; recent: string[] }) {
  const pinned = value.lat != null && value.lng != null;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [lib, setLib] = useState<Maps | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const session = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  // Load Google Maps once (only when a key is configured).
  useEffect(() => {
    if (!MAPS_KEY) return;
    let live = true;
    loadMaps()
      .then((m) => live && setLib(m))
      .catch((e) => live && setMapsError((e as Error).message || "Couldn't load Google Maps"));
    return () => {
      live = false;
    };
  }, []);

  // Close the list when clicking elsewhere.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Suggestions: Google places while typing; recent locations for an empty field.
  const query = value.location.trim();
  useEffect(() => {
    if (!open) return;
    const recentList = (q: string) =>
      recent
        .filter((r) => !q || r.toLowerCase().includes(q.toLowerCase()))
        .slice(0, 5)
        .map((r): Suggestion => ({ kind: "recent", id: `r:${r}`, main: r, secondary: "Used before" }));

    if (!lib || query.length < 2) {
      setSuggestions(recentList(query));
      setSearching(false);
      return;
    }
    let live = true;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        session.current ??= new lib.places.AutocompleteSessionToken();
        const near = valueRef.current.lat != null ? { lat: valueRef.current.lat!, lng: valueRef.current.lng! } : DEFAULT_CENTER;
        const { suggestions: res } = await lib.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query,
          sessionToken: session.current,
          includedRegionCodes: ["in"],
          locationBias: { center: near, radius: 50000 },
        });
        if (!live) return;
        const places: Suggestion[] = res
          .filter((s) => s.placePrediction)
          .slice(0, 5)
          .map((s) => {
            const p = s.placePrediction!;
            return { kind: "place", id: p.placeId, main: p.mainText?.text ?? p.text.text, secondary: p.secondaryText?.text ?? "", prediction: p };
          });
        setSuggestions(places.length ? places : recentList(query));
        setActive(0);
      } catch {
        if (live) setSuggestions(recentList(query));
      } finally {
        if (live) setSearching(false);
      }
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [query, open, lib, recent]);

  async function choose(s: Suggestion) {
    setOpen(false);
    if (s.kind === "recent") {
      onChange({ location: s.main, lat: null, lng: null, placeId: null });
      return;
    }
    const place = s.prediction.toPlace();
    session.current = null; // fetchFields ends the billing session
    try {
      await place.fetchFields({ fields: ["displayName", "formattedAddress", "location", "id"] });
      const pos = place.location?.toJSON();
      const name =
        place.displayName && place.formattedAddress && !place.formattedAddress.startsWith(place.displayName)
          ? `${place.displayName}, ${place.formattedAddress}`
          : (place.formattedAddress ?? place.displayName ?? s.main);
      onChange({ location: name, lat: pos?.lat ?? null, lng: pos?.lng ?? null, placeId: place.id ?? s.id });
    } catch {
      onChange({ location: [s.main, s.secondary].filter(Boolean).join(", "), lat: null, lng: null, placeId: null });
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || !suggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(suggestions[active]);
    } else if (e.key === "Escape") {
      e.stopPropagation();
      setOpen(false);
    }
  }

  const link = mapsUrl({ location: value.location, locationLat: value.lat, locationLng: value.lng, locationPlaceId: value.placeId });

  return (
    <div ref={box} className="relative">
      <div className="relative">
        <MapPin size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <Input
          id="location"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          maxLength={200}
          value={value.location}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            // Typing means searching for a (possibly different) place, so the old pin no longer applies.
            onChange({ location: e.target.value, lat: null, lng: null, placeId: null });
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder={MAPS_KEY ? "Search a place on Google Maps…" : "e.g. Aerocity, New Delhi"}
          className="pr-9 pl-9"
        />
        {searching ? (
          <Loader2 size={15} className="absolute top-1/2 right-3 -translate-y-1/2 animate-spin text-muted" />
        ) : (
          value.location && (
            <button
              type="button"
              aria-label="Clear location"
              onClick={() => onChange({ location: "", lat: null, lng: null, placeId: null })}
              className="absolute top-1/2 right-2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-muted hover:bg-soft hover:text-ink"
            >
              <X size={14} />
            </button>
          )
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul role="listbox" className="anim-fade absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-lg">
          {suggestions.map((s, i) => (
            <li key={s.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(s)}
                className={clsx("flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left", i === active && "bg-soft")}
              >
                {s.kind === "place" ? <MapPin size={15} className="mt-0.5 shrink-0 text-muted" /> : <Clock size={15} className="mt-0.5 shrink-0 text-muted" />}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{s.main}</span>
                  {s.secondary && <span className="block truncate text-xs text-muted">{s.secondary}</span>}
                </span>
              </button>
            </li>
          ))}
          {suggestions.some((s) => s.kind === "place") && <li className="px-3 pt-1 pb-0.5 text-right text-[10px] text-muted">Suggestions by Google</li>}
        </ul>
      )}

      {MAPS_KEY && (
        <>
          <InlineMap lib={lib} error={mapsError} value={value} onPin={onChange} />
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className={clsx("inline-flex items-center gap-1", pinned ? "font-medium text-ok" : "text-muted")}>
              <MapPin size={12} /> {pinned ? "Pinned on Google Maps" : "Pick a suggestion, or click the map to drop a pin"}
            </span>
            {link && (
              <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted hover:text-ink">
                <ExternalLink size={12} /> Open in Google Maps
              </a>
            )}
            {pinned && (
              <button type="button" onClick={() => onChange({ ...value, lat: null, lng: null, placeId: null })} className="inline-flex items-center gap-1 text-muted hover:text-danger">
                <X size={12} /> Remove pin
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** Small map under the field: shows the pin; click or drag to move it. */
function InlineMap({ lib, error, value, onPin }: { lib: Maps | null; error: string | null; value: LocationValue; onPin: (v: LocationValue) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const pin = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const onPinRef = useRef(onPin);
  onPinRef.current = onPin;

  const placeAt = useCallback(
    async (pos: google.maps.LatLngLiteral, placeId: string | null) => {
      if (!lib) return;
      // Save the spot right away; fill in the address if Google can look it up.
      onPinRef.current({ ...valueRef.current, lat: pos.lat, lng: pos.lng, placeId });
      try {
        const { results } = await new lib.geocoding.Geocoder().geocode(placeId ? { placeId } : { location: pos });
        const r = results[0];
        if (r) onPinRef.current({ ...valueRef.current, location: r.formatted_address, lat: pos.lat, lng: pos.lng, placeId: placeId ?? r.place_id ?? null });
      } catch {
        /* address lookup is best-effort (needs Geocoding API + billing) */
      }
    },
    [lib],
  );

  // Create the map once.
  useEffect(() => {
    if (!lib || !el.current || map.current) return;
    const v = valueRef.current;
    const start = v.lat != null && v.lng != null ? { lat: v.lat, lng: v.lng } : DEFAULT_CENTER;
    map.current = new lib.maps.Map(el.current, {
      center: start,
      zoom: v.lat != null ? 16 : 11,
      mapId: MAP_ID,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
      clickableIcons: true,
      gestureHandling: "cooperative",
    });
    pin.current = new lib.marker.AdvancedMarkerElement({ map: map.current, position: v.lat != null ? start : null, gmpDraggable: true, title: "Shoot location" });
    const onClick = map.current.addListener("click", (e: google.maps.MapMouseEvent & { placeId?: string }) => {
      if (!e.latLng) return;
      if (e.placeId) e.stop?.();
      placeAt(e.latLng.toJSON(), e.placeId ?? null);
    });
    const onDrag = pin.current.addListener("dragend", () => {
      const p = pin.current?.position;
      if (!p) return;
      const pos = typeof (p as google.maps.LatLng).lat === "function" ? (p as google.maps.LatLng).toJSON() : (p as google.maps.LatLngLiteral);
      placeAt(pos, null);
    });
    return () => {
      onClick.remove();
      onDrag.remove();
    };
  }, [lib, placeAt]);

  // Keep the pin in step with the field (suggestion picked, pin removed, text typed).
  useEffect(() => {
    if (!map.current || !pin.current) return;
    if (value.lat != null && value.lng != null) {
      const pos = { lat: value.lat, lng: value.lng };
      pin.current.position = pos;
      map.current.panTo(pos);
      if ((map.current.getZoom() ?? 0) < 15) map.current.setZoom(16);
    } else {
      pin.current.position = null;
    }
  }, [value.lat, value.lng]);

  return (
    <div className="relative mt-2 h-48 overflow-hidden rounded-xl border border-line bg-soft">
      <div ref={el} className="absolute inset-0" />
      {!lib && !error && <div className="absolute inset-0 grid place-items-center text-xs text-muted">Loading map…</div>}
      {error && <div className="absolute inset-0 grid place-items-center p-4 text-center text-xs text-danger">Map unavailable: {error}</div>}
    </div>
  );
}
