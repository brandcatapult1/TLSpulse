import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="grid min-h-dvh place-items-center bg-soft px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo className="text-lg" />
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <h1 className="text-base font-semibold">
            {user.mustChangePw ? `Welcome, ${user.name}. Set your own password.` : "Change password"}
          </h1>
          <p className="mb-5 mt-1 text-sm text-muted">At least 8 characters.</p>
          <ChangePasswordForm canCancel={!user.mustChangePw} />
        </div>
      </div>
    </main>
  );
}
