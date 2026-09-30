"use client";

import clsx from "clsx";
import { format, isSameMonth } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { fmtWeekday, monthGrid, ymd } from "@/lib/dates";
import type { ShootDTO } from "@/lib/types";
import { TYPE_META } from "@/lib/ui-meta";
import { Drawer } from "../Overlay";
import { Button } from "../ui";
import { ShootCard, ShootRow } from "./ShootCard";
import { ShootPopover } from "./ShootPopover";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_VISIBLE = 3; // cards per cell before "+N more"

type Props = {
  month: Date;
  shoots: ShootDTO[]; // already sorted and filtered
  today: string;
  loading?: boolean;
  publicView?: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onOpenShoot: (s: ShootDTO) => void;
  onCreateAt?: (date: string) => void;
  onMove?: (s: ShootDTO, date: string) => void;
  headerExtra?: React.ReactNode;
  /** Replaces "Shoots" in the header summary, e.g. "My shoots" for crew. */
  mineLabel?: string;
  /** Mobile agenda selection; controlled so the FAB can use the chosen date. */
  selectedDate: string;
  onSelectDate: (d: string) => void;
};

export function CalendarView(p: Props) {
  const days = useMemo(() => monthGrid(p.month), [p.month]);
  const byDate = useMemo(() => {
    const m = new Map<string, ShootDTO[]>();
    for (const s of p.shoots) m.set(s.date, [...(m.get(s.date) ?? []), s]);
    return m;
  }, [p.shoots]);

  const inMonth = p.shoots.filter((s) => s.date.startsWith(format(p.month, "yyyy-MM")) && s.status !== "CANCELLED");
  const social = inMonth.filter((s) => s.shootType === "SOCIAL_MEDIA").length;

  const [dayList, setDayList] = useState<string | null>(null);
  const [hover, setHover] = useState<{ shoot: ShootDTO; rect: DOMRect } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragging = useRef<ShootDTO | null>(null);

  const onHover = (s: ShootDTO | null, el?: HTMLElement) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    if (!s || !el || dragging.current || !window.matchMedia("(hover: hover)").matches) return setHover(null);
    hoverTimer.current = setTimeout(() => setHover({ shoot: s, rect: el.getBoundingClientRect() }), 300);
  };
  useEffect(() => () => void (hoverTimer.current && clearTimeout(hoverTimer.current)), []);

  const canDrag = !p.publicView && !!p.onMove;

  return (
    <div>
      {/* Header (PRD §13, §32) */}
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-1">
          <button aria-label="Previous month" onClick={p.onPrev} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-soft">
            <ChevronLeft size={18} />
          </button>
          <h1 className="min-w-[150px] text-center text-lg font-semibold tracking-tight sm:text-xl">{format(p.month, "MMMM yyyy")}</h1>
          <button aria-label="Next month" onClick={p.onNext} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-soft">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="tabular order-last w-full text-sm text-muted sm:order-none sm:w-auto">
          <span className="font-medium text-ink">
            {inMonth.length} {p.mineLabel ?? "Shoots"}
          </span>
          <span className="mx-1.5">·</span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-social" /> {social} Social
          </span>
          <span className="mx-1.5">·</span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-realtime" /> {inMonth.length - social} Real Time
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">{p.headerExtra}</div>
      </div>

      {/* Desktop / tablet month grid */}
      <div className={clsx("hidden overflow-hidden rounded-2xl border border-line md:block", p.loading && "opacity-60 transition-opacity")}>
        <div className="grid grid-cols-7 border-b border-line bg-soft/60">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-2 py-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const key = ymd(day);
            const list = byDate.get(key) ?? [];
            const live = list.filter((s) => s.status !== "CANCELLED").length;
            const overflow = list.length > MAX_VISIBLE;
            const visible = overflow ? list.slice(0, MAX_VISIBLE - 1) : list;
            const outside = !isSameMonth(day, p.month);
            const isToday = key === p.today;
            return (
              <div
                key={key}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("[data-card],[data-more]")) return;
                  p.onCreateAt?.(key);
                }}
                onDragOver={(e) => {
                  if (!canDrag || key < p.today) return; // can't move a shoot into the past
                  e.preventDefault();
                  setDropTarget(key);
                }}
                onDragLeave={() => setDropTarget((t) => (t === key ? null : t))}
                onDrop={(e) => {
                  e.preventDefault();
                  setDropTarget(null);
                  const s = dragging.current;
                  dragging.current = null;
                  if (s && s.date !== key && key >= p.today) p.onMove?.(s, key);
                }}
                className={clsx(
                  "group relative flex min-h-[128px] flex-col gap-[3px] border-line p-1.5",
                  i % 7 !== 6 && "border-r",
                  i < 35 && "border-b",
                  outside && "bg-soft/40",
                  p.onCreateAt && key >= p.today && "cursor-pointer hover:bg-soft/50",
                  dropTarget === key && "bg-social-bg/60 ring-2 ring-social ring-inset",
                )}
              >
                <div className="mb-0.5 flex items-center justify-between px-0.5">
                  <span
                    className={clsx(
                      "tabular grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs font-semibold",
                      isToday ? "bg-social text-white" : outside ? "text-muted/60" : "text-ink",
                    )}
                  >
                    {day.getDate() === 1 ? format(day, "d MMM") : day.getDate()}
                  </span>
                  {live > 1 && (
                    <span className="tabular text-[10px] font-medium whitespace-nowrap text-muted" title={`${live} shoots`}>
                      {live}
                      <span className="hidden xl:inline"> shoots</span>
                    </span>
                  )}
                  {p.onCreateAt && live <= 1 && key >= p.today && <Plus size={13} className="text-muted opacity-0 transition-opacity group-hover:opacity-100" />}
                </div>
                {visible.map((s) => (
                  <ShootCard
                    key={s.id}
                    shoot={s}
                    publicView={p.publicView}
                    draggable={canDrag && s.status !== "CANCELLED"}
                    onOpen={p.onOpenShoot}
                    onHover={onHover}
                    onDragStart={(sh) => (dragging.current = sh)}
                  />
                ))}
                {overflow && (
                  <button
                    data-more
                    onClick={() => setDayList(key)}
                    className="rounded-md px-1.5 py-0.5 text-left text-[11px] font-semibold text-muted hover:bg-soft hover:text-ink"
                  >
                    +{list.length - visible.length} more
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: compact month + day agenda (PRD §33) */}
      <MobileCalendar {...p} days={days} byDate={byDate} />

      {hover && <ShootPopover shoot={hover.shoot} rect={hover.rect} publicView={p.publicView} />}

      <Drawer
        open={!!dayList}
        onClose={() => setDayList(null)}
        title={
          dayList && (
            <span>
              {fmtWeekday(dayList)}
              <span className="block text-sm font-normal text-muted">{(byDate.get(dayList) ?? []).length} shoots</span>
            </span>
          )
        }
        footer={
          p.onCreateAt &&
          dayList && (
            <Button
              onClick={() => {
                const d = dayList;
                setDayList(null);
                p.onCreateAt?.(d);
              }}
            >
              <Plus size={16} /> Add shoot on this date
            </Button>
          )
        }
      >
        <div className="space-y-2">
          {(dayList ? byDate.get(dayList) ?? [] : []).map((s) => (
            <ShootRow
              key={s.id}
              shoot={s}
              publicView={p.publicView}
              onOpen={(sh) => {
                setDayList(null);
                p.onOpenShoot(sh);
              }}
            />
          ))}
        </div>
      </Drawer>
    </div>
  );
}

