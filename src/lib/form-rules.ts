// Client-side form checks (the server re-validates everything). Each rule returns a
// message or null; `useFieldErrors` shows the first failing message under each field.
"use client";

import { useCallback, useState } from "react";
import { normalizeEmail, normalizePhone } from "./contact";

export const rule = {
  required: (v: string | null | undefined, label: string) => (v && v.trim() ? null : `${label} is required`),
  max: (v: string | null | undefined, n: number, label: string) => ((v ?? "").trim().length <= n ? null : `${label} must be ${n} characters or fewer`),
  email: (v: string | null | undefined) => (!v?.trim() || normalizeEmail(v) ? null : "Enter a valid email, e.g. name@example.com"),
  phone: (v: string | null | undefined) => (!v?.trim() || normalizePhone(v) ? null : "Enter a valid mobile number, e.g. 98765 43210"),
};

type Checks = Record<string, (string | null)[]>;

export function useFieldErrors() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  /** Runs the checks; returns true when everything passes. Focuses the first bad field (by id). */
  const validate = useCallback((checks: Checks) => {
    const next: Record<string, string> = {};
    for (const [field, results] of Object.entries(checks)) {
      const msg = results.find(Boolean);
      if (msg) next[field] = msg;
    }
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) requestAnimationFrame(() => (document.getElementById(first) as HTMLElement | null)?.focus?.());
    return !first;
  }, []);

  const clear = useCallback((field: string) => setErrors((e) => (e[field] ? Object.fromEntries(Object.entries(e).filter(([k]) => k !== field)) : e)), []);
  const reset = useCallback(() => setErrors({}), []);

  /** Props for an input: red border + aria wiring when it has an error. */
  const field = (id: string) => ({
    id,
    "aria-invalid": errors[id] ? true : undefined,
    "aria-describedby": errors[id] ? `${id}-error` : undefined,
    className: errors[id] ? "border-danger focus:border-danger" : undefined,
  });

  return { errors, validate, clear, reset, field };
}
