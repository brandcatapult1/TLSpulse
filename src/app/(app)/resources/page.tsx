import { ResourcesPage } from "@/components/masters/ResourcesPage";
import { requireStaffPage } from "@/lib/auth";

export default async function Page() {
  const user = await requireStaffPage();
  return <ResourcesPage isAdmin={user.role === "ADMIN"} />;
}
