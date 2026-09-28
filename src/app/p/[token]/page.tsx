import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { PublicCalendar } from "@/components/calendar/PublicCalendar";
import { gridRange, monthKey, parseMonth } from "@/lib/dates";
import { listPublicShoots } from "@/lib/public-shoots";
import { isPublicToken } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "TLS Pulse · Shoot calendar", robots: { index: false, follow: false } };

export default async function PublicCalendarPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ m?: string }> }) {
  const { token } = await params;
  if (!(await isPublicToken(token))) notFound();
  const { m } = await searchParams;
  const month = parseMonth(m);
  const { from, to } = gridRange(month);
  const shoots = await listPublicShoots(from, to);

  return (
    <main className="mx-auto max-w-[1500px] px-3 py-4 sm:px-5">
      <div className="mb-4 flex items-center justify-between">
        <Logo />
        <span className="rounded-full bg-soft px-2.5 py-1 text-xs text-muted">Shoot calendar · view only</span>
      </div>
      <PublicCalendar month={monthKey(month)} shoots={shoots} />
    </main>
  );
}
