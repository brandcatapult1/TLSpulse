import { AlertTriangle, Info } from "lucide-react";
import { fmtDayMonth, fmtTimeRange } from "@/lib/dates";
import type { ConflictReport } from "@/lib/types";

/** Warnings only — they never block saving (PRD §21–22). */
export function DateConflictNote({ report, date }: { report: ConflictReport | null; date: string }) {
  const n = report?.dateShoots.length ?? 0;
  if (!n) return null;
  return (
    <div className="mt-2 rounded-lg bg-warn-bg px-3 py-2 text-[13px] text-warn">
      <p className="flex items-center gap-1.5 font-medium">
        <Info size={14} /> {n} {n === 1 ? "shoot is" : "shoots are"} already scheduled on {fmtDayMonth(date)}.
      </p>
      <p className="mt-0.5 pl-5 text-ink/70">{report!.dateShoots.map((s) => (s.startTime ? `${s.brandName} (${fmtTimeRange(s.startTime, null)})` : s.brandName)).join(" · ")}</p>
    </div>
  );
}

export function ResourceConflictNotes({ report, selected, date }: { report: ConflictReport | null; selected: string[]; date: string }) {
  const list = (report?.resourceConflicts ?? []).filter((c) => selected.includes(c.resourceId));
  if (!list.length) return null;
  return (
    <ul className="mt-2 space-y-1 rounded-lg bg-warn-bg px-3 py-2 text-[13px] text-warn">
      {list.map((c) => (
        <li key={`${c.resourceId}-${c.shoot.id}`} className="flex gap-1.5">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            <b>{c.resourceName}</b> is already assigned to {c.shoot.brandName}
            {c.shoot.startTime ? ` · ${fmtTimeRange(c.shoot.startTime, c.shoot.endTime)}` : ""} on {fmtDayMonth(date)}
            {c.severity === "sameDay" ? " (times don't overlap)" : ""}.
          </span>
        </li>
      ))}
    </ul>
  );
}
