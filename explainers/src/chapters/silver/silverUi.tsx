/**
 * Gemeinsame UI-Helfer der Silver-Ground-Truth-Kapitel: Farben und Badge für
 * die vier Label-Klassen sowie die kapitelübergreifende Navigation.
 *
 * Farbzuordnung bewusst aus den bestehenden Design-Tokens abgeleitet
 * (designTokens.ts ist die einzige Farbquelle): annex/foreign wie die
 * Cluster-Typen im Viewer, roof über die "gut"-Ampelfarbe, unclear neutral.
 */
import { cn } from "@/lib/utils";
import { tokens } from "@/lib/designTokens";
import type { SilverLabel } from "@/content/silverFacts";

export const silverLabelColors: Record<SilverLabel, string> = {
  roof: tokens.reliability.high,
  annex: tokens.clusterKind.annex,
  foreign: tokens.clusterKind.foreign,
  unclear: tokens.reliability.unknown,
};

export const silverLabelKurz: Record<SilverLabel, string> = {
  roof: "Dachpunkt",
  annex: "Anbau",
  foreign: "Fremdpunkt",
  unclear: "Unklar",
};

/** Label-Chip: deutscher Klartext + internes Token als Mono-Tag. */
export function LabelBadge({
  label,
  className,
}: {
  label: SilverLabel;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground",
        className
      )}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: silverLabelColors[label] }}
      />
      <span>{silverLabelKurz[label]}</span>
      <span className="font-mono text-[10px] font-normal text-muted-foreground">{label}</span>
    </span>
  );
}

/**
 * Zu einem Kapitel-Anker springen. Existiert der Anker in der aktuellen
 * Ansicht, wird sanft gescrollt (wie ChapterNav); sonst übernimmt der
 * Hash-Router den Ansichtswechsel (App scrollt nach dem Mount).
 */
export function goToAnchor(id: string) {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  } else {
    window.location.hash = id;
  }
}
