"use client";

import { CalendarClock } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtLong, fmtTimeRange } from "@/lib/dates";
import type { ConflictReport, ShootDTO } from "@/lib/types";
import { useToast } from "../Toast";
import { Button, FormError, Input, Label } from "../ui";
import { DateConflictNote, ResourceConflictNotes } from "./ConflictNotes";
import { MiniCalendar } from "./MiniCalendar";

export type NewSlot = { date: string; startTime: string | null; endTime: string | null };

/**
 * Pick a new date/time for a shoot. mode "save" reschedules right away (shoot details);
 * mode "apply" hands the new slot back to the edit form, which saves it with the other changes.
 */
export function RescheduleDialog({
  shoot,
  mode,
  onClose,
  onSaved,
  onApply,
}: {
  shoot: ShootDTO;
  mode: "save" | "apply";
  onClose: () => void;
  onSaved?: (s: ShootDTO) => void;
  onApply?: (slot: NewSlot) => void;
}) {
  const toast = useToast();
  const [date, setDate] = useState(shoot.date);
  const [start, setStart] = useState(shoot.startTime ?? "");
  const [end, setEnd] = useState(shoot.endTime ?? "");
  const [report, setReport] = useState<ConflictReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const crew = shoot.resources.map((r) => r.id);
  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      api<ConflictReport>("/api/conflicts/check", {
        body: {
          date,
          startTime: start || null,
          endTime: end || null,
          resourceIds: crew,
          excludeShootId: shoot.id,
          brandId: shoot.brandId,
          shootType: shoot.shootType,
          location: shoot.location,
          locationPlaceId: shoot.locationPlaceId ?? null,
        },
      })
        .then((r) => live && setReport(r))
        .catch(() => {});
    }, 200);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [date, start, end]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (e.stopPropagation(), onClose());
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const unchanged = date === shoot.date && (start || null) === shoot.startTime && (end || null) === shoot.endTime;
  const clash = (report?.resourceConflicts ?? []).some((c) => c.severity === "clash");
  const badTimes = !!start && !!end && end <= start;

  async function confirm() {
    const slot = { date, startTime: start || null, endTime: end || null };
    if (mode === "apply") {
      onApply?.(slot);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { shoot: s } = await api<{ shoot: ShootDTO }>(`/api/shoots/${shoot.id}`, { method: "PATCH", body: { ...slot, status: "RESCHEDULED" } });
      toast(`${s.brandName} rescheduled to ${fmtLong(s.date)}${s.startTime ? `, ${fmtTimeRange(s.startTime, s.endTime)}` : ""}`);
      onSaved?.(s);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[65] grid place-items-center p-3">
      <div className="anim-fade absolute inset-0 bg-black/40" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Reschedule shoot" className="anim-rise relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-2xl">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <CalendarClock size={18} /> Reschedule {shoot.brandName}
        </h2>
        <p className="mt-0.5 text-xs text-muted">
          Currently {fmtLong(shoot.date)}
          {shoot.startTime ? ` · ${fmtTimeRange(shoot.startTime, shoot.endTime)}` : " · no time set"}
        </p>

        <div className="mt-4 rounded-xl border border-line p-3">
          <MiniCalendar value={date} onChange={setDate} original={shoot.date} />
        </div>

        <div className="mt-4">
          <Label>New time</Label>
          <div className="flex items-center gap-2">
            <Input type="time" step={900} aria-label="New start time" value={start} onChange={(e) => setStart(e.target.value)} />
            <span className="text-muted">—</span>
            <Input type="time" step={900} aria-label="New end time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          {badTimes && <p className="mt-1 text-xs text-danger">End time must be after start time.</p>}
        </div>

        <ResourceConflictNotes report={report} selected={crew} date={date} />
        <DateConflictNote report={report} date={date} />
        <FormError message={error} />

        <div className="mt-5 flex items-center justify-between gap-2">
          <p className="text-xs text-muted">{unchanged ? "Pick a new date or time." : `New: ${fmtLong(date)}${start ? ` · ${fmtTimeRange(start, end || null)}` : ""}`}</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={confirm} disabled={busy || unchanged || clash || badTimes || !report}>
              {mode === "save" ? "Reschedule" : "Use new date"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
