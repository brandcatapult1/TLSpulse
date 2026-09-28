"use client";

import clsx from "clsx";
import { Search, Tag, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { fmtShort, fmtTime } from "@/lib/dates";
import type { ShootStatus, ShootType } from "@/lib/types";
import { TYPE_META } from "@/lib/ui-meta";

type Results = {
  brands: { id: string; name: string; companyGroup: string | null; status: string }[];
  resources: { id: string; name: string; role: string; teamName: string }[];
  shoots: { id: string; date: string; brandName: string; shootType: ShootType; status: ShootStatus; startTime: string | null }[];
};
type Item = { key: string; group: string; href: string; icon: React.ReactNode; title: React.ReactNode; hint?: string };

const EMPTY: Results = { brands: [], resources: [], shoots: [] };

export function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Results>(EMPTY);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setResults(EMPTY);
      requestAnimationFrame(() => input.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults(EMPTY);
      return;
    }
    setLoading(true);
    const ctrl = { cancelled: false };
    const t = setTimeout(async () => {
      try {
        const r = await api<Results>(`/api/search?q=${encodeURIComponent(q.trim())}`);
        if (!ctrl.cancelled) {
          setResults(r);
          setActive(0);
        }
      } finally {
        if (!ctrl.cancelled) setLoading(false);
      }
    }, 150);
    return () => {
      ctrl.cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  const items: Item[] = useMemo(
    () => [
      ...results.brands.map((b) => ({
        key: `b${b.id}`,
        group: "Brands",
        href: `/reports?brandId=${b.id}`,
        icon: <Tag size={15} />,
        title: b.name,
        hint: [b.companyGroup, b.status === "INACTIVE" ? "Inactive" : null].filter(Boolean).join(" · ") || "Brand report",
      })),
      ...results.shoots.map((s) => {
        const meta = TYPE_META[s.shootType];
        return {
          key: `s${s.id}`,
          group: "Shoots",
          href: `/?m=${s.date.slice(0, 7)}&shoot=${s.id}`,
          icon: <span className={clsx("h-2.5 w-2.5 rounded-full", meta.dot)} />,
          title: (
            <span className={clsx(s.status === "CANCELLED" && "line-through opacity-60")}>
              <span className="tabular text-muted">{fmtShort(s.date)}</span> — {s.brandName} — {meta.short}
            </span>
          ),
          hint: s.startTime ? fmtTime(s.startTime) : undefined,
        };
      }),
      ...results.resources.map((r) => ({
        key: `r${r.id}`,
        group: "Resources",
        href: `/reports?resource=${r.id}`,
        icon: <User size={15} />,
        title: r.name,
        hint: `${r.role} · ${r.teamName}`,
      })),
    ],
    [results],
  );

  function go(item: Item | undefined) {
    if (!item) return;
    onClose();
    router.push(item.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(items[active]);
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  if (!open) return null;
  let lastGroup = "";
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-3 pt-[12vh]">
      <div className="anim-fade absolute inset-0 bg-black/30" onClick={onClose} />
      <div role="dialog" aria-label="Search" className="anim-rise relative w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
        <div className="flex items-center gap-2 border-b border-line px-4">
          <Search size={17} className="text-muted" />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search brands, shoots, people or a date like “18 sep”"
            className="h-12 flex-1 bg-transparent text-base outline-none placeholder:text-muted/70 sm:text-sm"
          />
          <kbd className="hidden rounded border border-line px-1.5 text-[11px] text-muted sm:block">Esc</kbd>
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-1.5">
          {q.trim().length < 2 ? (
            <p className="px-3 py-6 text-center text-sm text-muted">Type at least 2 letters. Typos are fine.</p>
          ) : items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted">{loading ? "Searching…" : `Nothing found for “${q}”`}</p>
          ) : (
            items.map((it, i) => {
              const header = it.group !== lastGroup ? it.group : null;
              lastGroup = it.group;
              return (
                <div key={it.key}>
                  {header && <div className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">{header}</div>}
                  <button
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(it)}
                    className={clsx("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm", i === active && "bg-soft")}
                  >
                    <span className="grid w-4 place-items-center text-muted">{it.icon}</span>
                    <span className="min-w-0 flex-1 truncate">{it.title}</span>
                    {it.hint && <span className="shrink-0 text-xs text-muted">{it.hint}</span>}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

