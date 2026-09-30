"use client";

import { useState } from "react";
import { Button, FormError, Input, Label } from "@/components/ui";

export function ChangePasswordForm({ canCancel }: { canCancel: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (form.get("newPassword") !== form.get("confirm")) {
      setError("The new passwords don't match");
      return;
    }
    if (form.get("newPassword") === form.get("currentPassword")) {
      setError("Choose a password different from the current one");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword") }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not change password");
      setBusy(false);
      return;
    }
    window.location.assign("/");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="currentPassword" required>Current password</Label>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </div>
      <div>
        <Label htmlFor="newPassword" required>New password</Label>
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <div>
        <Label htmlFor="confirm" required>Confirm new password</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <FormError message={error} />
      <div className="flex gap-2">
        {canCancel && (
          <Button type="button" variant="outline" className="flex-1" onClick={() => history.back()}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={busy} className="flex-1">
          {busy ? "Saving…" : "Save password"}
        </Button>
      </div>
    </form>
  );
}
