import { Filter } from "lucide-react";
import { useAppStore } from "../../lib/store";

/**
 * Hinweis-Pill unten rechts auf der Karte: sichtbar, solange die
 * Grenzwert-Filter aktiv sind. Macht transparent, dass die Karte gerade
 * einen reduzierten Punktbestand zeigt (nicht den vollen Datenbestand,
 * den z.B. die ML-Pipeline verwendet).
 */
export function MapFilterBadge() {
  const filtersEnabled = useAppStore((state) => state.filtersEnabled);
  const filters = useAppStore((state) => state.filters);

  if (!filtersEnabled) return null;

  const summary = `Kohärenz ≥ ${filters.coherenceMin.toFixed(2)} · v ${filters.velocityMin.toFixed(
    1
  )} bis ${filters.velocityMax.toFixed(1)} mm/Jahr`;

  return (
    <div
      className="pointer-events-auto absolute bottom-8 right-3 z-[3] inline-flex max-w-[calc(100%-24px)] items-center gap-1.5 rounded-full border border-border bg-popover/95 px-3 py-1.5 text-xs shadow-sm backdrop-blur"
      title="Grenzwert-Filter im Layer-Panel aktiv – InSAR-Punkte außerhalb der Grenzwerte sind ausgeblendet"
    >
      <Filter className="h-3 w-3 shrink-0 text-muted-foreground" />
      <span className="shrink-0 font-semibold text-foreground">Filter aktiv</span>
      <span className="truncate text-muted-foreground">{summary}</span>
    </div>
  );
}
