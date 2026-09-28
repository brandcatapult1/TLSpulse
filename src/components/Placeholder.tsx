export function Placeholder({ title, milestone, children }: { title: string; milestone: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-6 rounded-2xl border border-dashed border-line bg-soft/60 p-8 text-center text-sm text-muted">
        Built in <span className="font-medium text-ink">{milestone}</span>.
        {children && <div className="mt-4 text-left">{children}</div>}
      </div>
    </div>
  );
}
