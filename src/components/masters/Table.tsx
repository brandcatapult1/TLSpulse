import clsx from "clsx";

// Compact, calm table. Secondary columns hide on phones via `className` on th/td.
export function Table({ head, children }: { head: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line">
      <table className="w-full text-sm">
        <thead className="bg-soft/60 text-left text-xs text-muted">
          <tr>{head}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function Th({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <th className={clsx("px-4 py-2.5 font-medium", className)}>{children}</th>;
}

export function Td({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <td className={clsx("px-4 py-2.5 align-middle", className)}>{children}</td>;
}

export function StatusDot({ active }: { active: boolean }) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5 text-xs", active ? "text-ok" : "text-muted")}>
      <span className={clsx("h-1.5 w-1.5 rounded-full", active ? "bg-ok" : "bg-muted/50")} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}
