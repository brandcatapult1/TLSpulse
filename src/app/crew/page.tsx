import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { PublicCalendar } from "@/components/calendar/PublicCalendar";
import { listCrewShoots, currentCrewViewer } from "@/lib/crew-view";
import { gridRange, monthKey, parseMonth } from "@/lib/dates";
import { CrewLookup } from "./CrewLookup";
import { SwitchCrew } from "./SwitchCrew";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "TLS Pulse · My schedule", robots: { index: false, follow: false } };

/** Public crew schedule: enter your mobile/email once, then see only your own shoots. */
export default async function CrewPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const viewer = await currentCrewViewer();

  if (!viewer) {
    return (
      <main className="grid min-h-dvh place-items-center bg-soft px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <Logo className="text-lg" />
            <p className="mt-2 text-sm text-muted">Crew schedule</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
            <CrewLookup />
          </div>
        </div>
      </main>
    );
  }

  const { m } = await searchParams;
  const month = parseMonth(m);
  const { from, to } = gridRange(month);
  const shoots = await listCrewShoots(viewer.id, from, to);

  return (
    <main className="mx-auto max-w-[1500px] px-3 py-4 sm:px-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Logo />
        <div className="text-right">
          <div className="text-sm font-medium">
            {viewer.name} <span className="font-normal text-muted">· {viewer.role}</span>
          </div>
          <SwitchCrew />
        </div>
      </div>
      <PublicCalendar month={monthKey(month)} shoots={shoots} />
    </main>
  );
}
