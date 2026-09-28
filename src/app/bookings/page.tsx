import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { PublicCalendar } from "@/components/calendar/PublicCalendar";
import { gridRange, monthKey, parseMonth } from "@/lib/dates";
import { listPublicShoots } from "@/lib/public-shoots";
import { isPublicCalendarEnabled } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "TLS Pulse · Bookings", robots: { index: false, follow: false } };

/** Read-only shoot calendar for Account Management, departments and agencies (PRD §5). No login. */
export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  if (!(await isPublicCalendarEnabled())) {
    return (
      <main className="grid min-h-dvh place-items-center px-4 text-center">
        <div>
          <Logo />
          <p className="mt-4 font-medium">The shoot calendar isn&apos;t being shared right now.</p>
          <p className="mt-1 text-sm text-muted">Please check with the TLS team.</p>
        </div>
      </main>
    );
  }
  const { m } = await searchParams;
  const month = parseMonth(m);
  const { from, to } = gridRange(month);
  const shoots = await listPublicShoots(from, to);

  return (
    <main className="mx-auto max-w-[1500px] px-3 py-4 sm:px-5">
      <div className="mb-4 flex items-center justify-between">
        <Logo />
        <span className="rounded-full bg-soft px-2.5 py-1 text-xs text-muted">Shoot bookings · view only</span>
      </div>
      <PublicCalendar month={monthKey(month)} shoots={shoots} />
    </main>
  );
}
