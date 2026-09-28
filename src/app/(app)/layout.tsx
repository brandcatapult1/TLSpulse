import { TopBar } from "@/components/TopBar";
import { requireUserPage } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUserPage();
  return (
    <div className="min-h-dvh">
      <TopBar name={user.name} role={user.role} />
      <main>{children}</main>
    </div>
  );
}
