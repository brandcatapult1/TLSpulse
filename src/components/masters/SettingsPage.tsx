"use client";

import { format } from "date-fns";
import { Copy, ExternalLink, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Dialog } from "../Overlay";
import { useToast } from "../Toast";
import { Button, PageHeader, Skeleton } from "../ui";

type Entry = { id: string; summary: string; action: string; entity: string; at: string };

export function SettingsPage() {
  const toast = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [more, setMore] = useState(true);
  const url = token ? `${window.location.origin}/p/${token}` : "";

  const loadAudit = useCallback(async (before?: string) => {
    const r = await api<{ entries: Entry[] }>(`/api/audit${before ? `?before=${encodeURIComponent(before)}` : ""}`);
    setEntries((e) => (before ? [...(e ?? []), ...r.entries] : r.entries));
    setMore(r.entries.length === 50);
  }, []);

  useEffect(() => {
    api<{ token: string }>("/api/admin/public-link")
      .then((r) => setToken(r.token))
      .catch((e) => toast(e.message, "error"));
    loadAudit().catch(() => {});
  }, [loadAudit, toast]);

  async function rotate() {
    setConfirm(false);
    const r = await api<{ token: string }>("/api/admin/public-link", { method: "POST" });
    setToken(r.token);
    toast("New public link created. The old link no longer works.");
    loadAudit();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <PageHeader title="Settings" />

      <section className="rounded-2xl border border-line p-5">
        <h2 className="font-semibold">Public calendar link</h2>
        <p className="mt-1 text-sm text-muted">
          Read-only calendar for Account Management, other departments and agencies. No login needed. Shows brand, type, time, location and deployed resources — never internal notes or cancelled shoots.
        </p>
        {token ? (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input readOnly value={url} onFocus={(e) => e.target.select()} className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-soft px-3 font-mono text-xs" />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(url);
                  toast("Link copied");
                }}
              >
                <Copy size={15} /> Copy
              </Button>
              <a href={url} target="_blank" rel="noreferrer">
                <Button variant="outline">
                  <ExternalLink size={15} /> Open
                </Button>
              </a>
            </div>
          </div>
        ) : (
          <Skeleton className="mt-4 h-10" />
        )}
        <Button variant="ghost" size="sm" className="mt-3 text-danger" onClick={() => setConfirm(true)}>
          <RefreshCw size={14} /> Regenerate link
        </Button>
      </section>

      <section className="mt-6 rounded-2xl border border-line p-5">
        <h2 className="font-semibold">Activity log</h2>
        <p className="mt-1 text-sm text-muted">Who created, moved, assigned or changed what.</p>
        {!entries ? (
          <Skeleton className="mt-4 h-40" />
        ) : entries.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Nothing yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line text-sm">
            {entries.map((e) => (
              <li key={e.id} className="flex gap-3 py-2">
                <span className="tabular w-28 shrink-0 text-xs text-muted">{format(new Date(e.at), "d MMM, h:mm a")}</span>
                <span>{e.summary}</span>
              </li>
            ))}
          </ul>
        )}
        {entries && more && (
          <Button variant="outline" size="sm" className="mt-3" onClick={() => loadAudit(entries[entries.length - 1]?.at)}>
            Load more
          </Button>
        )}
      </section>

      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Regenerate public link?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={rotate}>
              Regenerate
            </Button>
          </>
        }
      >
        <p className="text-muted">Everyone using the current link will lose access until you share the new one.</p>
      </Dialog>
    </div>
  );
}
