"use client";

import clsx from "clsx";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { BrandDTO } from "@/lib/types";
import { Input } from "../ui";

/** Searchable brand picker with inline “+ Create” (PRD §17). */
export function BrandCombobox({
  brands,
  value,
  fallbackName,
  onChange,
  onCreated,
  invalid,
  canCreate: allowCreate,
}: {
  canCreate: boolean;
  brands: BrandDTO[];
  value: string;
  fallbackName?: string;
  onChange: (id: string) => void;
  onCreated: (b: BrandDTO) => void;
  invalid?: boolean;
}) {
  const selected = brands.find((b) => b.id === value);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return brands;
    return brands.filter((b) => b.name.toLowerCase().includes(needle) || b.companyGroup?.toLowerCase().includes(needle));
  }, [brands, q]);
  const exact = brands.some((b) => b.name.toLowerCase() === q.trim().toLowerCase());
  const canCreate = allowCreate && q.trim().length > 0 && !exact;
  const count = matches.length + (canCreate ? 1 : 0);

  function pick(id: string) {
    onChange(id);
    setOpen(false);
    setQ("");
  }

  async function create() {
    setCreating(true);
    setError(null);
    try {
      const { brand } = await api<{ brand: BrandDTO }>("/api/brands", { body: { name: q.trim() } });
      onCreated(brand);
      pick(brand.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div ref={box} className="relative">
      <div className="relative">
        <Input
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          value={open ? q : selected?.name ?? fallbackName ?? ""}
          placeholder="Search brand…"
          onFocus={() => {
            setOpen(true);
            setActive(0);
          }}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, count - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (active < matches.length) pick(matches[active].id);
              else if (canCreate) create();
            } else if (e.key === "Escape") {
              e.stopPropagation();
              setOpen(false);
            }
          }}
          className={clsx("pr-9", invalid && "border-danger")}
        />
        <ChevronsUpDown size={15} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted" />
      </div>
      {open && (
        <div className="anim-fade absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-lg">
          {matches.map((b, i) => (
            <button
              key={b.id}
              type="button"
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(b.id)}
              className={clsx("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm", active === i && "bg-soft")}
            >
              <span className="flex-1">
                {b.name}
                {b.companyGroup && <span className="ml-1.5 text-xs text-muted">{b.companyGroup}</span>}
              </span>
              {b.id === value && <Check size={15} className="text-social" />}
            </button>
          ))}
          {canCreate && (
            <button
              type="button"
              disabled={creating}
              onMouseEnter={() => setActive(matches.length)}
              onClick={create}
              className={clsx("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-social", active === matches.length && "bg-soft")}
            >
              <Plus size={15} /> {creating ? "Creating…" : `Create new brand “${q.trim()}”`}
            </button>
          )}
          {!matches.length && !canCreate && (
            <p className="px-3 py-2 text-sm text-muted">
              {allowCreate ? "No brands yet. Type a name to create one." : q.trim() ? `No brand called “${q.trim()}”. Ask an admin to add it.` : "No brands yet. Ask an admin to add them."}
            </p>
          )}
          {error && <p className="px-3 py-2 text-sm text-danger">{error}</p>}
        </div>
      )}
    </div>
  );
}
