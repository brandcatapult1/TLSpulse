"use client";

import { format } from "date-fns";
import clsx from "clsx";
import { Copy, ExternalLink } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Dialog } from "../Overlay";
import { useToast } from "../Toast";
import { Button, PageHeader, Skeleton } from "../ui";

type Entry = { id: string; summary: string; action: string; entity: string; at: string };

export function SettingsPage() {
  const toast = useToast();
  const [link, setLink] = useState<{ path: string; enabled: boolean } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [more, setMore] = useState(true);
  const url = link ? `${window.location.origin}${link.path}` : "";

  const loadAudit = useCallback(async (before?: string) => {
    const r = await api<{ entries: Entry[] }>(`/api/audit${before ? `?before=${encodeURIComponent(before)}` : ""}`);
    setEntries((e) => (before ? [...(e ?? []), ...r.entries] : r.entries));
    setMore(r.entries.length === 50);
  }, []);

  useEffect(() => {
    api<{ path: string; enabled: boolean }>("/api/admin/public-link")
      .then(setLink)
      .catch((e) => toast(e.message, "error"));
    loadAudit().catch(() => {});
  }, [loadAudit, toast]);

  async function setSharing(enabled: boolean) {
    setConfirm(false);
    try {
      setLink(await api<{ path: string; enabled: boolean }>("/api/admin/public-link", { body: { enabled } }));
      toast(enabled ? "Public calendar is shared again" : "Public calendar turned off");
      loadAudit();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <PageHeader title="Settings" />

      <section className="rounded-2xl border border-line p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold">Public calendar</h2>
            <p className="mt-1 text-sm text-muted">
              Read-only calendar for Account Management, other departments and agencies. No login needed. Shows brand, type, time, location and deployed resources — never internal notes or
              cancelled shoots.
            </p>
          </div>
          {link && (
            <button
              role="switch"
              aria-checked={link.enabled}
              aria-label="Share public calendar"
              onClick={() => (link.enabled ? setConfirm(true) : setSharing(true))}
              className={clsx("relative mt-1 h-6 w-11 shrink-0 rounded-full transition-colors", link.enabled ? "bg-ok" : "bg-line")}
            >
              <span className={clsx("absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-all", link.enabled ? "left-[22px]" : "left-0.5")} />
            </button>
          )}
        </div>
        {link ? (
          <>
            <div className={clsx("mt-4 flex flex-col gap-2 sm:flex-row", !link.enabled && "opacity-50")}>
              <input readOnly value={url} onFocus={(e) => e.target.select()} className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-soft px-3 font-mono text-sm" />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={!link.enabled}
                  onClick={() => {
                    navigator.clipboard.writeText(url);
                    toast("Link copied");
                  }}
                >
                  <Copy size={15} /> Copy
                </Button>
                <a href={url} target="_blank" rel="noreferrer" aria-disabled={!link.enabled} className={clsx(!link.enabled && "pointer-events-none")}>
                  <Button variant="outline" disabled={!link.enabled}>
                    <ExternalLink size={15} /> Open
                  </Button>
                </a>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted">
              {link.enabled
                ? "Sharing is on. Anyone with this address can view the calendar, so share it only with the teams who need it."
                : "Sharing is off. The address shows a “not being shared” message until you switch it back on."}
            </p>
          </>
        ) : (
          <Skeleton className="mt-4 h-10" />
        )}
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
        title="Turn off the public calendar?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => setSharing(false)}>
              Turn off
            </Button>
          </>
        }
      >
        <p className="text-muted">Account Management and agencies won&apos;t be able to see shoot dates until you switch it back on.</p>
      </Dialog>
    </div>
  );
}
