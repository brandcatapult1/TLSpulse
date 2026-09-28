"use client";

import clsx from "clsx";
import { AlertTriangle, ChevronLeft, ChevronRight, Download, MapPin, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api, downloadCsv } from "@/lib/api";
import { fmtShort, fmtTimeRange, ymd } from "@/lib/dates";
import { periodFor, periodFromParams, periodLabel, periodQuery, shiftPeriod, type Period, type PeriodView } from "@/lib/report-period";
import type { BrandDTO, ResourceDTO, ShootStatus, ShootType, TeamDTO } from "@/lib/types";
import { STATUS_META, TYPE_META } from "@/lib/ui-meta";
import { Drawer } from "../Overlay";
import { Button, EmptyState, Pill, Select, Skeleton } from "../ui";

type Split = { total: number; social: number; realtime: number };
type ShootRow = {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  brandName: string;
  shootType: ShootType;
  status: ShootStatus;
};
type Report = {
  period: Period & { label: string };
  overview: Split & { cancelled: number; resourcesUsed: number; unassigned: number };
  byResource: (Split & { id: string; name: string; role: string; teamName: string })[];
  byTeam: { id: string; name: string; type: "INTERNAL" | "EXTERNAL"; assignments: number; shoots: number }[];
  byBrand: (Split & { id: string; name: string })[];
  unassigned: ShootRow[];
};
type Drill = Split & {
  resource: { id: string; name: string; role: string; teamName: string };
  shoots: ShootRow[];
};
type TeamDrill = Split & {
  team: { id: string; name: string; type: "INTERNAL" | "EXTERNAL" };
  assignments: number;
  shoots: (ShootRow & { crew: { id: string; name: string; role: string }[] })[];
};

const FILTER_KEYS = ["type", "brandId", "resourceId", "teamId", "status"] as const;
const PERIOD_KEYS = ["view", "date", "from", "to", "month"] as const;
const VIEW_LABEL: Record<PeriodView, string> = { day: "Day", week: "Week", month: "Month", range: "Range" };

