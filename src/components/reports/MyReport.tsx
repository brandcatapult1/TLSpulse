"use client";

import clsx from "clsx";
import { AlertTriangle, MapPin } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api, downloadCsv } from "@/lib/api";
import { fmtShort, fmtTimeRange } from "@/lib/dates";
import { periodFromParams, periodLabel, periodQuery, type Period } from "@/lib/report-period";
import type { ShootStatus, ShootType } from "@/lib/types";
import { STATUS_META, TYPE_META } from "@/lib/ui-meta";
import { Button, EmptyState, Pill, Skeleton } from "../ui";
import { PeriodBar } from "./PeriodBar";

type Row = { id: string; date: string; startTime: string | null; endTime: string | null; location: string | null; brandName: string; shootType: ShootType; status: ShootStatus };
type Mine = { total: number; social: number; realtime: number; resource: { name: string; role: string; teamName: string }; shoots: Row[] };

/** Crew's own report: their shoots in a period, with times (no other people's data). */
export function MyReport({ resourceId }: { resourceId: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const period = useMemo(() => periodFromParams((k) => params.get(k)), [params]);
  const label = periodLabel(period);
  const [data, setData] = useState<Mine | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!resourceId) return;
    let live = true;
    setError(null);
    api<Mine>(`/api/reports/resource/${resourceId}?${periodQuery(period).toString()}`)
      .then((d) => live && setData(d))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [resourceId, period]);

  const setPeriod = (p: Period) => router.replace(`${pathname}?${periodQuery(p).toString()}`, { scroll: false });

  if (!resourceId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <EmptyState title="Your login isn't linked to a crew profile" hint="Ask an admin to link it from Resources." />
      </div>
    );
  }

  const noTime = data?.shoots.filter((s) => !s.startTime).length ?? 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="text-xl font-semibold tracking-tight">My report</h1>
          {data && (
            <p className="text-sm text-muted">
              {data.resource.name} · {data.resource.role} · {data.resource.teamName}
            </p>
          )}
        </div>
        <PeriodBar period={period} onChange={setPeriod} />
      </div>

      {error && <EmptyState title="Couldn't load your report" hint={error} />}

      <div className="grid grid-cols-3 gap-3">
        {data ? (
          <>
            <Tile label="My shoots" value={data.total} />
            <Tile label="Social Media" value={data.social} dot="bg-social" />
            <Tile label="Real Time Visits" value={data.realtime} dot="bg-realtime" />
          </>
        ) : (
          Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[88px]" />)
        )}
      </div>

      <section className="mt-6 rounded-2xl border border-line p-4 sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">My shoots — {label}</h2>
            {noTime > 0 && <p className="text-xs text-warn">{noTime} without a time yet</p>}
          </div>
          {data && data.shoots.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                downloadCsv(`my-shoots-${period.from}_to_${period.to}.csv`, [
                  ["Date", "Time", "Brand", "Type", "Location", "Status"],
                  ...data.shoots.map((s) => [s.date, fmtTimeRange(s.startTime, s.endTime), s.brandName, TYPE_META[s.shootType].short, s.location ?? "", STATUS_META[s.status].label]),
                ])
              }
            >
              CSV
            </Button>
          )}
        </div>
        {!data ? (
          <Skeleton className="h-40" />
        ) : data.shoots.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No shoots for you {period.view === "day" ? "on" : "in"} {label}.</p>
        ) : (
          <ul className="divide-y divide-line">
            {data.shoots.map((s) => (
              <li key={s.id}>
                <Link href={`/?m=${s.date.slice(0, 7)}&shoot=${s.id}`} className="flex gap-3 rounded-lg px-2 py-2.5 hover:bg-soft">
                  <span className={clsx("w-1 shrink-0 rounded-full", TYPE_META[s.shootType].dot)} />
                  <span className="w-20 shrink-0">
                    <span className="tabular block text-sm font-medium">{fmtShort(s.date)}</span>
                    <span className="tabular block text-[11px] text-muted">
                      {s.startTime ? (
                        fmtTimeRange(s.startTime, s.endTime)
                      ) : (
                        <span className="inline-flex items-center gap-1 text-warn">
                          <AlertTriangle size={10} /> No time
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{s.brandName}</span>
                      <Pill className={TYPE_META[s.shootType].pill}>{TYPE_META[s.shootType].short}</Pill>
                      {s.status !== "PLANNED" && <span className="text-xs text-muted">{STATUS_META[s.status].label}</span>}
                    </span>
                    {s.location && (
                      <span className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                        <MapPin size={11} /> {s.location}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Tile({ label, value, dot }: { label: string; value: number; dot?: string }) {
  return (
    <div className="rounded-2xl border border-line p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted">
        {dot && <span className={clsx("h-2 w-2 rounded-full", dot)} />}
        {label}
      </div>
      <div className="tabular mt-1 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}
