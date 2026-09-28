"use client";

import clsx from "clsx";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useState } from "react";

type Tone = "ok" | "warn" | "error";
type Toast = { id: number; message: string; tone: Tone };

const Ctx = createContext<(message: string, tone?: Tone) => void>(() => {});
export const useToast = () => useContext(Ctx);

let seq = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Tone = "ok") => {
    const id = ++seq;
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "ok" ? 2800 : 5000);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex flex-col items-center gap-2 px-4 md:bottom-6">
        {toasts.map((t) => {
          const Icon = t.tone === "ok" ? CheckCircle2 : t.tone === "warn" ? AlertTriangle : XCircle;
          return (
            <div key={t.id} className="anim-rise pointer-events-auto flex max-w-md items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm text-surface shadow-lg">
              <Icon size={16} className={clsx(t.tone === "ok" && "text-ok", t.tone === "warn" && "text-warn", t.tone === "error" && "text-danger")} />
              {t.message}
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
