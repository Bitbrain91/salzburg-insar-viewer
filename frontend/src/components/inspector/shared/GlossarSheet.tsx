import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { listAttributeMetadata } from "../../../lib/attributeMetadata";
import { Input } from "../../ui";

export type GlossarSheetProps = {
  open: boolean;
  onClose: () => void;
  initialQuery?: string;
};

/**
 * Durchsuchbares Glossar aller Fachbegriffe (attributeMetadata) als
 * Overlay-Sheet über dem Inspector.
 */
export function GlossarSheet({ open, onClose, initialQuery = "" }: GlossarSheetProps) {
  const [query, setQuery] = useState(initialQuery);
  const entries = useMemo(() => listAttributeMetadata(), []);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((entry) =>
      [entry.label, entry.key, entry.description ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [entries, query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-y-0 right-0 z-50 flex w-[min(380px,100vw)] flex-col border-l border-border bg-card shadow-lg"
      role="dialog"
      aria-label="Glossar der Fachbegriffe"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border p-4">
        <div>
          <div className="text-sm font-bold text-foreground">Glossar</div>
          <div className="text-xs text-muted-foreground">
            Fachbegriffe der Plattform, erklärt.
          </div>
        </div>
        <button
          type="button"
          aria-label="Glossar schließen"
          onClick={onClose}
          className="inline-grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="border-b border-border p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Begriff suchen…"
            className="h-8 pl-8 text-xs"
            aria-label="Glossar durchsuchen"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {filtered.length === 0 ? (
          <div className="rounded-md border border-border bg-secondary px-3 py-2 text-xs text-secondary-foreground">
            Kein Eintrag gefunden.
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((entry) => (
              <div
                key={`${entry.key}-${entry.label}`}
                className="rounded-md border border-border bg-background p-3 text-xs"
              >
                <div className="font-semibold text-foreground">{entry.label}</div>
                {entry.description && (
                  <p className="mt-1 leading-relaxed text-muted-foreground">
                    {entry.description}
                  </p>
                )}
                {(entry.unit || entry.source) && (
                  <div className="mt-1.5 grid gap-0.5 border-t border-border/60 pt-1.5 text-[11px] text-muted-foreground">
                    {entry.unit && (
                      <span>
                        <strong className="font-semibold text-foreground">Einheit:</strong>{" "}
                        {entry.unit}
                      </span>
                    )}
                    {entry.source && (
                      <span>
                        <strong className="font-semibold text-foreground">Quelle:</strong>{" "}
                        {entry.source}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
