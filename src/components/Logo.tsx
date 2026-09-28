export function Logo({ className = "", iconOnly = false }: { className?: string; iconOnly?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      <span className="grid h-6 w-6 place-items-center rounded-md bg-ink">
        <span className="h-1.5 w-3.5 rounded-full bg-gradient-to-r from-social to-realtime" />
      </span>
      {!iconOnly && "TLS Pulse"}
    </span>
  );
}
