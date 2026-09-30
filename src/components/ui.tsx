// Small shared primitives. Keep them plain; the calendar is the visual hero.
import clsx from "clsx";
import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type LabelHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "outline" | "danger";

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" }>(
  function Button({ variant = "primary", size = "md", className, type = "button", ...props }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        className={clsx(
          "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          size === "md" ? "h-9 px-3.5 text-sm" : "h-8 px-2.5 text-[13px]",
          variant === "primary" && "bg-ink text-surface hover:opacity-90",
          variant === "outline" && "border border-line bg-surface hover:bg-soft",
          variant === "ghost" && "hover:bg-soft",
          variant === "danger" && "bg-danger text-white hover:opacity-90",
          className,
        )}
        {...props}
      />
    );
  },
);

const field =
  "rounded-lg border border-line bg-surface px-3 text-base outline-none transition-shadow placeholder:text-muted/70 focus:border-ink/40 focus:ring-4 focus:ring-ink/5 sm:text-sm";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={clsx(field, "h-10 w-full", className)} {...props} />;
});

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx(field, "min-h-20 w-full py-2", className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  // Full width unless the caller sets a width.
  return <select className={clsx(field, "h-10 pr-8", !/(^|\s)w-/.test(className ?? "") && "w-full", className)} {...props} />;
}

/** Field label; `required` adds a red asterisk so mandatory fields are obvious. */
export function Label({ className, required, children, ...props }: LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label className={clsx("mb-1.5 block text-sm font-medium", className)} {...props}>
      {children}
      {required && (
        <span className="ml-0.5 text-danger" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

/** Inline message under a field. */
export function FieldError({ id, message }: { id?: string; message?: string | null }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-xs text-danger">
      {message}
    </p>
  );
}

export function FormError({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
      {message}
    </p>
  );
}

export function Pill({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", className)}>{children}</span>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      <p className="font-medium">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-lg bg-soft", className)} />;
}
