import clsx from "clsx";
import { AlertTriangle, CalendarDays, Clock, MapPin } from "lucide-react";
import { fmtLong, fmtTimeRange } from "@/lib/dates";
import type { ShootDTO } from "@/lib/types";
import { STATUS_META, TYPE_META } from "@/lib/ui-meta";
import { RichText } from "../RichText";
import { Pill } from "../ui";

/** Shoot detail body shared by the internal drawer and the public calendar (PRD §11, §34). */
export function ShootDetails({ shoot, publicView }: { shoot: ShootDTO; publicView?: boolean }) {
  const meta = TYPE_META[shoot.shootType];
  const status = STATUS_META[shoot.status];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5">
        <Pill className={meta.pill}>
          <meta.Icon size={12} /> {meta.label}
        </Pill>
        {(!publicView || shoot.status !== "PLANNED") && <Pill className={status.pill}>{status.label}</Pill>}
      </div>

      <dl className="space-y-2.5 text-sm">
        <Row icon={<CalendarDays size={16} />}>{fmtLong(shoot.date)}</Row>
        {shoot.startTime && <Row icon={<Clock size={16} />}>{fmtTimeRange(shoot.startTime, shoot.endTime)}</Row>}
        {shoot.location && <Row icon={<MapPin size={16} />}>{shoot.location}</Row>}
      </dl>

      <section>
        <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Deployed resources</h3>
        {shoot.resources.length ? (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {shoot.resources.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-3 py-2">
                <span className={clsx("grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold", meta.pill)}>{r.name.slice(0, 1)}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{r.name}</span>
                  <span className="block text-xs text-muted">
                    {r.role}
                    {r.teamName && !publicView ? ` · ${r.teamName}` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 rounded-xl bg-warn-bg px-3 py-2.5 text-sm font-medium text-warn">
            <AlertTriangle size={15} /> Resources not assigned
          </p>
        )}
      </section>

      {!publicView && shoot.notes && (
        <section>
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Internal notes</h3>
          <RichText html={shoot.notes} className="rounded-xl bg-soft px-3 py-2.5 text-sm" />
        </section>
      )}
    </div>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <dt className="mt-px text-muted">{icon}</dt>
      <dd>{children}</dd>
    </div>
  );
}
