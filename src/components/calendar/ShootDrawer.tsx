"use client";

import { format } from "date-fns";
import { CalendarClock, ChevronDown, Pencil, Trash2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ShootDTO } from "@/lib/types";
import { Dialog, Drawer } from "../Overlay";
import { useToast } from "../Toast";
import { Button } from "../ui";
import { RescheduleDialog } from "../shoot/RescheduleDialog";
import { ShootDetails } from "./ShootDetails";

type Detail = {
  shoot: ShootDTO;
  meta: { createdBy: string; createdAt: string; updatedBy: string; updatedAt: string };
  history: { id: string; summary: string; at: string }[];
};

/** Internal shoot details with actions (PRD §11, §23–24). */
export function ShootDrawer({
  shoot,
  isAdmin,
  readOnly = false,
  onClose,
  onEdit,
  onChanged,
  onDeleted,
}: {
  shoot: ShootDTO | null;
  isAdmin: boolean;
  readOnly?: boolean;
  onClose: () => void;
  onEdit: (s: ShootDTO) => void;
  onChanged: (s: ShootDTO) => void;
  onDeleted: (id: string) => void;
}) {
  const toast = useToast();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirm, setConfirm] = useState<"cancel" | "delete" | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDetail(null);
    setHistoryOpen(false);
    if (!shoot) return;
    let live = true;
    api<Detail>(`/api/shoots/${shoot.id}`)
      .then((d) => live && setDetail(d))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [shoot]);

  if (!shoot) return null;
  const current = detail?.shoot ?? shoot;
  const cancelled = current.status === "CANCELLED";

  // Cancelling is final; there is no restore.
  async function cancelShoot() {
    setBusy(true);
    try {
      const { shoot: s } = await api<{ shoot: ShootDTO }>(`/api/shoots/${current.id}`, { method: "PATCH", body: { status: "CANCELLED" } });
      onChanged(s);
      toast(`${s.brandName} shoot cancelled`);
      setConfirm(null);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api(`/api/shoots/${current.id}`, { method: "DELETE" });
      onDeleted(current.id);
      toast("Shoot deleted");
      setConfirm(null);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        title={<span className="text-lg">{current.brandName}</span>}
        footer={
          readOnly ? undefined : (
            <div className="w-full space-y-2">
              {/* Status actions: cancel (final) or pick a new date/time */}
              {!cancelled && (
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="text-danger" onClick={() => setConfirm("cancel")}>
                    <XCircle size={15} /> Cancel Shoot
                  </Button>
                  <Button variant="outline" onClick={() => setRescheduling(true)}>
                    <CalendarClock size={15} /> Reschedule Shoot
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Button variant="ghost" size="sm" className="text-danger" onClick={() => setConfirm("delete")}>
                    <Trash2 size={15} /> Delete
                  </Button>
                )}
                <Button className="ml-auto" onClick={() => onEdit(current)}>
                  <Pencil size={15} /> Edit
                </Button>
              </div>
            </div>
          )
        }
      >
        <ShootDetails shoot={current} />
        <div className="mt-6 border-t border-line pt-4 text-xs text-muted">
          {detail ? (
            <>
              <p>
                Created by {detail.meta.createdBy}, {format(new Date(detail.meta.createdAt), "d MMM, h:mm a")}
                {detail.meta.updatedAt !== detail.meta.createdAt && ` · Last edited by ${detail.meta.updatedBy}, ${format(new Date(detail.meta.updatedAt), "d MMM, h:mm a")}`}
              </p>
              {detail.history.length > 0 && (
                <>
                  <button onClick={() => setHistoryOpen((o) => !o)} className="mt-2 inline-flex items-center gap-1 font-medium text-ink/80 hover:text-ink">
                    History <ChevronDown size={13} className={historyOpen ? "rotate-180" : ""} />
                  </button>
                  {historyOpen && (
                    <ul className="mt-2 space-y-1.5">
                      {detail.history.map((h) => (
                        <li key={h.id} className="flex gap-2">
                          <span className="tabular shrink-0">{format(new Date(h.at), "d MMM")}</span>
                          <span className="text-ink/80">{h.summary}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </>
          ) : (
            <p>Loading history…</p>
          )}
        </div>
      </Drawer>

      {rescheduling && (
        <RescheduleDialog
          shoot={current}
          mode="save"
          onClose={() => setRescheduling(false)}
          onSaved={(s) => {
            setRescheduling(false);
            onChanged(s);
          }}
        />
      )}

      <Dialog
        open={confirm === "cancel"}
        onClose={() => setConfirm(null)}
        title={`Cancel ${current.brandName} shoot?`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Keep it
            </Button>
            <Button variant="danger" onClick={cancelShoot} disabled={busy}>
              Cancel shoot
            </Button>
          </>
        }
      >
        <p className="text-muted">It stays in history and reports as Cancelled and disappears from the public calendar. This can’t be undone.</p>
      </Dialog>

      <Dialog
        open={confirm === "delete"}
        onClose={() => setConfirm(null)}
        title={`Delete ${current.brandName} shoot?`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Keep it
            </Button>
            <Button variant="danger" onClick={remove} disabled={busy}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-muted">Use this only for shoots entered by mistake. It will be removed from the calendar and all reports. To keep a record, cancel it instead.</p>
      </Dialog>
    </>
  );
}
