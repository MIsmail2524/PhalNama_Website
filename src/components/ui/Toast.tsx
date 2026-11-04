"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { clsx } from "clsx";

type Toast = { id: number; message: string; tone: "success" | "error" | "info" };
const Ctx = createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4" aria-live="polite" role="status">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              "pointer-events-auto animate-rise rounded-sm px-5 py-3 text-sm shadow-lg",
              t.tone === "success" && "bg-forest text-ivory",
              t.tone === "error" && "bg-danger text-white",
              t.tone === "info" && "bg-charcoal text-ivory",
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
