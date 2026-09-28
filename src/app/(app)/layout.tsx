import { AppShell } from "@/components/AppShell";
import { requireUserPage } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUserPage();
  return (
    <AppShell name={user.name} role={user.role}>
      {children}
    </AppShell>
  );
}
