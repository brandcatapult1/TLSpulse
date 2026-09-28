import { BrandsPage } from "@/components/masters/BrandsPage";
import { requireUserPage } from "@/lib/auth";

export default async function Page() {
  const user = await requireUserPage();
  return <BrandsPage isAdmin={user.role === "ADMIN"} />;
}
