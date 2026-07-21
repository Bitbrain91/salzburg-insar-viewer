/**
 * Glossar-Popover: unterstrichelter Fachbegriff, Klick öffnet eine kurze
 * Klartext-Erklärung. Schliesst per Escape, Outside-Click oder erneutem Klick.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { glossary, type GlossaryEntry, type GlossaryKey } from "@/content/glossary";
import { cn } from "@/lib/utils";

export type GlossaryTermProps = {
  term: GlossaryKey;
  /** Anzeigetext; ohne Angabe wird der Glossar-Begriff selbst gezeigt. */
  children?: ReactNode;
  className?: string;
};

export function GlossaryTerm({ term, children, className }: GlossaryTermProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const entry: GlossaryEntry = glossary[term];

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <span ref={containerRef} className="relative inline-block">
      <button
        type="button"
        className={cn("glossary-term font-medium text-foreground", className)}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {children ?? entry.begriff}
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-0 top-full z-30 mt-1.5 block w-72 max-w-[85vw] rounded-md border border-border bg-card p-3 text-left text-xs font-normal shadow-lg"
        >
          <span className="mb-1 flex items-baseline justify-between gap-2">
            <span className="font-semibold text-foreground">{entry.begriff}</span>
            {entry.einheit && (
              <span className="font-mono text-[10px] text-muted-foreground">{entry.einheit}</span>
            )}
          </span>
          <span className="block leading-relaxed text-muted-foreground">{entry.text}</span>
          {entry.viewerHinweis && (
            <span className="mt-1.5 block leading-relaxed text-muted-foreground/80">
              {entry.viewerHinweis}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
