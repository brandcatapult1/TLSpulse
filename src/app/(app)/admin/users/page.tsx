import { Placeholder } from "@/components/Placeholder";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function UsersPage() {
  await requireAdminPage();
  const users = await db.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, email: true, role: true, status: true } });
  return (
    <Placeholder title="Users" milestone="M4 · Masters (add, change role, block, reset password)">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted">
            <th className="py-1 text-left font-medium">Name</th>
            <th className="py-1 text-left font-medium">Email</th>
            <th className="py-1 text-left font-medium">Role</th>
            <th className="py-1 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-line text-ink">
              <td className="py-1.5">{u.name}</td>
              <td className="py-1.5">{u.email}</td>
              <td className="py-1.5">{u.role === "ADMIN" ? "Admin" : "User"}</td>
              <td className="py-1.5">{u.status === "ACTIVE" ? "Active" : "Blocked"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Placeholder>
  );
}
