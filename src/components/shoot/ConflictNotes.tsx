import { AlertTriangle, Info } from "lucide-react";
import { fmtDayMonth, fmtTimeRange } from "@/lib/dates";
import type { ConflictReport } from "@/lib/types";

/** Date notes and soft resource conflicts warn; a same-person time clash blocks saving. */
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
  const clashes = list.filter((c) => c.severity === "clash");
  const soft = list.filter((c) => c.severity !== "clash");
  if (!list.length) return null;
  return (
    <>
      {clashes.length > 0 && (
        <div role="alert" className="mt-2 rounded-lg bg-danger/10 px-3 py-2 text-[13px] text-danger">
          <p className="font-medium">Can&apos;t save: this time is already booked for</p>
          <ul className="mt-1 space-y-0.5">
            {clashes.map((c) => (
              <li key={`${c.resourceId}-${c.shoot.id}`} className="flex gap-1.5">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>
                  <b>{c.resourceName}</b> — {c.shoot.brandName} · {fmtTimeRange(c.shoot.startTime, c.shoot.endTime)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-ink/70">Pick a time outside these slots, or deploy someone else.</p>
        </div>
      )}
      {soft.length > 0 && (
        <ul className="mt-2 space-y-1 rounded-lg bg-warn-bg px-3 py-2 text-[13px] text-warn">
          {soft.map((c) => (
            <li key={`${c.resourceId}-${c.shoot.id}`} className="flex gap-1.5">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>
                <b>{c.resourceName}</b> is also on {c.shoot.brandName}
                {c.shoot.startTime ? ` · ${fmtTimeRange(c.shoot.startTime, c.shoot.endTime)}` : " (no time set)"} on {fmtDayMonth(date)}
                {c.severity === "sameDay" ? " — times don't overlap." : " — add times to check for a clash."}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** Times already taken that day by the selected crew, shown next to the time fields. */
export function BookedSlots({ report, selected }: { report: ConflictReport | null; selected: string[] }) {
  const slots = (report?.resourceConflicts ?? []).filter((c) => selected.includes(c.resourceId) && c.shoot.startTime);
  if (!slots.length) return null;
  return (
    <p className="mt-1.5 text-xs text-muted">
      Booked that day:{" "}
      {slots.map((c, i) => (
        <span key={`${c.resourceId}-${c.shoot.id}`} className={c.severity === "clash" ? "font-medium text-danger" : ""}>
          {i > 0 && " · "}
          {c.resourceName} {fmtTimeRange(c.shoot.startTime, c.shoot.endTime)}
        </span>
      ))}
    </p>
  );
}
