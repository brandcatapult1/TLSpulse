"use client";

import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { ConflictReport, ShootDTO, ShootStatus, ShootType } from "@/lib/types";
import { STATUS_META, TYPE_META } from "@/lib/ui-meta";
import { Drawer } from "../Overlay";
import { Button, FormError, Input, Label, Select, Textarea } from "../ui";
import { BrandCombobox } from "./BrandCombobox";
import { DateConflictNote, ResourceConflictNotes } from "./ConflictNotes";
import { ResourcePicker } from "./ResourcePicker";
import { useMasters } from "./useMasters";

export type FormTarget = { mode: "create"; date: string } | { mode: "edit"; shoot: ShootDTO };

type State = {
  brandId: string;
  shootType: ShootType | "";
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  notes: string;
  resourceIds: string[];
  status: ShootStatus;
};

function initial(t: FormTarget): State {
  if (t.mode === "create") return { brandId: "", shootType: "", date: t.date, startTime: "", endTime: "", location: "", notes: "", resourceIds: [], status: "PLANNED" };
  const s = t.shoot;
  return {
    brandId: s.brandId,
    shootType: s.shootType,
    date: s.date,
    startTime: s.startTime ?? "",
    endTime: s.endTime ?? "",
    location: s.location ?? "",
    notes: s.notes ?? "",
    resourceIds: s.resources.map((r) => r.id),
    status: s.status,
  };
}

