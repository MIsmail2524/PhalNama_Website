"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { clsx } from "clsx";

/** Subtle rise-in when the element enters the viewport. */
export function Reveal({ children, className, delay = 0, as: Tag = "div" }: { children: ReactNode; className?: string; delay?: number; as?: "div" | "li" }) {
  const ref = useRef<HTMLDivElement & HTMLLIElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag
      ref={ref}
      className={clsx("transition-all duration-1000 ease-[cubic-bezier(.22,1,.36,1)]", shown ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0", className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}
