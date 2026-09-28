"use client";

import clsx from "clsx";
import { RotateCcw, Users } from "lucide-react";
import { fmtTime, fmtTimeRange } from "@/lib/dates";
import type { ShootDTO } from "@/lib/types";
import { TYPE_META } from "@/lib/ui-meta";

/** Resource indicator (PRD §12): count when staffed, amber "Unassigned" otherwise. */
export function CrewBadge({ shoot, publicView }: { shoot: ShootDTO; publicView?: boolean }) {
  if (shoot.resources.length) {
    return (
      <span className="inline-flex shrink-0 items-center gap-0.5 text-muted" title={`${shoot.resources.length} deployed`}>
        <Users size={11} />
        <span className="tabular">{shoot.resources.length}</span>
      </span>
    );
  }
  return <span className="shrink-0 font-medium text-warn">{publicView ? "Not assigned" : "Unassigned"}</span>;
}

/** Compact card inside a calendar date cell (PRD §9). */
export function ShootCard({
  shoot,
  draggable,
  publicView,
  onOpen,
  onHover,
  onDragStart,
}: {
  shoot: ShootDTO;
  draggable?: boolean;
  publicView?: boolean;
  onOpen: (s: ShootDTO) => void;
  onHover?: (s: ShootDTO | null, el?: HTMLElement) => void;
  onDragStart?: (s: ShootDTO) => void;
}) {
  const meta = TYPE_META[shoot.shootType];
  const cancelled = shoot.status === "CANCELLED";
  return (
    <button
      data-card
      type="button"
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", shoot.id);
        e.dataTransfer.effectAllowed = "move";
        onHover?.(null);
        onDragStart?.(shoot);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onHover?.(null);
        onOpen(shoot);
      }}
      onMouseEnter={(e) => onHover?.(shoot, e.currentTarget)}
      onMouseLeave={() => onHover?.(null)}
      aria-label={`${shoot.brandName}, ${meta.label}${shoot.startTime ? `, ${fmtTimeRange(shoot.startTime, shoot.endTime)}` : ""}`}
      className={clsx(
        "block w-full rounded-md border-l-[3px] px-1.5 py-[3px] text-left text-[11.5px] leading-tight transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-sm",
        meta.card,
        cancelled && "opacity-50",
        draggable && "cursor-grab active:cursor-grabbing",
      )}
    >
      <span className="flex items-center gap-1">
        <span className={clsx("min-w-0 flex-1 truncate font-semibold", cancelled && "line-through")}>{shoot.brandName}</span>
        {shoot.status === "RESCHEDULED" && <RotateCcw size={10} className="shrink-0 text-info" aria-label="Rescheduled" />}
        {!cancelled && shoot.resources.length > 0 && (
          <span className="hidden lg:inline-flex">
            <CrewBadge shoot={shoot} />
          </span>
        )}
        {!cancelled && shoot.resources.length === 0 && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warn lg:hidden" title="Unassigned" />}
      </span>
      <span className="mt-px flex items-center gap-1 text-[10.5px]">
        <span className="min-w-0 flex-1 truncate">
          {shoot.startTime && <span className="tabular text-muted">{fmtTime(shoot.startTime).replace(":00", "")} · </span>}
          <span className={cancelled ? "text-muted" : meta.text}>{cancelled ? "Cancelled" : meta.short}</span>
        </span>
        {!cancelled && shoot.resources.length === 0 && <span className="hidden shrink-0 font-medium text-warn lg:inline">{publicView ? "Not assigned" : "Unassigned"}</span>}
      </span>
    </button>
  );
}

/** Full-width card used in day lists and the mobile agenda. */
export function ShootRow({ shoot, onOpen, publicView }: { shoot: ShootDTO; onOpen: (s: ShootDTO) => void; publicView?: boolean }) {
  const meta = TYPE_META[shoot.shootType];
  const cancelled = shoot.status === "CANCELLED";
  return (
    <button
      type="button"
      onClick={() => onOpen(shoot)}
      className={clsx("flex w-full items-stretch gap-3 rounded-xl border border-line bg-surface p-3 text-left transition-colors hover:bg-soft", cancelled && "opacity-55")}
    >
      <span className={clsx("w-1 shrink-0 rounded-full", meta.dot)} />
      <span className="w-[68px] shrink-0 text-sm leading-tight">
        {shoot.startTime ? (
          <>
            <span className="tabular block font-medium">{fmtTime(shoot.startTime)}</span>
            {shoot.endTime && <span className="tabular block text-xs text-muted">{fmtTime(shoot.endTime)}</span>}
          </>
        ) : (
          <span className="text-xs text-muted">No time</span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className={clsx("block truncate font-semibold", cancelled && "line-through")}>{shoot.brandName}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
          <span className={meta.text}>{meta.label}</span>
          {shoot.status !== "PLANNED" && <span className={shoot.status === "CANCELLED" ? "text-danger" : "text-info"}>{shoot.status === "CANCELLED" ? "Cancelled" : "Rescheduled"}</span>}
        </span>
        {!cancelled && (
          <span className="mt-1 block truncate text-xs text-muted">
            {shoot.resources.length ? shoot.resources.map((r) => r.name).join(", ") : <span className="font-medium text-warn">{publicView ? "Resources not assigned" : "Unassigned"}</span>}
          </span>
        )}
      </span>
    </button>
  );
}
