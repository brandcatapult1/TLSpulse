import { Skeleton } from "@/components/ui";

// Shown instantly on navigation so a click always gives feedback.
export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="mb-5 h-7 w-40" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="mt-6 h-64" />
    </div>
  );
}
