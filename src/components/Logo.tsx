import clsx from "clsx";
import Image from "next/image";

// The Lightscape Studio logo (black for light mode, white for dark mode) with a small
// "Pulse" product label. `iconOnly` shows just the aperture mark (collapsed sidebar).
const LOGO_RATIO = 1905 / 761;

type Size = "sm" | "md" | "sidebar" | "lg";
const HEIGHT: Record<Size, number> = { sm: 32, md: 36, sidebar: 43, lg: 64 }; // sidebar = 20% larger than md

export function Logo({ className, iconOnly = false, size = "md" }: { className?: string; iconOnly?: boolean; size?: Size }) {
  const h = HEIGHT[size];
  if (iconOnly) {
    return (
      <span className={clsx("relative inline-block", size === "sidebar" ? "h-[38px] w-[38px]" : "h-8 w-8", className)} aria-label="TLS Pulse">
        <Image src="/brand/tls-mark.png" alt="" fill sizes="32px" className="object-contain dark:hidden" priority />
        <Image src="/brand/tls-mark-white.png" alt="" fill sizes="32px" className="hidden object-contain dark:block" priority />
      </span>
    );
  }
  return (
    <span className={clsx("inline-flex items-center gap-2", className)}>
      <span className="relative inline-block" style={{ height: h, width: Math.round(h * LOGO_RATIO) }}>
        <Image src="/brand/tls-logo.png" alt="The Lightscape Studio" fill sizes={`${Math.round(h * LOGO_RATIO)}px`} className="object-contain dark:hidden" priority />
        <Image src="/brand/tls-logo-white.png" alt="The Lightscape Studio" fill sizes={`${Math.round(h * LOGO_RATIO)}px`} className="hidden object-contain dark:block" priority />
      </span>
      <span
        className={clsx(
          "rounded-md border border-line px-1.5 py-0.5 font-semibold tracking-wide text-muted uppercase",
          size === "lg" ? "text-xs" : "text-[10px]",
        )}
      >
        Pulse
      </span>
    </span>
  );
}
