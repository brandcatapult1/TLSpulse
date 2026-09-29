"use client";

import { addMonths, format, isSameMonth } from "date-fns";
import { Eye, EyeOff, Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { fmtDayMonth, gridRange, monthKey, parseMonth, sortShoots, ymd } from "@/lib/dates";
import type { ShootDTO } from "@/lib/types";
import { ShootForm, type FormTarget } from "../shoot/ShootForm";
import { useToast } from "../Toast";
import { Button } from "../ui";
import { CalendarView } from "./CalendarView";
import { MoveDialog } from "./MoveDialog";
import { ShootDrawer } from "./ShootDrawer";

const cache = new Map<string, ShootDTO[]>();
const SHOW_CANCELLED_KEY = "tlsp.showCancelled";

/** The internal calendar: data, URL state, and all create/edit/move flows. */
export function CalendarApp({ isAdmin, readOnly = false }: { isAdmin: boolean; readOnly?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const toast = useToast();
  const today = ymd(new Date());

  const [month, setMonth] = useState(() => parseMonth(params.get("m")));
  const key = monthKey(month);
  const [shoots, setShoots] = useState<ShootDTO[]>(() => cache.get(key) ?? []);
  const [loading, setLoading] = useState(!cache.has(key));
  const [showCancelled, setShowCancelled] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => (isSameMonth(new Date(), month) ? today : ymd(month)));
  const [open, setOpen] = useState<ShootDTO | null>(null);
  const [form, setForm] = useState<FormTarget | null>(null);
  const [move, setMove] = useState<{ shoot: ShootDTO; to: string } | null>(null);
  const reqId = useRef(0);

  useEffect(() => {
    try {
      setShowCancelled(localStorage.getItem(SHOW_CANCELLED_KEY) !== "0");
    } catch {}
  }, []);

  const load = useCallback(
    async (m: Date) => {
      const k = monthKey(m);
      const id = ++reqId.current;
      if (!cache.has(k)) setLoading(true);
      try {
        const { from, to } = gridRange(m);
        const { shoots } = await api<{ shoots: ShootDTO[] }>(`/api/shoots?from=${from}&to=${to}`);
        cache.set(k, shoots);
        if (id === reqId.current) setShoots(shoots);
      } catch (e) {
        if (id === reqId.current) toast((e as Error).message, "error");
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    setShoots(cache.get(key) ?? []);
    load(month);
  }, [key, load, month]);

  // Keep ?m= in the URL so links and Back work.
  useEffect(() => {
    const current = params.get("m");
    if (current !== key) {
      const sp = new URLSearchParams(params.toString());
      sp.set("m", key);
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    }
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Deep links from search: ?shoot=<id>, and ?new=1 from anywhere.
  useEffect(() => {
    const sid = params.get("shoot");
    const wantsNew = params.get("new");
    if (!sid && !wantsNew) return;
    const sp = new URLSearchParams(params.toString());
    sp.delete("shoot");
    sp.delete("new");
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    if (wantsNew && !readOnly) setForm({ mode: "create", date: selectedDate });
    if (sid) {
      const m = parseMonth(params.get("m"));
      if (monthKey(m) !== key) setMonth(m);
      api<{ shoot: ShootDTO }>(`/api/shoots/${sid}`)
        .then(({ shoot }) => {
          setOpen(shoot);
          setSelectedDate(shoot.date);
        })
        .catch(() => toast("That shoot no longer exists", "warn"));
    }
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const goto = useCallback((m: Date) => {
    setMonth(m);
    setSelectedDate(isSameMonth(new Date(), m) ? ymd(new Date()) : ymd(m));
  }, []);

  const overlayOpen = !!(open || form || move);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (overlayOpen || e.metaKey || e.ctrlKey || e.altKey || t.closest("input,textarea,select,[contenteditable]")) return;
      if (e.key === "ArrowLeft") goto(addMonths(month, -1));
      else if (e.key === "ArrowRight") goto(addMonths(month, 1));
      else if (e.key === "t" || e.key === "T") goto(parseMonth(null));
      else if (!readOnly && (e.key === "n" || e.key === "N")) {
        e.preventDefault();
        setForm({ mode: "create", date: selectedDate });
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [overlayOpen, month, goto, selectedDate, readOnly]);

  // Local list updates, then refetch to stay honest.
  const upsert = (s: ShootDTO) => {
    setShoots((list) => {
      const next = sortShoots([...list.filter((x) => x.id !== s.id), s]);
      cache.set(key, next);
      return next;
    });
    cache.forEach((_, k) => k !== key && cache.delete(k));
    load(month);
  };
  const removeLocal = (id: string) => {
    setShoots((list) => list.filter((x) => x.id !== id));
    cache.clear();
    load(month);
  };

  async function confirmMove() {
    if (!move) return;
    const { shoot, to } = move;
    setMove(null);
    const optimistic: ShootDTO = { ...shoot, date: to, status: shoot.status === "PLANNED" ? "RESCHEDULED" : shoot.status };
    const before = shoots;
    setShoots((list) => sortShoots(list.map((x) => (x.id === shoot.id ? optimistic : x))));
    try {
      const { shoot: saved } = await api<{ shoot: ShootDTO }>(`/api/shoots/${shoot.id}`, { method: "PATCH", body: { date: to } });
      toast(`${saved.brandName} moved to ${fmtDayMonth(to)}`);
      upsert(saved);
    } catch (e) {
      setShoots(before);
      toast((e as Error).message, "error");
    }
  }

  const visible = useMemo(() => (showCancelled ? shoots : shoots.filter((s) => s.status !== "CANCELLED")), [shoots, showCancelled]);
  const recentLocations = useMemo(() => [...new Set(shoots.map((s) => s.location).filter(Boolean) as string[])].slice(0, 12), [shoots]);

  return (
    <div className="mx-auto max-w-[1500px] px-3 py-4 sm:px-5 md:py-5">
      <CalendarView
        month={month}
        shoots={visible}
        today={today}
        loading={loading}
        onPrev={() => goto(addMonths(month, -1))}
        onNext={() => goto(addMonths(month, 1))}
        onToday={() => goto(parseMonth(null))}
        onOpenShoot={setOpen}
        onCreateAt={readOnly ? undefined : (date) => setForm({ mode: "create", date })}
        onMove={readOnly ? undefined : (shoot, to) => setMove({ shoot, to })}
        mineLabel={readOnly ? "My shoots" : undefined}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        headerExtra={
          <>
            <button
              onClick={() =>
                setShowCancelled((v) => {
                  try {
                    localStorage.setItem(SHOW_CANCELLED_KEY, v ? "0" : "1");
                  } catch {}
                  return !v;
                })
              }
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-muted hover:bg-soft hover:text-ink"
              title="Show or hide cancelled shoots"
            >
              {showCancelled ? <Eye size={15} /> : <EyeOff size={15} />}
              <span className="hidden lg:inline">Cancelled</span>
            </button>
            {!readOnly && (
              <span className="hidden md:block">
                <Button onClick={() => setForm({ mode: "create", date: isSameMonth(new Date(), month) ? today : ymd(month) })}>
                  <Plus size={16} /> New Shoot
                </Button>
              </span>
            )}
          </>
        }
      />

      {/* Mobile floating + (PRD §33) */}
      {!readOnly && (
        <button
          aria-label="New shoot"
          onClick={() => setForm({ mode: "create", date: selectedDate })}
          className="fixed right-5 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-30 grid h-14 w-14 place-items-center rounded-full bg-ink text-surface shadow-xl active:scale-95 md:hidden"
        >
          <Plus size={26} />
        </button>
      )}

      <ShootDrawer
        shoot={open}
        isAdmin={isAdmin}
        readOnly={readOnly}
        onClose={() => setOpen(null)}
        onEdit={(s) => setForm({ mode: "edit", shoot: s })}
        onChanged={(s) => {
          setOpen(s);
          upsert(s);
        }}
        onDeleted={(id) => {
          setOpen(null);
          removeLocal(id);
        }}
      />

      <ShootForm
        target={form}
        canAddBrand={isAdmin}
        recentLocations={recentLocations}
        onClose={() => setForm(null)}
        onSaved={(s, mode) => {
          setForm(null);
          const before = form?.mode === "edit" ? form.shoot : null;
          toast(
            mode === "create"
              ? `${s.brandName} shoot created for ${fmtDayMonth(s.date)}`
              : s.status === "CANCELLED" && before?.status !== "CANCELLED"
                ? `${s.brandName} shoot cancelled`
                : s.status === "RESCHEDULED" && before && (before.date !== s.date || before.startTime !== s.startTime)
                  ? `${s.brandName} rescheduled to ${fmtDayMonth(s.date)}`
                  : "Shoot updated",
          );
          if (mode === "edit" && open) setOpen(s);
          const m = parseMonth(s.date.slice(0, 7));
          if (!isSameMonth(m, month)) goto(m);
          setSelectedDate(s.date);
          upsert(s);
        }}
      />

      <MoveDialog move={move} onCancel={() => setMove(null)} onConfirm={confirmMove} />
      <span className="sr-only" aria-live="polite">
        {format(month, "MMMM yyyy")}
      </span>
    </div>
  );
}
