import { Suspense } from "react";
import { CalendarApp } from "@/components/calendar/CalendarApp";
import { requireUserPage } from "@/lib/auth";

export default async function CalendarPage() {
  const user = await requireUserPage();
  return (
    <Suspense>
      <CalendarApp isAdmin={user.role === "ADMIN"} />
    </Suspense>
  );
}
