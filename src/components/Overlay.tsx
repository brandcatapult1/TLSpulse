"use client";

import clsx from "clsx";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";

function useOverlay(open: boolean, onClose: () => void) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus the panel (not the first input) so mobile keyboards don't pop up uninvited.
    requestAnimationFrame(() => panel.current?.focus());
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [open, onClose]);
  return panel;
}

type Props = {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
  z?: "z-40" | "z-50" | "z-[60]";
};

/** Right-side panel on desktop, bottom sheet on mobile. */
export function Drawer({ open, onClose, title, children, footer, wide, z = "z-40" }: Props) {
  const panel = useOverlay(open, onClose);
  if (!open) return null;
  return (
    <div className={clsx("fixed inset-0", z)}>
      <div className="anim-fade absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className={clsx(
          "anim-panel absolute flex flex-col bg-surface shadow-2xl outline-none",
          "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl",
          "md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:rounded-none md:border-l md:border-line",
          wide ? "md:w-[560px]" : "md:w-[440px]",
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line md:hidden" />
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div className="min-w-0 flex-1 text-base font-semibold">{title}</div>
          <button aria-label="Close" onClick={onClose} className="-mr-1.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-soft hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}

/** Small centred confirmation dialog. */
export function Dialog({ open, onClose, title, children, footer }: Props) {
  const panel = useOverlay(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4">
      <div className="anim-fade absolute inset-0 bg-black/30" onClick={onClose} />
      <div ref={panel} tabIndex={-1} role="alertdialog" aria-modal="true" className="anim-rise relative w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-2xl outline-none">
        {title && <h2 className="text-base font-semibold">{title}</h2>}
        <div className="mt-2 text-sm">{children}</div>
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