function MobileCalendar(p: Props & { days: Date[]; byDate: Map<string, ShootDTO[]> }) {
  const touch = useRef<{ x: number; y: number } | null>(null);
  const list = p.byDate.get(p.selectedDate) ?? [];
  const live = list.filter((s) => s.status !== "CANCELLED").length;

  return (
    <div className="md:hidden">
      <div
        className={clsx("rounded-2xl border border-line p-2", p.loading && "opacity-60")}
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          const t = touch.current;
          touch.current = null;
          if (!t) return;
          const dx = e.changedTouches[0].clientX - t.x;
          const dy = e.changedTouches[0].clientY - t.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx < 0 ? p.onNext : p.onPrev)();
        }}
      >
        <div className="grid grid-cols-7 pb-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-[10px] font-semibold text-muted uppercase">
              {d.slice(0, 2)}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-0.5">
          {p.days.map((day) => {
            const key = ymd(day);
            const shoots = (p.byDate.get(key) ?? []).filter((s) => s.status !== "CANCELLED");
            const outside = !isSameMonth(day, p.month);
            const selected = key === p.selectedDate;
            const isToday = key === p.today;
            return (
              <button
                key={key}
                onClick={() => p.onSelectDate(key)}
                aria-label={`${fmtWeekday(key)}, ${shoots.length} shoots`}
                aria-pressed={selected}
                className="flex h-12 flex-col items-center justify-center gap-1 rounded-xl"
              >
                <span
                  className={clsx(
                    "tabular grid h-7 w-7 place-items-center rounded-full text-sm",
                    selected ? "bg-ink font-semibold text-surface" : isToday ? "font-semibold text-social ring-1 ring-social" : outside ? "text-muted/50" : "",
                  )}
                >
                  {day.getDate()}
                </span>
                <span className="flex h-1.5 items-center gap-0.5">
                  {shoots.slice(0, 3).map((s) => (
                    <span key={s.id} className={clsx("h-1.5 w-1.5 rounded-full", TYPE_META[s.shootType].dot)} />
                  ))}
                  {shoots.length > 3 && <span className="text-[8px] leading-none font-bold text-muted">+</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-semibold">{fmtWeekday(p.selectedDate)}</h2>
          <span className="text-sm text-muted">
            {live} {live === 1 ? "Shoot" : "Shoots"}
          </span>
        </div>
        {list.length ? (
          <div className="space-y-2">
            {list.map((s) => (
              <ShootRow key={s.id} shoot={s} onOpen={p.onOpenShoot} publicView={p.publicView} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
            No shoots on this date.{p.onCreateAt ? " Tap + to add one." : ""}
          </p>
        )}
      </div>
    </div>
  );
}
