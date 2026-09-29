"use client";
// Google Maps JS API loader. Needs NEXT_PUBLIC_GOOGLE_MAPS_API_KEY with these APIs enabled:
// Maps JavaScript API, Places API (New), Geocoding API.
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

export const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
// Advanced markers need a Map ID; Google's DEMO_MAP_ID works for development.
export const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";
export const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 }; // New Delhi

let configured = false;

export async function loadMaps() {
  if (!MAPS_KEY) throw new Error("Google Maps key is not set");
  if (!configured) {
    setOptions({ key: MAPS_KEY, v: "weekly", region: "IN", language: "en" });
    configured = true;
  }
  const [maps, places, marker, geocoding] = await Promise.all([importLibrary("maps"), importLibrary("places"), importLibrary("marker"), importLibrary("geocoding")]);
  return { maps, places, marker, geocoding };
}
