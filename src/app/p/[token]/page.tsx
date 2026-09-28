import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "TLS Pulse · Shoot calendar", robots: { index: false, follow: false } };

export default async function PublicCalendarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const setting = await db.setting.findUnique({ where: { key: "public_calendar_token" } });
  if (!setting || setting.value !== token) notFound();

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-6">
      <Logo />
      <div className="mt-6 rounded-2xl border border-dashed border-line bg-soft/60 p-8 text-center text-sm text-muted">
        Read-only shoot calendar. Built in <span className="font-medium text-ink">M5 · Public Calendar</span>.
      </div>
    </main>
  );
}
