import { Placeholder } from "@/components/Placeholder";
import { requireAdminPage } from "@/lib/auth";

export default async function SettingsPage() {
  await requireAdminPage();
  return <Placeholder title="Settings" milestone="M4 · Masters (public link, audit log)" />;
}
