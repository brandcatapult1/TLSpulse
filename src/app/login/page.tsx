import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect("/");
  // Only allow same-site relative redirects.
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  return (
    <main className="grid min-h-dvh place-items-center bg-soft px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo size="lg" />
          <p className="mt-2 text-sm text-muted">Shoot planning for The Lightscape Studio</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <LoginForm next={safeNext} />
        </div>
      </div>
    </main>
  );
}
