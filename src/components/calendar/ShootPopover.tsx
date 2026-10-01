"use client";

import { MapPin } from "lucide-react";
import { fmtTimeRange } from "@/lib/dates";
import type { ShootDTO } from "@/lib/types";
import { TYPE_META } from "@/lib/ui-meta";

/** Desktop hover quick-preview (PRD §10). Positioned next to the hovered card. */
export function ShootPopover({ shoot, rect, publicView }: { shoot: ShootDTO; rect: DOMRect; publicView?: boolean }) {
  const meta = TYPE_META[shoot.shootType];
  const width = 260;
  const left = rect.right + 8 + width > window.innerWidth ? Math.max(8, rect.left - width - 8) : rect.right + 8;
  const top = Math.min(rect.top, window.innerHeight - 260);
  return (
    <div role="tooltip" style={{ left, top, width }} className="anim-fade pointer-events-none fixed z-50 rounded-xl border border-line bg-surface p-3 text-sm shadow-xl">
      <div className="font-semibold">{shoot.brandName}</div>
      <div className={`text-xs ${meta.text}`}>{meta.label}</div>
      {shoot.status !== "PLANNED" && (
        <div className={`text-xs font-medium ${shoot.status === "CANCELLED" ? "text-danger" : shoot.status === "DATE_HOLD" ? "text-hold" : "text-info"}`}>
          {shoot.status === "CANCELLED" ? "Cancelled" : shoot.status === "DATE_HOLD" ? "Date hold (tentative)" : "Rescheduled"}
        </div>
      )}
      {shoot.startTime && <div className="tabular mt-1.5 text-xs">{fmtTimeRange(shoot.startTime, shoot.endTime)}</div>}
      <div className="mt-2.5 text-[11px] font-semibold tracking-wide text-muted uppercase">Deployed</div>
      {shoot.resources.length ? (
        <ul className="mt-1 space-y-0.5 text-xs">
          {shoot.resources.map((r) => (
            <li key={r.id}>
              <span className="font-medium">{r.name}</span> <span className="text-muted">— {r.role}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-1 text-xs font-medium text-warn">{publicView ? "Resources not assigned" : "Unassigned"}</div>
      )}
      {shoot.location && (
        <div className="mt-2.5 flex items-center gap-1 text-xs text-muted">
          <MapPin size={12} /> {shoot.location}
        </div>
      )}
    </div>
  );
}
