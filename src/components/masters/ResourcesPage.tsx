"use client";

import clsx from "clsx";
import { BarChart3, Copy, KeyRound, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { formatPhone } from "@/lib/contact";
import { CREW_LOGIN_ENABLED } from "@/lib/permissions";
import type { Engagement, ResourceDTO, TeamDTO } from "@/lib/types";
import { Dialog, Drawer } from "../Overlay";
import { useToast } from "../Toast";
import { Button, EmptyState, FormError, Input, Label, PageHeader, Select, Skeleton } from "../ui";
import { StatusDot, Table, Td, Th } from "./Table";

export function ResourcesPage({ isAdmin }: { isAdmin: boolean }) {
  const toast = useToast();
  const [tab, setTab] = useState<"resources" | "teams">("resources");
  const [resources, setResources] = useState<ResourceDTO[] | null>(null);
  const [teams, setTeams] = useState<TeamDTO[] | null>(null);
  const [q, setQ] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | Engagement>("");
  const [showInactive, setShowInactive] = useState(false);
  const [editRes, setEditRes] = useState<ResourceDTO | "new" | null>(null);
  const [editTeam, setEditTeam] = useState<TeamDTO | "new" | null>(null);

  const load = useCallback(async () => {
    const [r, t] = await Promise.all([api<{ resources: ResourceDTO[] }>("/api/resources"), api<{ teams: TeamDTO[] }>("/api/teams")]);
    setResources(r.resources);
    setTeams(t.teams);
  }, []);
  useEffect(() => {
    load().catch((e) => toast(e.message, "error"));
  }, [load, toast]);

  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (resources ?? []).filter(
      (r) =>
        (showInactive || r.status === "ACTIVE") &&
        (!teamFilter || r.teamId === teamFilter) &&
        (!typeFilter || r.teamType === typeFilter) &&
        (!n || `${r.name} ${r.role} ${r.teamName} ${r.email ?? ""} ${r.phone ?? ""}`.toLowerCase().includes(n)),
    );
  }, [resources, q, teamFilter, typeFilter, showInactive]);
  const inactive = (resources ?? []).filter((r) => r.status === "INACTIVE").length;

  const saved = (msg: string) => {
    setEditRes(null);
    setEditTeam(null);
    toast(msg);
    load();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <PageHeader
        title="Resources"
        subtitle="People who can be deployed on shoots, grouped by team."
        actions={
          isAdmin &&
          (tab === "resources" ? (
            <Button onClick={() => setEditRes("new")} disabled={!teams?.length}>
              <Plus size={16} /> Add resource
            </Button>
          ) : (
            <Button onClick={() => setEditTeam("new")}>
              <Plus size={16} /> Add team
            </Button>
          ))
        }
      />

      <div className="mb-4 inline-flex rounded-xl bg-soft p-1 text-sm">
        {(["resources", "teams"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={clsx("rounded-lg px-4 py-1.5 capitalize", tab === t ? "bg-surface font-medium shadow-sm" : "text-muted")}>
            {t}
          </button>
        ))}
      </div>

      {tab === "resources" ? (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative w-full max-w-xs">
              <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, role, mobile, email" className="pl-9" />
            </div>
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as "" | Engagement)} className="w-auto" aria-label="Internal or external">
              <option value="">Internal + External</option>
              <option value="INTERNAL">Internal only</option>
              <option value="EXTERNAL">External only</option>
            </Select>
            <Select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className="w-auto" aria-label="Team">
              <option value="">All teams</option>
              {teams?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            {inactive > 0 && (
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Show inactive ({inactive})
              </label>
            )}
          </div>
          {!resources ? (
            <Skeleton className="h-64" />
          ) : list.length === 0 ? (
            <EmptyState title="No resources found" hint={isAdmin ? "Add the TLS team members who get deployed on shoots." : undefined} />
          ) : (
            <Table
              head={
                <>
                  <Th>Name</Th>
                  <Th className="hidden sm:table-cell">Role</Th>
                  <Th className="hidden lg:table-cell">Contact</Th>
                  <Th className="hidden sm:table-cell">Team</Th>
                  <Th className="hidden md:table-cell">Type</Th>
                  <Th className="text-right">This month</Th>
                  <Th className="hidden md:table-cell">Status</Th>
                  <Th className="w-10" />
                </>
              }
            >
              {list.map((r) => (
                <tr key={r.id} onClick={() => isAdmin && setEditRes(r)} className={clsx(isAdmin && "cursor-pointer", "hover:bg-soft/60")}>
                  <Td className="font-medium">
                    {r.name}
                    {CREW_LOGIN_ENABLED && r.login && (
                      <KeyRound
                        size={12}
                        className={clsx("ml-1.5 inline", r.login.status === "ACTIVE" ? "text-ok" : "text-muted")}
                        aria-label={r.login.status === "ACTIVE" ? "Has a crew login" : "Crew login switched off"}
                      />
                    )}
                    <span className="block text-xs font-normal text-muted sm:hidden">
                      {r.role} · {r.teamName} · {r.teamType === "EXTERNAL" ? "External" : "Internal"}
                    </span>
                  </Td>
                  <Td className="hidden sm:table-cell">{r.role}</Td>
                  <Td className="hidden text-xs text-muted lg:table-cell">
                    {r.phone && <span className="tabular block">{formatPhone(r.phone)}</span>}
                    {r.email && <span className="block">{r.email}</span>}
                    {!r.phone && !r.email && "—"}
                  </Td>
                  <Td className="hidden text-muted sm:table-cell">{r.teamName}</Td>
                  <Td className="hidden md:table-cell">
                    <TeamTypeBadge type={r.teamType} />
                  </Td>
                  <Td className="tabular text-right">{r.shootsThisMonth ?? 0}</Td>
                  <Td className="hidden md:table-cell">
                    <StatusDot active={r.status === "ACTIVE"} />
                  </Td>
                  <Td>
                    <Link
                      href={`/reports?resource=${r.id}`}
                      onClick={(e) => e.stopPropagation()}
                      title={`${r.name}'s shoots`}
                      className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-soft hover:text-ink"
                    >
                      <BarChart3 size={15} />
                    </Link>
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </>
      ) : !teams ? (
        <Skeleton className="h-40" />
      ) : (
        <div className="space-y-6">
          {(["INTERNAL", "EXTERNAL"] as const).map((type) => {
            const group = teams.filter((t) => t.type === type);
            return (
              <section key={type}>
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <TeamTypeBadge type={type} /> {type === "INTERNAL" ? "Internal teams" : "External teams"}
                  <span className="font-normal text-muted">· {group.length}</span>
                </h2>
                {group.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-line px-4 py-5 text-sm text-muted">
                    No {type === "INTERNAL" ? "internal" : "external"} teams yet.{isAdmin ? " Use Add team." : ""}
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {group.map((t) => {
                      const members = (resources ?? []).filter((r) => r.teamId === t.id && r.status === "ACTIVE");
                      const assignments = members.reduce((n, r) => n + (r.shootsThisMonth ?? 0), 0);
                      return (
                        <button
                          key={t.id}
                          disabled={!isAdmin}
                          onClick={() => setEditTeam(t)}
                          className={clsx("rounded-2xl border border-line p-4 text-left transition-colors", isAdmin && "hover:bg-soft/60", t.status === "INACTIVE" && "opacity-60")}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold">{t.name}</span>
                            {t.status === "INACTIVE" ? <StatusDot active={false} /> : <TeamTypeBadge type={t.type} />}
                          </div>
                          <div className="tabular mt-1 text-sm text-muted">
                            {members.length} {members.length === 1 ? "member" : "members"} · {assignments} {assignments === 1 ? "assignment" : "assignments"} this month
                          </div>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {members.map((m) => (
                              <span key={m.id} className="rounded-full bg-soft px-2 py-0.5 text-xs">
                                {m.name}
                              </span>
                            ))}
                            {!members.length && <span className="text-xs text-muted">No active members</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {isAdmin && (
        <>
          <ResourceDrawer resource={editRes} teams={teams ?? []} onClose={() => setEditRes(null)} onSaved={saved} />
          <TeamDrawer team={editTeam} onClose={() => setEditTeam(null)} onSaved={saved} />
        </>
      )}
    </div>
  );
}

function useAction(onSaved: (m: string) => void) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onSaved(msg);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return { error, setError, busy, run };
}

function ResourceDrawer({ resource, teams, onClose, onSaved }: { resource: ResourceDTO | "new" | null; teams: TeamDTO[]; onClose: () => void; onSaved: (m: string) => void }) {
  const existing = resource && resource !== "new" ? resource : null;
  const [f, setF] = useState({ name: "", role: "", teamId: "", email: "", phone: "" });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { error, setError, busy, run } = useAction(onSaved);

  useEffect(() => {
    setError(null);
    setF({
      name: existing?.name ?? "",
      role: existing?.role ?? "",
      teamId: existing?.teamId ?? teams.find((t) => t.status === "ACTIVE")?.id ?? "",
      email: existing?.email ?? "",
      phone: existing?.phone ?? "",
    });
  }, [resource]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedTeam = teams.find((t) => t.id === f.teamId);
  const save = () =>
    run(
      () => (existing ? api(`/api/resources/${existing.id}`, { method: "PATCH", body: f }) : api("/api/resources", { body: f })),
      existing ? "Resource updated" : `${f.name} added`,
    );

  return (
    <>
      <Drawer
        open={!!resource}
        onClose={onClose}
        title={existing ? "Edit resource" : "Add resource"}
        footer={
          <div className="flex w-full items-center gap-2">
            {existing && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    run(
                      () => api(`/api/resources/${existing.id}`, { method: "PATCH", body: { status: existing.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" } }),
                      existing.status === "ACTIVE" ? `${existing.name} deactivated` : `${existing.name} reactivated`,
                    )
                  }
                >
                  {existing.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
                </Button>
                <Button variant="ghost" size="sm" className="text-danger" onClick={() => setConfirmDelete(true)}>
                  Delete
                </Button>
              </>
            )}
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={save} disabled={busy || !f.name.trim() || !f.role.trim() || !f.teamId}>
                {existing ? "Save" : "Add resource"}
              </Button>
            </div>
          </div>
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
            <Label htmlFor="rname">Name</Label>
            <Input id="rname" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
          </div>
          <div>
            <Label htmlFor="rrole">Designation / Role</Label>
            <Input id="rrole" list="roles" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} placeholder="Photographer, Videographer, Producer…" required />
            <datalist id="roles">
              {["Photographer", "Videographer", "Producer", "Editor", "Stylist", "Assistant"].map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="rphone">Mobile</Label>
              <Input id="rphone" type="tel" inputMode="tel" autoComplete="off" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="98765 43210" />
            </div>
            <div>
              <Label htmlFor="remail">Email</Label>
              <Input id="remail" type="email" autoComplete="off" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="name@example.com" />
            </div>
          </div>
          <p className="-mt-2 text-xs text-muted">Crew use their mobile or email to open their schedule at /crew. Each must be unique.</p>
          <div>
            <Label htmlFor="rteam">Team</Label>
            <Select id="rteam" value={f.teamId} onChange={(e) => setF({ ...f, teamId: e.target.value })}>
              {(["INTERNAL", "EXTERNAL"] as const).map((type) => {
                const group = teams.filter((t) => t.type === type);
                if (!group.length) return null;
                return (
                  <optgroup key={type} label={type === "INTERNAL" ? "Internal teams" : "External teams"}>
                    {group.map((t) => (
                      <option key={t.id} value={t.id} disabled={t.status === "INACTIVE" && t.id !== existing?.teamId}>
                        {t.name}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </Select>
            {selectedTeam && (
              <p className="mt-2 flex items-center gap-2 text-xs text-muted">
                <TeamTypeBadge type={selectedTeam.type} /> {f.name.trim() || "This person"} will be marked {selectedTeam.type === "EXTERNAL" ? "External" : "Internal"}, from the
                team.
              </p>
            )}
          </div>
          <FormError message={error} />
          <button type="submit" hidden />
        </form>
        {existing && CREW_LOGIN_ENABLED && <CrewLogin resource={existing} onChanged={(m) => onSaved(m)} />}
      </Drawer>
      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete ${existing?.name}?`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Keep
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirmDelete(false);
                run(() => api(`/api/resources/${existing!.id}`, { method: "DELETE" }), `${existing!.name} deleted`);
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-muted">Only people who were never assigned to a shoot can be deleted. Otherwise deactivate them to keep reports accurate.</p>
      </Dialog>
    </>
  );
}

function TeamDrawer({ team, onClose, onSaved }: { team: TeamDTO | "new" | null; onClose: () => void; onSaved: (m: string) => void }) {
  const existing = team && team !== "new" ? team : null;
  const [name, setName] = useState("");
  const [type, setType] = useState<Engagement | "">("");
  const { error, setError, busy, run } = useAction(onSaved);
  useEffect(() => {
    setError(null);
    setName(existing?.name ?? "");
    setType(existing?.type ?? "");
  }, [team]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = () =>
    run(
      () => (existing ? api(`/api/teams/${existing.id}`, { method: "PATCH", body: { name, type } }) : api("/api/teams", { body: { name, type } })),
      existing ? "Team updated" : `${name} added as ${type === "EXTERNAL" ? "an external" : "an internal"} team`,
    );
  return (
    <Drawer
      open={!!team}
      onClose={onClose}
      title={existing ? "Edit team" : "Add team"}
      footer={
        <div className="flex w-full items-center gap-2">
          {existing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                run(
                  () => api(`/api/teams/${existing.id}`, { method: "PATCH", body: { status: existing.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" } }),
                  existing.status === "ACTIVE" ? `${existing.name} deactivated` : `${existing.name} reactivated`,
                )
              }
            >
              {existing.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save} disabled={busy || !name.trim() || !type}>
              {existing ? "Save" : "Add team"}
            </Button>
          </div>
        </div>
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
          <Label htmlFor="tname">Team name</Label>
          <Input id="tname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Photography, Video, Freelance Crew…" required />
        </div>
        <div>
          <Label>Team type</Label>
          <div role="radiogroup" className="grid grid-cols-2 gap-2">
            {(["INTERNAL", "EXTERNAL"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={type === t}
                onClick={() => setType(t)}
                className={clsx("rounded-xl border px-3 py-2.5 text-left text-sm", type === t ? "border-ink bg-soft" : "border-line hover:bg-soft")}
              >
                <span className="flex items-center gap-2 font-medium">
                  <TeamTypeBadge type={t} />
                </span>
                <span className="mt-1 block text-xs text-muted">{t === "INTERNAL" ? "TLS staff" : "Freelancers, vendors, agency crew"}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">Everyone added to this team is marked {type === "EXTERNAL" ? "External" : type === "INTERNAL" ? "Internal" : "with this type"}.</p>
        </div>
        <FormError message={error} />
        <button type="submit" hidden />
      </form>
    </Drawer>
  );
}

/** Admin: give a resource their own view-only login (sees only their shoots and report). */
function CrewLogin({ resource, onChanged }: { resource: ResourceDTO; onChanged: (msg: string) => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<string | null>(null);
  const login = resource.login;
  const active = login?.status === "ACTIVE";

  async function run(fn: () => Promise<{ tempPassword?: string } | unknown>, msg: string) {
    setBusy(true);
    setError(null);
    try {
      const r = (await fn()) as { tempPassword?: string };
      if (r?.tempPassword) setIssued(r.tempPassword);
      else onChanged(msg);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 border-t border-line pt-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <KeyRound size={15} /> Crew login
      </h3>
      <p className="mt-1 text-xs text-muted">Lets {resource.name} log in to see only their own shoots and report. They can&apos;t create or change anything.</p>
      {login ? (
        <div className="mt-3 rounded-xl bg-soft px-3 py-2.5 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[13px]">{login.email}</span>
            <span className={clsx("text-xs", active ? "text-ok" : "text-muted")}>{active ? (login.mustChangePw ? "Awaiting first login" : "Active") : "Switched off"}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={busy} onClick={() => run(() => api(`/api/resources/${resource.id}/login`, { body: {} }), "")}>
              {active ? "Reset password" : "Switch on again"}
            </Button>
            {active && (
              <Button
                variant="outline"
                size="sm"
                className="text-danger"
                disabled={busy}
                onClick={() => run(() => api(`/api/resources/${resource.id}/login`, { method: "DELETE" }), `${resource.name}'s login switched off`)}
              >
                Switch off
              </Button>
            )}
          </div>
        </div>
      ) : (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => api(`/api/resources/${resource.id}/login`, { body: { email } }), "");
          }}
        >
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={`${resource.name.toLowerCase().split(" ")[0]}@…`}
            aria-label="Login email"
            required
          />
          <Button type="submit" disabled={busy || !email.trim()}>
            Give login
          </Button>
        </form>
      )}
      <FormError message={error} />
      <Dialog
        open={!!issued}
        onClose={() => {
          setIssued(null);
          onChanged(`${resource.name} can now log in`);
        }}
        title="Temporary password"
        footer={
          <Button
            onClick={() => {
              setIssued(null);
              onChanged(`${resource.name} can now log in`);
            }}
          >
            Done
          </Button>
        }
      >
        <p className="text-muted">
          Share this with <b className="text-ink">{resource.name}</b>. It&apos;s shown only once; they&apos;ll set their own password on first login.
        </p>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-soft px-3 py-2">
          <code className="flex-1 font-mono text-base">{issued}</code>
          <Button variant="outline" size="sm" onClick={() => issued && navigator.clipboard.writeText(issued)}>
            <Copy size={14} /> Copy
          </Button>
        </div>
      </Dialog>
    </section>
  );
}

export function TeamTypeBadge({ type }: { type: Engagement }) {
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", type === "EXTERNAL" ? "bg-warn-bg text-warn" : "bg-ok/10 text-ok")}>
      {type === "EXTERNAL" ? "External" : "Internal"}
    </span>
  );
}
