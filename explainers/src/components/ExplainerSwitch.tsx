/**
 * Segmented-Umschalter zwischen den beiden Explainern. Der Wechsel setzt nur
 * den Hash — `useRoute()` in App.tsx reagiert auf das hashchange-Event und
 * rendert die andere Ansicht.
 */
import { cn } from "@/lib/utils";
import type { ExplainerView } from "@/lib/router";

const VIEWS: { view: ExplainerView; label: string; hash: string }[] = [
  { view: "pipeline", label: "Pipeline-Reise", hash: "" },
  { view: "silver", label: "Silver Ground Truth", hash: "silver" },
  { view: "insar", label: "Datenpunkte", hash: "insar" },
];

export function ExplainerSwitch({ active }: { active: ExplainerView }) {
  return (
    <nav
      aria-label="Explainer wählen"
      className="grid grid-cols-3 gap-0.5 rounded-lg border border-border bg-muted p-0.5"
    >
      {VIEWS.map(({ view, label, hash }) => {
        const isActive = view === active;
        return (
          <button
            key={view}
            type="button"
            aria-current={isActive ? "true" : undefined}
            onClick={() => {
              if (!isActive) window.location.hash = hash;
            }}
            className={cn(
              "rounded-md px-2 py-1.5 text-[11px] font-semibold leading-tight transition-colors",
              isActive
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        );
      })}
    </nav>
  );
}
