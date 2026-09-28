import { UsersPage } from "@/components/masters/UsersPage";
import { requireAdminPage } from "@/lib/auth";

export default async function Page() {
  const me = await requireAdminPage();
  return <UsersPage meId={me.id} />;
}
