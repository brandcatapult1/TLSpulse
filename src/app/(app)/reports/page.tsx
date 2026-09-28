import { Suspense } from "react";
import { MyReport } from "@/components/reports/MyReport";
import { ReportsPage } from "@/components/reports/ReportsPage";
import { requireUserPage } from "@/lib/auth";

export default async function Page() {
  const user = await requireUserPage();
  return <Suspense>{user.role === "CREW" ? <MyReport resourceId={user.resourceId} /> : <ReportsPage />}</Suspense>;
}