/** New / edit shoot drawer (PRD §15–16, §24). Target: under 30 seconds for a normal shoot. */
export function ShootForm({
  target,
  onClose,
  onSaved,
  recentLocations,
}: {
  target: FormTarget | null;
  onClose: () => void;
  onSaved: (shoot: ShootDTO, mode: "create" | "edit") => void;
  recentLocations: string[];
}) {
  const open = !!target;
  const masters = useMasters(open);
  const [f, setF] = useState<State | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [needCrewConfirm, setNeedCrewConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [report, setReport] = useState<ConflictReport | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (target) {
      setF(initial(target));
      setError(null);
      setMissing(new Set());
      setNeedCrewConfirm(false);
      setReport(null);
    }
  }, [target]);

  const shootId = target?.mode === "edit" ? target.shoot.id : null;
  const allIds = useMemo(() => [...new Set([...masters.resources.map((r) => r.id), ...(f?.resourceIds ?? [])])], [masters.resources, f?.resourceIds]);

  // Live conflict check across everyone, so busy people are flagged before they're picked.
  useEffect(() => {
    if (!f?.date || !open) return;
    const ctrl = { cancelled: false };
    const t = setTimeout(async () => {
      try {
        const r = await api<ConflictReport>("/api/conflicts/check", {
          body: { date: f.date, startTime: f.startTime || null, endTime: f.endTime || null, resourceIds: allIds, excludeShootId: shootId },
        });
        if (!ctrl.cancelled) setReport(r);
      } catch {}
    }, 250);
    return () => {
      ctrl.cancelled = true;
      clearTimeout(t);
    };
  }, [f?.date, f?.startTime, f?.endTime, allIds, shootId, open]);

  if (!target || !f) return null;
  const set = <K extends keyof State>(k: K, v: State[K]) => {
    setF((prev) => (prev ? { ...prev, [k]: v } : prev));
    setMissing((m) => {
      const n = new Set(m);
      n.delete(k);
      return n;
    });
    if (k === "resourceIds") setNeedCrewConfirm(false);
  };

  async function submit(allowNoCrew = false) {
    if (!f) return;
    const miss = new Set<string>();
    if (!f.brandId) miss.add("brandId");
    if (!f.shootType) miss.add("shootType");
    if (!f.date) miss.add("date");
    setMissing(miss);
    if (miss.size) return setError("Fill in the highlighted fields.");
    if (f.startTime && f.endTime && f.endTime <= f.startTime) return setError("End time must be after start time.");
    if (!f.resourceIds.length && !allowNoCrew && f.status !== "CANCELLED") {
      setError(null);
      return setNeedCrewConfirm(true);
    }
    setSaving(true);
    setError(null);
    try {
      const body = {
        brandId: f.brandId,
        shootType: f.shootType,
        date: f.date,
        startTime: f.startTime || null,
        endTime: f.endTime || null,
        location: f.location,
        notes: f.notes,
        resourceIds: f.resourceIds,
        ...(target!.mode === "edit" ? { status: f.status } : {}),
      };
      const { shoot } =
        target!.mode === "create"
          ? await api<{ shoot: ShootDTO }>("/api/shoots", { body })
          : await api<{ shoot: ShootDTO }>(`/api/shoots/${target!.shoot.id}`, { method: "PATCH", body });
      onSaved(shoot, target!.mode);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const isEdit = target.mode === "edit";
  const known = isEdit ? target.shoot.resources : [];

  return (
    <Drawer
      open
      onClose={onClose}
      z="z-50"
      title={isEdit ? "Edit shoot" : "New shoot"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => submit()} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create Shoot"}
          </Button>
        </>
      }
    >
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
        }}
        className="space-y-5"
      >
        <div>
          <Label>Brand</Label>
          <BrandCombobox
            brands={masters.brands}
            value={f.brandId}
            fallbackName={isEdit ? target.shoot.brandName : undefined}
            onChange={(id) => set("brandId", id)}
            onCreated={masters.addBrand}
            invalid={missing.has("brandId")}
          />
        </div>

        <div>
          <Label>Shoot type</Label>
          <div role="radiogroup" className={clsx("grid grid-cols-2 gap-2 rounded-xl", missing.has("shootType") && "ring-2 ring-danger/60")}>
            {(["SOCIAL_MEDIA", "REAL_TIME_VISIT"] as const).map((t) => {
              const meta = TYPE_META[t];
              const on = f.shootType === t;
              return (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => set("shootType", t)}
                  className={clsx(
                    "flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors",
                    on ? `${meta.pill} border-transparent ring-2 ${t === "SOCIAL_MEDIA" ? "ring-social" : "ring-realtime"}` : "border-line hover:bg-soft",
                  )}
                >
                  <meta.Icon size={16} /> {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" value={f.date} onChange={(e) => set("date", e.target.value)} className={clsx(missing.has("date") && "border-danger")} required />
          <DateConflictNote report={report} date={f.date} />
        </div>

        <div>
          <Label>
            Time <span className="font-normal text-muted">(optional)</span>
          </Label>
          <div className="flex items-center gap-2">
            <Input type="time" step={900} aria-label="Start time" value={f.startTime} onChange={(e) => set("startTime", e.target.value)} />
            <span className="text-muted">—</span>
            <Input type="time" step={900} aria-label="End time" value={f.endTime} onChange={(e) => set("endTime", e.target.value)} />
          </div>
        </div>

        <div>
          <Label htmlFor="location">
            Location <span className="font-normal text-muted">(optional)</span>
          </Label>
          <Input id="location" list="recent-locations" value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Aerocity, New Delhi" />
          <datalist id="recent-locations">
            {recentLocations.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </div>

        <div>
          <Label>Deploy resources</Label>
          <ResourcePicker resources={masters.resources} value={f.resourceIds} known={known} onChange={(ids) => set("resourceIds", ids)} conflicts={report?.resourceConflicts ?? []} />
          <ResourceConflictNotes report={report} selected={f.resourceIds} date={f.date} />
          {needCrewConfirm && (
            <div className="mt-2 rounded-lg bg-warn-bg px-3 py-2 text-[13px] text-warn">
              No one is deployed yet. Add a resource, or{" "}
              <button type="button" onClick={() => submit(true)} className="font-semibold underline underline-offset-2">
                save without resources
              </button>{" "}
              — it will show as Unassigned.
            </div>
          )}
        </div>

        {isEdit && (
          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" value={f.status} onChange={(e) => set("status", e.target.value as ShootStatus)}>
              {(Object.keys(STATUS_META) as ShootStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </Select>
            {f.date !== target.shoot.date && target.shoot.status === "PLANNED" && f.status === "PLANNED" && (
              <p className="mt-1 text-xs text-muted">Changing the date marks this shoot as Rescheduled.</p>
            )}
          </div>
        )}

        <div>
          <Label htmlFor="notes">
            Notes <span className="font-normal text-muted">(internal only)</span>
          </Label>
          <Textarea id="notes" value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Brief, references, anything the crew should know" />
        </div>

        <FormError message={error} />
        <p className="hidden text-xs text-muted md:block">Tip: ⌘ + Enter saves.</p>
      </form>
    </Drawer>
  );
}
