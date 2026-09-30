"use client";

import { useState } from "react";
import { Button, FormError, Input, Label } from "@/components/ui";

export function CrewLookup() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const contact = new FormData(e.currentTarget).get("contact");
    const res = await fetch("/api/crew/lookup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contact }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      setBusy(false);
      return;
    }
    window.location.reload();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="contact" required>Your mobile number or email</Label>
        <Input id="contact" name="contact" autoComplete="tel" inputMode="email" placeholder="98765 43210 or name@example.com" required autoFocus />
      </div>
      <FormError message={error} />
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Checking…" : "Show my schedule"}
      </Button>
      <p className="text-center text-xs text-muted">Use the mobile or email the TLS team has on your profile.</p>
    </form>
  );
}
