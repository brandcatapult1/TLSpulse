"use client";

import clsx from "clsx";
import { addMonths, format, isSameMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { monthGrid, parseYmd, ymd } from "@/lib/dates";

/** Compact Monday-first month picker. `original` is marked so the user sees where the shoot was. */
export function MiniCalendar({ value, onChange, original, minDate }: { value: string; onChange: (d: string) => void; original?: string; minDate?: string }) {
  const [month, setMonth] = useState(() => parseYmd(value));
  const today = ymd(new Date());
  return (
    <div className="select-none">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" aria-label="Previous month" onClick={() => setMonth((m) => addMonths(m, -1))} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-soft">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold">{format(month, "MMMM yyyy")}</span>
        <button type="button" aria-label="Next month" onClick={() => setMonth((m) => addMonths(m, 1))} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-soft">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-muted uppercase">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {monthGrid(month).map((d) => {
          const key = ymd(d);
          const selected = key === value;
          const disabled = !!minDate && key < minDate;
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => onChange(key)}
              aria-pressed={selected}
              aria-label={format(d, "EEEE d MMMM yyyy")}
              className={clsx(
                "tabular relative mx-auto grid h-9 w-9 place-items-center rounded-full text-sm transition-colors",
                selected ? "bg-ink font-semibold text-surface" : "hover:bg-soft",
                !selected && key === today && "font-semibold text-social",
                !isSameMonth(d, month) && !selected && "text-muted/50",
                disabled && "cursor-not-allowed text-muted/30 line-through decoration-muted/30 hover:bg-transparent",
              )}
            >
              {d.getDate()}
              {key === original && !selected && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-muted" title="Current date" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
