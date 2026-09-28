import { BrandsPage } from "@/components/masters/BrandsPage";
import { requireStaffPage } from "@/lib/auth";

export default async function Page() {
  const user = await requireStaffPage();
  return <BrandsPage isAdmin={user.role === "ADMIN"} />;
}
