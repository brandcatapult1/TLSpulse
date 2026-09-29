"use client";

import { format } from "date-fns";
import { Plus, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { BrandDTO } from "@/lib/types";
import { Drawer } from "../Overlay";
import { useToast } from "../Toast";
import { Button, EmptyState, FormError, Input, Label, PageHeader, Select, Skeleton } from "../ui";
import { StatusDot, Table, Td, Th } from "./Table";

export function BrandsPage({ isAdmin }: { isAdmin: boolean }) {
  const toast = useToast();
  const [brands, setBrands] = useState<BrandDTO[] | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE" | "ALL">("ACTIVE");
  const [group, setGroup] = useState(""); // "" = all, "__none__" = no group
  const [sort, setSort] = useState<"name" | "name-desc" | "newest" | "oldest">("name");
  const [editing, setEditing] = useState<BrandDTO | "new" | null>(null);

  const load = useCallback(() => api<{ brands: BrandDTO[] }>("/api/brands").then((r) => setBrands(r.brands)), []);
  useEffect(() => {
    load().catch((e) => toast(e.message, "error"));
  }, [load, toast]);

  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    const rows = (brands ?? []).filter(
      (b) =>
        (status === "ALL" || b.status === status) &&
        (!group || (group === "__none__" ? !b.companyGroup : b.companyGroup === group)) &&
        (!n || b.name.toLowerCase().includes(n) || b.companyGroup?.toLowerCase().includes(n)),
    );
    const byName = (a: BrandDTO, b: BrandDTO) => a.name.localeCompare(b.name);
    const byDate = (a: BrandDTO, b: BrandDTO) => a.createdAt.localeCompare(b.createdAt);
    return rows.sort(sort === "name" ? byName : sort === "name-desc" ? (a, b) => byName(b, a) : sort === "oldest" ? byDate : (a, b) => byDate(b, a));
  }, [brands, q, status, group, sort]);
  const inactiveCount = (brands ?? []).filter((b) => b.status === "INACTIVE").length;
  const groups = useMemo(() => [...new Set((brands ?? []).map((b) => b.companyGroup).filter(Boolean) as string[])].sort(), [brands]);
  const filtered = q.trim() !== "" || status !== "ACTIVE" || group !== "" || sort !== "name";

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <PageHeader
        title="Brands"
        subtitle={brands ? `${brands.length - inactiveCount} active brands` : " "}
        actions={
          isAdmin && (
            <Button onClick={() => setEditing("new")}>
              <Plus size={16} /> Add brand
            </Button>
          )
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <div className="relative col-span-2 sm:w-64">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search brand or group" className="pl-9" />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Status" className="sm:w-40">
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive{inactiveCount ? ` (${inactiveCount})` : ""}</option>
          <option value="ALL">All statuses</option>
        </Select>
        <Select value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Company / Group" className="sm:w-48">
          <option value="">All companies / groups</option>
          {groups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
          <option value="__none__">No group</option>
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort" className="sm:w-40">
          <option value="name">Name A–Z</option>
          <option value="name-desc">Name Z–A</option>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </Select>
        {filtered && (
          <button
            onClick={() => {
              setQ("");
              setStatus("ACTIVE");
              setGroup("");
              setSort("name");
            }}
            className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
          >
            <X size={14} /> Clear
          </button>
        )}
        {brands && <span className="text-xs text-muted sm:ml-auto">{list.length} shown</span>}
      </div>

      {!brands ? (
        <Skeleton className="h-64" />
      ) : list.length === 0 ? (
        <EmptyState
          title={filtered ? "No brands match these filters" : "No brands yet"}
          hint={isAdmin ? "Admins can also create brands straight from the New Shoot form." : "Ask an admin to add brands."}
        />
      ) : (
        <Table
          head={
            <>
              <Th>Brand</Th>
              <Th className="hidden sm:table-cell">Company / Group</Th>
              <Th className="hidden md:table-cell">Status</Th>
              <Th className="hidden md:table-cell">Created</Th>
            </>
          }
        >
          {list.map((b) => (
            <tr key={b.id} onClick={() => setEditing(b)} className="cursor-pointer hover:bg-soft/60">
              <Td className="font-medium">
                {b.name}
                <span className="block text-xs font-normal text-muted sm:hidden">{b.companyGroup}</span>
              </Td>
              <Td className="hidden text-muted sm:table-cell">{b.companyGroup ?? "—"}</Td>
              <Td className="hidden md:table-cell">
                <StatusDot active={b.status === "ACTIVE"} />
              </Td>
              <Td className="hidden text-muted md:table-cell">{format(new Date(b.createdAt), "d MMM yyyy")}</Td>
            </tr>
          ))}
        </Table>
      )}

      <BrandDrawer
        brand={editing}
        isAdmin={isAdmin}
        onClose={() => setEditing(null)}
        onSaved={(msg) => {
          setEditing(null);
          toast(msg);
          load();
        }}
      />
    </div>
  );
}

function BrandDrawer({ brand, isAdmin, onClose, onSaved }: { brand: BrandDTO | "new" | null; isAdmin: boolean; onClose: () => void; onSaved: (msg: string) => void }) {
  const [name, setName] = useState("");
  const [group, setGroup] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isNew = brand === "new";
  const existing = brand && brand !== "new" ? brand : null;

  useEffect(() => {
    setError(null);
    setName(existing?.name ?? "");
    setGroup(existing?.companyGroup ?? "");
  }, [brand]); // eslint-disable-line react-hooks/exhaustive-deps

  async function run(fn: () => Promise<unknown>, msg: string) {
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
  }

  const save = () =>
    run(
      () => (isNew ? api("/api/brands", { body: { name, companyGroup: group } }) : api(`/api/brands/${existing!.id}`, { method: "PATCH", body: { name, companyGroup: group } })),
      isNew ? `${name} added` : "Brand updated",
    );

  return (
    <>
      <Drawer
        open={!!brand}
        onClose={onClose}
        title={isNew ? "Add brand" : "Edit brand"}
        footer={
          <div className="flex w-full items-center gap-2">
            {existing && isAdmin && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    run(
                      () => api(`/api/brands/${existing.id}`, { method: "PATCH", body: { status: existing.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" } }),
                      existing.status === "ACTIVE" ? `${existing.name} deactivated` : `${existing.name} reactivated`,
                    )
                  }
                >
                  {existing.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
                </Button>
              </>
            )}
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={save} disabled={busy || !name.trim()}>
                {isNew ? "Add brand" : "Save"}
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
            <Label htmlFor="bname">Brand name</Label>
            <Input id="bname" value={name} onChange={(e) => setName(e.target.value)} required autoFocus={isNew} />
          </div>
          <div>
            <Label htmlFor="bgroup">
              Company / Group <span className="font-normal text-muted">(optional)</span>
            </Label>
            <Input id="bgroup" value={group} onChange={(e) => setGroup(e.target.value)} />
          </div>
          {existing && !isAdmin && <p className="text-xs text-muted">Only an admin can deactivate a brand.</p>}
          {existing?.status === "INACTIVE" && <p className="text-xs text-muted">Inactive brands are hidden from the New Shoot form but stay on past shoots and in reports.</p>}
          <FormError message={error} />
          <button type="submit" hidden />
        </form>
      </Drawer>
    </>
  );
}