export function ReportsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const period = useMemo(() => periodFromParams((k) => params.get(k)), [params]);
  const label = periodLabel(period);
  const fileTag = period.from === period.to ? period.from : `${period.from}_to_${period.to}`;
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [masters, setMasters] = useState<{ brands: BrandDTO[]; resources: ResourceDTO[]; teams: TeamDTO[] } | null>(null);
  const [drill, setDrill] = useState<Drill | null>(null);
  const drillId = params.get("resource");
  const teamDrillId = params.get("team");
  const [teamDrill, setTeamDrill] = useState<TeamDrill | null>(null);

  const filterQs = useMemo(() => {
    const sp = periodQuery(period);
    for (const k of FILTER_KEYS) {
      const v = params.get(k);
      if (v) sp.set(k, v);
    }
    return sp.toString();
  }, [params, period]);

  useEffect(() => {
    Promise.all([api<{ brands: BrandDTO[] }>("/api/brands"), api<{ resources: ResourceDTO[] }>("/api/resources"), api<{ teams: TeamDTO[] }>("/api/teams")])
      .then(([b, r, t]) => setMasters({ brands: b.brands, resources: r.resources, teams: t.teams }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let live = true;
    setError(null);
    api<Report>(`/api/reports?${filterQs}`)
      .then((r) => live && setReport(r))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [filterQs]);

  useEffect(() => {
    if (!teamDrillId) return setTeamDrill(null);
    let live = true;
    setTeamDrill(null);
    api<TeamDrill>(`/api/reports/team/${teamDrillId}?${filterQs}`)
      .then((d) => live && setTeamDrill(d))
      .catch(() => live && setTeamDrill(null));
    return () => {
      live = false;
    };
  }, [teamDrillId, filterQs]);

  useEffect(() => {
    if (!drillId) return setDrill(null);
    let live = true;
    api<Drill>(`/api/reports/resource/${drillId}?${filterQs}`)
      .then((d) => live && setDrill(d))
      .catch(() => live && setDrill(null));
    return () => {
      live = false;
    };
  }, [drillId, filterQs]);

  function setParam(k: string, v: string | null) {
    const sp = new URLSearchParams(params.toString());
    if (v) sp.set(k, v);
    else sp.delete(k);
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }
  const activeFilters = FILTER_KEYS.filter((k) => params.get(k));

  function setPeriod(p: Period) {
    const sp = new URLSearchParams(params.toString());
    PERIOD_KEYS.forEach((k) => sp.delete(k));
    periodQuery(p).forEach((v, k) => sp.set(k, v));
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }
  function setView(v: PeriodView) {
    if (v === period.view) return;
    // Keep the user's place: switching to Day/Week/Month anchors on the current start date
    // (or today if it falls inside the period); Range starts from the current period.
    const today = ymd(new Date());
    const anchor = today >= period.from && today <= period.to ? today : period.from;
    setPeriod(v === "range" ? { view: "range", from: period.from, to: period.to } : periodFor(v, anchor));
  }

  const o = report?.overview;
  const maxRes = Math.max(1, ...(report?.byResource.map((r) => r.total) ?? [1]));
  const maxTeam = Math.max(1, ...(report?.byTeam.map((t) => t.assignments) ?? [1]));
  const periodText = period.view === "day" ? `on ${label}` : `in ${label}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-xl font-semibold tracking-tight">Reports</h1>
        {/* Period: daily, weekly, monthly or a custom date range */}
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
          <button aria-label="Previous period" onClick={() => setPeriod(shiftPeriod(period, -1))} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-soft">
            <ChevronLeft size={16} />
          </button>
          {period.view === "range" ? (
            <span className="flex items-center gap-1 px-1">
              <input
                type="date"
                aria-label="From"
                value={period.from}
                max={period.to}
                onChange={(e) => e.target.value && setPeriod({ view: "range", from: e.target.value, to: period.to < e.target.value ? e.target.value : period.to })}
                className="h-8 rounded-md bg-transparent px-1 text-sm outline-none focus:bg-soft"
              />
              <span className="text-muted">–</span>
              <input
                type="date"
                aria-label="To"
                value={period.to}
                min={period.from}
                onChange={(e) => e.target.value && setPeriod({ view: "range", from: period.from > e.target.value ? e.target.value : period.from, to: e.target.value })}
                className="h-8 rounded-md bg-transparent px-1 text-sm outline-none focus:bg-soft"
              />
            </span>
          ) : (
            <span className="min-w-[150px] px-1 text-center text-sm font-medium">{label}</span>
          )}
          <button aria-label="Next period" onClick={() => setPeriod(shiftPeriod(period, 1))} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-soft">
            <ChevronRight size={16} />
          </button>
        </div>
        {period.view !== "range" && (
          <Button variant="ghost" size="sm" onClick={() => setPeriod(periodFor(period.view as Exclude<PeriodView, "range">, ymd(new Date())))}>
            {period.view === "day" ? "Today" : period.view === "week" ? "This week" : "This month"}
          </Button>
        )}
      </div>

      {/* Filters (PRD §30) */}
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <Select value={params.get("type") ?? ""} onChange={(e) => setParam("type", e.target.value)} aria-label="Shoot type">
          <option value="">All shoot types</option>
          <option value="SOCIAL_MEDIA">Social Media</option>
          <option value="REAL_TIME_VISIT">Real Time Visit</option>
        </Select>
        <Select value={params.get("brandId") ?? ""} onChange={(e) => setParam("brandId", e.target.value)} aria-label="Brand">
          <option value="">All brands</option>
          {masters?.brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
        <Select value={params.get("resourceId") ?? ""} onChange={(e) => setParam("resourceId", e.target.value)} aria-label="Resource">
          <option value="">All resources</option>
          {masters?.resources.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
        <Select value={params.get("teamId") ?? ""} onChange={(e) => setParam("teamId", e.target.value)} aria-label="Team">
          <option value="">All teams</option>
          {masters?.teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
        <Select value={params.get("status") ?? ""} onChange={(e) => setParam("status", e.target.value)} aria-label="Status">
          <option value="">Planned + Rescheduled</option>
          {(Object.keys(STATUS_META) as ShootStatus[]).map((s) => (
            <option key={s} value={s}>
              Only {STATUS_META[s].label.toLowerCase()}
            </option>
          ))}
        </Select>
      </div>
      {activeFilters.length > 0 && (
        <button
          onClick={() => {
            const sp = new URLSearchParams(params.toString());
            FILTER_KEYS.forEach((k) => sp.delete(k));
            router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
          }}
          className="-mt-3 mb-5 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
        >
          <X size={14} /> Clear {activeFilters.length} filter{activeFilters.length > 1 ? "s" : ""}
        </button>
      )}

      {error && <EmptyState title="Couldn't load the report" hint={error} />}

      {/* Monthly overview (PRD §26) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {o ? (
          <>
            <Tile label="Total shoots" value={o.total} />
            <Tile label="Social Media" value={o.social} dot="bg-social" />
            <Tile label="Real Time Visits" value={o.realtime} dot="bg-realtime" />
            <Tile label="Cancelled" value={o.cancelled} tone="text-danger" />
            <Tile label="Resources used" value={o.resourcesUsed} hint={o.unassigned ? `${o.unassigned} shoot${o.unassigned > 1 ? "s" : ""} unassigned` : undefined} />
          </>
        ) : (
          Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[92px]" />)
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        {/* Shoots by resource (PRD §27) */}
        <Card
          className="lg:col-span-3"
          title="Shoots by resource"
          subtitle="Assignments on non-cancelled shoots. Click a person to see their shoots."
          onExport={report && (() => downloadCsv(`tls-pulse-resources-${fileTag}.csv`, [["Resource", "Role", "Team", "Shoots", "Social", "Real Time"], ...report.byResource.map((r) => [r.name, r.role, r.teamName, r.total, r.social, r.realtime])]))}
        >
          {!report ? (
            <Skeleton className="h-56" />
          ) : report.byResource.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No assignments {periodText}.</p>
          ) : (
            <ul className="space-y-1">
              {report.byResource.map((r) => (
                <li key={r.id}>
                  <button onClick={() => setParam("resource", r.id)} className={clsx("group flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-soft", drillId === r.id && "bg-soft")}>
                    <span className="w-28 shrink-0 truncate text-sm sm:w-36">
                      <span className="font-medium">{r.name}</span>
                      <span className="block truncate text-[11px] text-muted">{r.role}</span>
                    </span>
                    <span className="flex h-5 flex-1 overflow-hidden rounded-md bg-soft">
                      <span className="bg-social transition-[width]" style={{ width: `${(r.social / maxRes) * 100}%` }} title={`${r.social} Social`} />
                      <span className="bg-realtime transition-[width]" style={{ width: `${(r.realtime / maxRes) * 100}%` }} title={`${r.realtime} Real Time`} />
                    </span>
                    <span className="tabular w-8 text-right text-sm font-semibold">{r.total}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Legend />
        </Card>

        {/* Team allocation (PRD §28) */}
        <Card
          className="lg:col-span-2"
          title="Team allocation"
          subtitle={`${label} — click a team to see its shoots and times`}
          onExport={report && (() => downloadCsv(`tls-pulse-teams-${fileTag}.csv`, [["Team", "Type", "Assignments", "Shoots"], ...report.byTeam.map((t) => [t.name, t.type === "EXTERNAL" ? "External" : "Internal", t.assignments, t.shoots])]))}
        >
          {!report ? (
            <Skeleton className="h-40" />
          ) : report.byTeam.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No assignments.</p>
          ) : (
            <ul className="space-y-3">
              {report.byTeam.map((t) => (
                <li key={t.id}>
                  <button onClick={() => setParam("team", t.id)} className={clsx("block w-full rounded-lg px-2 py-1.5 text-left hover:bg-soft", teamDrillId === t.id && "bg-soft")}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="font-medium">
                      {t.name} {t.type === "EXTERNAL" && <span className="ml-1 rounded-full bg-warn-bg px-1.5 py-px text-[10px] font-medium text-warn">External</span>}
                    </span>
                    <span className="tabular text-muted">
                      <b className="text-ink">{t.assignments}</b> assignments · {t.shoots} shoots
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-soft">
                    <div className="h-full rounded-full bg-ink/80" style={{ width: `${(t.assignments / maxTeam) * 100}%` }} />
                  </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Unassigned shoots: allocation gaps to fix */}
      <Card
        className="mt-6"
        title={
          <span className="flex items-center gap-2">
            Unassigned shoots
            {report && report.unassigned.length > 0 && <span className="rounded-full bg-warn-bg px-2 py-0.5 text-xs font-semibold text-warn">{report.unassigned.length}</span>}
          </span>
        }
        subtitle="Shoots with nobody deployed yet. Click one to open it on the calendar."
        onExport={
          report?.unassigned.length
            ? () =>
            downloadCsv(`tls-pulse-unassigned-${fileTag}.csv`, [
              ["Date", "Time", "Brand", "Type", "Location", "Status"],
              ...report.unassigned.map((s) => [s.date, fmtTimeRange(s.startTime, s.endTime), s.brandName, TYPE_META[s.shootType].short, s.location ?? "", STATUS_META[s.status].label]),
            ])
            : null
        }
      >
        {!report ? (
          <Skeleton className="h-24" />
        ) : report.unassigned.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Every shoot {periodText} has crew deployed.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {report.unassigned.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/?m=${s.date.slice(0, 7)}&shoot=${s.id}`}
                  className="flex gap-3 rounded-xl border border-warn/30 bg-warn-bg/40 p-3 transition-colors hover:bg-warn-bg"
                >
                  <span className={clsx("w-1 shrink-0 rounded-full", TYPE_META[s.shootType].dot)} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-semibold">{s.brandName}</span>
                      <span className="tabular shrink-0 text-xs text-muted">{fmtShort(s.date)}</span>
                    </span>
                    <span className="mt-0.5 block text-xs">
                      <span className="tabular">{s.startTime ? fmtTimeRange(s.startTime, s.endTime) : "No time set"}</span>
                      <span className="text-muted"> · </span>
                      <span className={TYPE_META[s.shootType].text}>{TYPE_META[s.shootType].short}</span>
                      {s.status === "RESCHEDULED" && <span className="text-info"> · Rescheduled</span>}
                    </span>
                    {s.location && (
                      <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
                        <MapPin size={11} /> {s.location}
                      </span>
                    )}
                    <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-warn">
                      <AlertTriangle size={11} /> Resources not assigned
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Shoots by brand (PRD §29) */}
      <Card
        className="mt-6"
        title="Shoots by brand"
        onExport={report && (() => downloadCsv(`tls-pulse-brands-${fileTag}.csv`, [["Brand", "Shoots", "Social", "Real Time"], ...report.byBrand.map((b) => [b.name, b.total, b.social, b.realtime])]))}
      >
        {!report ? (
          <Skeleton className="h-40" />
        ) : report.byBrand.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No shoots {periodText}.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="py-1.5 font-medium">Brand</th>
                <th className="py-1.5 text-right font-medium">Shoots</th>
                <th className="py-1.5 text-right font-medium">Social</th>
                <th className="py-1.5 text-right font-medium">Real Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {report.byBrand.map((b) => (
                <tr key={b.id} className="cursor-pointer hover:bg-soft/60" onClick={() => setParam("brandId", b.id)}>
                  <td className="py-2 font-medium">{b.name}</td>
                  <td className="tabular py-2 text-right font-semibold">{b.total}</td>
                  <td className="tabular py-2 text-right text-social">{b.social}</td>
                  <td className="tabular py-2 text-right text-realtime">{b.realtime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Resource drill-down */}
      <Drawer
        open={!!drillId}
        onClose={() => setParam("resource", null)}
        title={
          drill && (
            <span>
              {drill.resource.name} — {label}
              <span className="block text-sm font-normal text-muted">
                {drill.resource.role} · {drill.resource.teamName}
              </span>
            </span>
          )
        }
      >
        {!drill ? (
          <Skeleton className="h-48" />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Tile label="Assignments" value={drill.total} />
              <Tile label="Social" value={drill.social} dot="bg-social" />
              <Tile label="Real Time" value={drill.realtime} dot="bg-realtime" />
            </div>
            {drill.shoots.length ? (
              <table className="mt-5 w-full text-sm">
                <thead className="text-left text-xs text-muted">
                  <tr>
                    <th className="py-1.5 font-medium">Date</th>
                    <th className="py-1.5 font-medium">Time</th>
                    <th className="py-1.5 font-medium">Brand</th>
                    <th className="py-1.5 font-medium">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {drill.shoots.map((s) => (
                    <tr key={s.id}>
                      <td className="tabular py-2">
                        <Link className="hover:underline" href={`/?m=${s.date.slice(0, 7)}&shoot=${s.id}`}>
                          {fmtShort(s.date)}
                        </Link>
                      </td>
                      <td className="tabular py-2 text-xs whitespace-nowrap">{s.startTime ? fmtTimeRange(s.startTime, s.endTime) : <span className="text-muted">No time</span>}</td>
                      <td className="py-2 font-medium">
                        {s.brandName}
                        {s.location && <span className="block text-[11px] font-normal text-muted">{s.location}</span>}
                      </td>
                      <td className="py-2">
                        <Pill className={TYPE_META[s.shootType].pill}>{TYPE_META[s.shootType].short}</Pill>
                        {s.status !== "PLANNED" && <span className="ml-1.5 text-xs text-muted">{STATUS_META[s.status].label}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="mt-6 text-center text-sm text-muted">No shoots for this person {periodText}.</p>
            )}
          </>
        )}
      </Drawer>

      {/* Team drill-down */}
      <Drawer
        open={!!teamDrillId}
        onClose={() => setParam("team", null)}
        wide
        title={
          teamDrill && (
            <span>
              {teamDrill.team.name} — {label}
              <span className="block text-sm font-normal text-muted">
                {teamDrill.team.type === "EXTERNAL" ? "External team" : "Internal team"} · {teamDrill.assignments} assignments on {teamDrill.total} shoots
              </span>
            </span>
          )
        }
      >
        {!teamDrill ? (
          <Skeleton className="h-48" />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Tile label="Shoots" value={teamDrill.total} />
              <Tile label="Social" value={teamDrill.social} dot="bg-social" />
              <Tile label="Real Time" value={teamDrill.realtime} dot="bg-realtime" />
            </div>
            {teamDrill.shoots.length ? (
              <ul className="mt-5 divide-y divide-line rounded-xl border border-line">
                {teamDrill.shoots.map((s) => (
                  <li key={s.id}>
                    <Link href={`/?m=${s.date.slice(0, 7)}&shoot=${s.id}`} className="flex gap-3 px-3 py-2.5 hover:bg-soft">
                      <span className="w-16 shrink-0">
                        <span className="tabular block text-sm font-medium">{fmtShort(s.date)}</span>
                        <span className="tabular block text-[11px] text-muted">{s.startTime ? fmtTimeRange(s.startTime, null) : "No time"}</span>
                        {s.endTime && <span className="tabular block text-[11px] text-muted">to {fmtTimeRange(s.endTime, null)}</span>}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-medium">{s.brandName}</span>
                          <Pill className={TYPE_META[s.shootType].pill}>{TYPE_META[s.shootType].short}</Pill>
                          {s.status !== "PLANNED" && <span className="text-xs text-muted">{STATUS_META[s.status].label}</span>}
                        </span>
                        {s.location && (
                          <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
                            <MapPin size={11} /> {s.location}
                          </span>
                        )}
                        <span className="mt-1 block text-xs">{s.crew.map((c) => `${c.name} (${c.role})`).join(", ")}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-6 text-center text-sm text-muted">No shoots for this team {periodText}.</p>
            )}
          </>
        )}
      </Drawer>
    </div>
  );
}

function Tile({ label, value, dot, tone, hint }: { label: string; value: number; dot?: string; tone?: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted">
        {dot && <span className={clsx("h-2 w-2 rounded-full", dot)} />}
        {label}
      </div>
      <div className={clsx("tabular mt-1 text-2xl font-semibold tracking-tight", tone)}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-warn">{hint}</div>}
    </div>
  );
}

function Card({ title, subtitle, className, children, onExport }: { title: React.ReactNode; subtitle?: string; className?: string; children: React.ReactNode; onExport?: (() => void) | null }) {
  return (
    <section className={clsx("rounded-2xl border border-line p-4 sm:p-5", className)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
        {onExport && (
          <Button variant="ghost" size="sm" onClick={onExport} title="Download CSV">
            <Download size={14} /> CSV
          </Button>
        )}
      </div>
      {children}
    </section>
  );
}

function Legend() {
  return (
    <div className="mt-3 flex gap-4 text-xs text-muted">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-social" /> Social Media
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-realtime" /> Real Time Visit
      </span>
    </div>
  );
}
