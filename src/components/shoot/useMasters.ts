"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { BrandDTO, ResourceDTO } from "@/lib/types";

// Active brands/resources for pickers, cached for the session and refreshed on open.
let cache: { brands: BrandDTO[]; resources: ResourceDTO[] } | null = null;

export function useMasters(enabled: boolean) {
  const [data, setData] = useState(cache);
  const load = useCallback(async () => {
    const [b, r] = await Promise.all([api<{ brands: BrandDTO[] }>("/api/brands?active=1"), api<{ resources: ResourceDTO[] }>("/api/resources?active=1")]);
    cache = { brands: b.brands, resources: r.resources };
    setData(cache);
  }, []);
  useEffect(() => {
    if (enabled) load().catch(() => {});
  }, [enabled, load]);
  const addBrand = (brand: BrandDTO) => {
    cache = { brands: [...(cache?.brands ?? []), brand].sort((a, b) => a.name.localeCompare(b.name)), resources: cache?.resources ?? [] };
    setData(cache);
  };
  return { brands: data?.brands ?? [], resources: data?.resources ?? [], loaded: !!data, addBrand };
}
