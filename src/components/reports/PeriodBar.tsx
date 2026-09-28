"use client";

import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ymd } from "@/lib/dates";
import { periodFor, periodLabel, shiftPeriod, type Period, type PeriodView } from "@/lib/report-period";
import { Button } from "../ui";

const VIEW_LABEL: Record<PeriodView, string> = { day: "Day", week: "Week", month: "Month", range: "Range" };

/** Day / Week / Month / Range switch with ‹ › stepping and From–To pickers. */
export function PeriodBar({ period, onChange }: { period: Period; onChange: (p: Period) => void }) {
  function setView(v: PeriodView) {
    if (v === period.view) return;
    // Keep the user's place: anchor on today if it's inside the current period, else its start.
    const today = ymd(new Date());
    const anchor = today >= period.from && today <= period.to ? today : period.from;
    onChange(v === "range" ? { view: "range", from: period.from, to: period.to } : periodFor(v, anchor));
  }

  return (
    <>
      <div role="tablist" aria-label="Report period" className="inline-flex rounded-xl bg-soft p-1 text-sm">
        {(Object.keys(VIEW_LABEL) as PeriodView[]).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={period.view === v}
            onClick={() => setView(v)}
            className={clsx("rounded-lg px-3 py-1.5", period.view === v ? "bg-surface font-medium shadow-sm" : "text-muted hover:text-ink")}
          >
            {VIEW_LABEL[v]}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1 rounded-xl border border-line p-1">
        <button aria-label="Previous period" onClick={() => onChange(shiftPeriod(period, -1))} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-soft">
          <ChevronLeft size={16} />
        </button>
        {period.view === "range" ? (
          <span className="flex items-center gap-1 px-1">
            <input
              type="date"
              aria-label="From"
              value={period.from}
              max={period.to}
              onChange={(e) => e.target.value && onChange({ view: "range", from: e.target.value, to: period.to < e.target.value ? e.target.value : period.to })}
              className="h-8 rounded-md bg-transparent px-1 text-sm outline-none focus:bg-soft"
            />
            <span className="text-muted">–</span>
            <input
              type="date"
              aria-label="To"
              value={period.to}
              min={period.from}
              onChange={(e) => e.target.value && onChange({ view: "range", from: period.from > e.target.value ? e.target.value : period.from, to: e.target.value })}
              className="h-8 rounded-md bg-transparent px-1 text-sm outline-none focus:bg-soft"
            />
          </span>
        ) : (
          <span className="min-w-[150px] px-1 text-center text-sm font-medium">{periodLabel(period)}</span>
        )}
        <button aria-label="Next period" onClick={() => onChange(shiftPeriod(period, 1))} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-soft">
          <ChevronRight size={16} />
        </button>
      </div>
      {period.view !== "range" && (
        <Button variant="ghost" size="sm" onClick={() => onChange(periodFor(period.view as Exclude<PeriodView, "range">, ymd(new Date())))}>
          {period.view === "day" ? "Today" : period.view === "week" ? "This week" : "This month"}
        </Button>
      )}
    </>
  );
}
