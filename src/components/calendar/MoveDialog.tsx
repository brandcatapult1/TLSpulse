"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtDayMonth } from "@/lib/dates";
import type { ConflictReport, ShootDTO } from "@/lib/types";
import { Dialog } from "../Overlay";
import { DateConflictNote, ResourceConflictNotes } from "../shoot/ConflictNotes";
import { Button } from "../ui";

/** Drag & drop confirmation with conflict warnings (PRD §14). */
export function MoveDialog({ move, onCancel, onConfirm }: { move: { shoot: ShootDTO; to: string } | null; onCancel: () => void; onConfirm: () => void }) {
  const [report, setReport] = useState<ConflictReport | null>(null);

  useEffect(() => {
    setReport(null);
    if (!move) return;
    let live = true;
    api<ConflictReport>("/api/conflicts/check", {
      body: {
        date: move.to,
        brandId: move.shoot.brandId,
        location: move.shoot.location,
        startTime: move.shoot.startTime,
        endTime: move.shoot.endTime,
        resourceIds: move.shoot.resources.map((r) => r.id),
        excludeShootId: move.shoot.id,
      },
    })
      .then((r) => live && setReport(r))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [move]);

  if (!move) return null;
  const blocked = (report?.resourceConflicts ?? []).some((c) => c.severity === "clash");
  return (
    <Dialog
      open
      onClose={onCancel}
      title="Move shoot?"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm} autoFocus disabled={!report || blocked}>
            Move
          </Button>
        </>
      }
    >
      <p>
        Move <b>{move.shoot.brandName}</b> from {fmtDayMonth(move.shoot.date)} to <b>{fmtDayMonth(move.to)}</b>?
      </p>
      {move.shoot.status === "PLANNED" && <p className="mt-1 text-xs text-muted">It will be marked as Rescheduled.</p>}
      <ResourceConflictNotes report={report} selected={move.shoot.resources.map((r) => r.id)} date={move.to} />
      <DateConflictNote report={report} date={move.to} />
    </Dialog>
  );
}
