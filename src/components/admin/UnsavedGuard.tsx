"use client";
import { useEffect, useRef } from "react";

/** Warns before leaving a page with unsaved edits in the wrapped form. */
export function useUnsavedGuard() {
  const dirty = useRef(false);
  useEffect(() => {
    const onBefore = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, []);
  return {
    onChange: () => (dirty.current = true),
    onSubmit: () => (dirty.current = false),
  };
}
