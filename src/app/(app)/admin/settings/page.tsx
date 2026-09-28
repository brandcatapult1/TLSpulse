import { SettingsPage } from "@/components/masters/SettingsPage";
import { requireAdminPage } from "@/lib/auth";

export default async function Page() {
  await requireAdminPage();
  return <SettingsPage />;
}
