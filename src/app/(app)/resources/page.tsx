import { ResourcesPage } from "@/components/masters/ResourcesPage";
import { requireUserPage } from "@/lib/auth";

export default async function Page() {
  const user = await requireUserPage();
  return <ResourcesPage isAdmin={user.role === "ADMIN"} />;
}
