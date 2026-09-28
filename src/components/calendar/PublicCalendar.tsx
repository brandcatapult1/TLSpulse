"use client";

import { addMonths, isSameMonth } from "date-fns";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { monthKey, parseMonth, ymd } from "@/lib/dates";
import type { ShootDTO } from "@/lib/types";
import { Drawer } from "../Overlay";
import { CalendarView } from "./CalendarView";
import { ShootDetails } from "./ShootDetails";

/** Read-only calendar for the shareable link (PRD §5). No create, edit, move or admin actions. */
export function PublicCalendar({ month: mk, shoots }: { month: string; shoots: ShootDTO[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const month = parseMonth(mk);
  const today = ymd(new Date());
  const [selectedDate, setSelectedDate] = useState(isSameMonth(new Date(), month) ? today : ymd(month));
  const [open, setOpen] = useState<ShootDTO | null>(null);

  const goto = (m: Date) => {
    setSelectedDate(isSameMonth(new Date(), m) ? today : ymd(m));
    router.push(`${pathname}?m=${monthKey(m)}`, { scroll: false });
  };

  return (
    <>
      <CalendarView
        month={month}
        shoots={shoots}
        today={today}
        publicView
        onPrev={() => goto(addMonths(month, -1))}
        onNext={() => goto(addMonths(month, 1))}
        onToday={() => goto(parseMonth(null))}
        onOpenShoot={setOpen}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />
      <Drawer open={!!open} onClose={() => setOpen(null)} title={open && <span className="text-lg">{open.brandName}</span>}>
        {open && <ShootDetails shoot={open} publicView />}
      </Drawer>
    </>
  );
}
