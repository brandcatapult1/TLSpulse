"use client";

import clsx from "clsx";
import { AlertTriangle, Check, Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ResourceConflict, ResourceDTO } from "@/lib/types";

/** Multi-select of resources grouped by team, flagging anyone already booked that day (PRD §20–21). */
export function ResourcePicker({
  resources,
  value,
  known,
  onChange,
  conflicts,
}: {
  resources: ResourceDTO[];
  value: string[];
  /** Names for assigned resources that are no longer active (so edits don't lose them). */
  known: { id: string; name: string; role: string }[];
  onChange: (ids: string[]) => void;
  conflicts: ResourceConflict[];
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    requestAnimationFrame(() => input.current?.focus());
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  // Worst conflict per person: clash (blocks) > untimed > same day.
  const busy = useMemo(() => {
    const rank = { clash: 0, untimed: 1, sameDay: 2 } as const;
    const m = new Map<string, ResourceConflict["severity"]>();
    for (const c of conflicts) {
      const cur = m.get(c.resourceId);
      if (!cur || rank[c.severity] < rank[cur]) m.set(c.resourceId, c.severity);
    }
    return m;
  }, [conflicts]);

  const byId = new Map<string, { id: string; name: string; role: string }>([...known.map((k) => [k.id, k] as const), ...resources.map((r) => [r.id, r] as const)]);

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const m = new Map<string, ResourceDTO[]>();
    for (const r of resources) {
      if (needle && !`${r.name} ${r.role} ${r.teamName}`.toLowerCase().includes(needle)) continue;
      m.set(r.teamName, [...(m.get(r.teamName) ?? []), r]);
    }
    return [...m.entries()];
  }, [resources, q]);

  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <div ref={box} className="relative">
      <div className="flex flex-wrap gap-1.5">
        {value.map((id) => {
          const r = byId.get(id);
          const sev = busy.get(id);
          return (
            <span
              key={id}
              className={clsx(
                "inline-flex items-center gap-1.5 rounded-full border py-1 pr-1 pl-2.5 text-sm",
                sev === "clash" ? "border-danger/50 bg-danger/10" : sev ? "border-warn/50 bg-warn-bg" : "border-line bg-soft",
              )}
            >
              {sev && <AlertTriangle size={13} className={sev === "clash" ? "text-danger" : "text-warn"} />}
              <span className="font-medium">{r?.name ?? "Unknown"}</span>
              <span className="text-xs text-muted">{r?.role}</span>
              <button type="button" aria-label={`Remove ${r?.name}`} onClick={() => toggle(id)} className="grid h-5 w-5 place-items-center rounded-full text-muted hover:bg-line hover:text-ink">
                <X size={12} />
              </button>
            </span>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-3 py-1 text-sm text-muted hover:border-ink/30 hover:text-ink"
        >
          <Plus size={14} /> Add resource
        </button>
      </div>

      {open && (
        <div className="anim-fade absolute z-20 mt-2 w-full rounded-xl border border-line bg-surface shadow-lg">
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                setOpen(false);
              }
            }}
            placeholder="Search people, roles, teams…"
            className="h-10 w-full rounded-t-xl border-b border-line bg-transparent px-3 text-base outline-none sm:text-sm"
          />
          <div className="max-h-64 overflow-y-auto p-1">
            {groups.map(([team, list]) => (
              <div key={team}>
                <div className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">{team}</div>
                {list.map((r) => {
                  const on = value.includes(r.id);
                  const sev = busy.get(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggle(r.id)}
                      className={clsx("flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-soft", on && "bg-soft/60")}
                    >
                      <span className={clsx("grid h-4 w-4 shrink-0 place-items-center rounded border", on ? "border-ink bg-ink text-surface" : "border-line")}>{on && <Check size={11} />}</span>
                      <span className="flex-1">
                        <span className="font-medium">{r.name}</span> <span className="text-xs text-muted">{r.role}</span>
                        {r.teamType === "EXTERNAL" && <span className="ml-1.5 rounded bg-soft px-1 text-[10px] text-muted">External</span>}
                      </span>
                      {sev && (
                        <span className={clsx("inline-flex items-center gap-1 text-xs", sev === "clash" ? "text-danger" : "text-warn")}>
                          <AlertTriangle size={12} /> {sev === "clash" ? "Booked at this time" : "Same day"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
            {!groups.length && <p className="px-3 py-3 text-sm text-muted">No matching resources.</p>}
          </div>
          <div className="flex justify-end border-t border-line p-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-soft">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
