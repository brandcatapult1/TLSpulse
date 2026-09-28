"use client";

import clsx from "clsx";
import { format, formatDistanceToNow } from "date-fns";
import { Copy, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Dialog, Drawer } from "../Overlay";
import { useToast } from "../Toast";
import { Button, FormError, Input, Label, PageHeader, Pill, Skeleton } from "../ui";
import { Table, Td, Th } from "./Table";

type User = { id: string; name: string; email: string; role: "ADMIN" | "USER"; status: "ACTIVE" | "INACTIVE"; lastLoginAt: string | null; mustChangePw: boolean; createdAt: string };

export function UsersPage({ meId }: { meId: string }) {
  const toast = useToast();
  const [users, setUsers] = useState<User[] | null>(null);
  const [editing, setEditing] = useState<User | "new" | null>(null);
  const [issued, setIssued] = useState<{ name: string; email: string; password: string } | null>(null);

  const load = useCallback(() => api<{ users: User[] }>("/api/users").then((r) => setUsers(r.users)), []);
  useEffect(() => {
    load().catch((e) => toast(e.message, "error"));
  }, [load, toast]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <PageHeader
        title="Users"
        subtitle="People who can log in to TLS Pulse. Admins manage master data and users."
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus size={16} /> Add user
          </Button>
        }
      />
      {!users ? (
        <Skeleton className="h-48" />
      ) : (
        <Table
          head={
            <>
              <Th>Name</Th>
              <Th className="hidden sm:table-cell">Email</Th>
              <Th>Role</Th>
              <Th className="hidden md:table-cell">Status</Th>
              <Th className="hidden md:table-cell">Last login</Th>
            </>
          }
        >
          {users.map((u) => (
            <tr key={u.id} onClick={() => setEditing(u)} className={clsx("cursor-pointer hover:bg-soft/60", u.status === "INACTIVE" && "opacity-60")}>
              <Td className="font-medium">
                {u.name} {u.id === meId && <span className="text-xs font-normal text-muted">(you)</span>}
                <span className="block text-xs font-normal text-muted sm:hidden">{u.email}</span>
              </Td>
              <Td className="hidden text-muted sm:table-cell">{u.email}</Td>
              <Td>
                <Pill className={u.role === "ADMIN" ? "bg-social-bg text-social" : "bg-soft text-muted"}>{u.role === "ADMIN" ? "Admin" : "User"}</Pill>
              </Td>
              <Td className="hidden md:table-cell">
                {u.status === "INACTIVE" ? (
                  <span className="text-xs text-danger">Blocked</span>
                ) : u.mustChangePw ? (
                  <span className="text-xs text-warn">Awaiting first login</span>
                ) : (
                  <span className="text-xs text-ok">Active</span>
                )}
              </Td>
              <Td className="hidden text-muted md:table-cell">{u.lastLoginAt ? formatDistanceToNow(new Date(u.lastLoginAt), { addSuffix: true }) : "Never"}</Td>
            </tr>
          ))}
        </Table>
      )}

      <UserDrawer
        user={editing}
        meId={meId}
        onClose={() => setEditing(null)}
        onDone={(msg, pw) => {
          setEditing(null);
          if (pw) setIssued(pw);
          else toast(msg);
          load();
        }}
      />

      <Dialog
        open={!!issued}
        onClose={() => setIssued(null)}
        title="Temporary password"
        footer={
          <Button onClick={() => setIssued(null)} autoFocus>
            Done
          </Button>
        }
      >
        {issued && (
          <>
            <p className="text-muted">
              Share this with <b className="text-ink">{issued.name}</b> ({issued.email}). It is shown only once, and they will be asked to set their own password when they log in.
            </p>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-soft px-3 py-2">
              <code className="flex-1 font-mono text-base">{issued.password}</code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(issued.password);
                  toast("Copied");
                }}
              >
                <Copy size={14} /> Copy
              </Button>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}

function UserDrawer({
  user,
  meId,
  onClose,
  onDone,
}: {
  user: User | "new" | null;
  meId: string;
  onClose: () => void;
  onDone: (msg: string, issued?: { name: string; email: string; password: string }) => void;
}) {
  const existing = user && user !== "new" ? user : null;
  const [f, setF] = useState({ name: "", email: "", role: "USER" as "ADMIN" | "USER" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isMe = existing?.id === meId;

  useEffect(() => {
    setError(null);
    setF({ name: existing?.name ?? "", email: existing?.email ?? "", role: existing?.role ?? "USER" });
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function call(body: object, msg: string) {
    setBusy(true);
    setError(null);
    try {
      const r = existing
        ? await api<{ user: User; tempPassword?: string }>(`/api/users/${existing.id}`, { method: "PATCH", body })
        : await api<{ user: User; tempPassword?: string }>("/api/users", { body });
      onDone(msg, r.tempPassword ? { name: r.user.name, email: r.user.email, password: r.tempPassword } : undefined);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const save = () => (existing ? call({ name: f.name, role: f.role }, "User updated") : call(f, "User added"));

  return (
    <Drawer
      open={!!user}
      onClose={onClose}
      title={existing ? existing.name : "Add user"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy || !f.name.trim() || (!existing && !f.email.trim())}>
            {existing ? "Save" : "Add user"}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div>
          <Label htmlFor="uname">Name</Label>
          <Input id="uname" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
        </div>
        <div>
          <Label htmlFor="uemail">Email</Label>
          <Input id="uemail" type="email" value={f.email} disabled={!!existing} onChange={(e) => setF({ ...f, email: e.target.value })} required />
        </div>
        <div>
          <Label>Role</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["USER", "ADMIN"] as const).map((r) => (
              <button
                key={r}
                type="button"
                disabled={isMe}
                onClick={() => setF({ ...f, role: r })}
                className={clsx("rounded-xl border px-3 py-2 text-left text-sm disabled:opacity-50", f.role === r ? "border-ink bg-soft" : "border-line hover:bg-soft")}
              >
                <span className="block font-medium">{r === "ADMIN" ? "Admin" : "User"}</span>
                <span className="text-xs text-muted">{r === "ADMIN" ? "Everything, incl. users & master data" : "Calendar, shoots, brands, reports"}</span>
              </button>
            ))}
          </div>
        </div>
        {!existing && <p className="text-xs text-muted">A temporary password is generated; you&apos;ll see it once after saving.</p>}
        <FormError message={error} />
        <button type="submit" hidden />
      </form>

      {existing && (
        <div className="mt-6 space-y-2 border-t border-line pt-4">
          <p className="text-xs text-muted">
            Added {format(new Date(existing.createdAt), "d MMM yyyy")} · Last login {existing.lastLoginAt ? format(new Date(existing.lastLoginAt), "d MMM, h:mm a") : "never"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={busy} onClick={() => call({ resetPassword: true }, "Password reset")}>
              Reset password
            </Button>
            {!isMe && (
              <Button
                variant="outline"
                size="sm"
                className={existing.status === "ACTIVE" ? "text-danger" : ""}
                disabled={busy}
                onClick={() => call({ status: existing.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }, existing.status === "ACTIVE" ? `${existing.name} blocked` : `${existing.name} unblocked`)}
              >
                {existing.status === "ACTIVE" ? "Block access" : "Unblock"}
              </Button>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
