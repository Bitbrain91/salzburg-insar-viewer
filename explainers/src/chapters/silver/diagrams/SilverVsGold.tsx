/**
 * Silver-heute vs. Gold-Ziel: Gegenüberstellung aus `silverFacts.silverVsGold`
 * mit umschaltbarer Hervorhebung.
 */
import { useState } from "react";
import { Card, Toggle } from "@/components/ui";
import { cn } from "@/lib/utils";
import { silverVsGold } from "@/content/silverFacts";

export function SilverVsGold() {
  const [zeigeGold, setZeigeGold] = useState(false);

  return (
    <Card className="grid gap-4 p-4">
      <Toggle
        checked={zeigeGold}
        onCheckedChange={setZeigeGold}
        label={
          zeigeGold
            ? "Ziel: Was ändert sich mit unabhängigen Expertenlabels?"
            : "Heute: die interne Silver Ground Truth — umschalten zum Gold-Ziel"
        }
      />
      <div className="grid gap-2">
        {silverVsGold.map((zeile) => (
          <div
            key={zeile.aspekt}
            className="grid gap-2 rounded-md border border-border bg-background p-3 md:grid-cols-[140px_1fr_1fr]"
          >
            <p className="text-xs font-semibold text-foreground">{zeile.aspekt}</p>
            <div
              className={cn(
                "rounded-md border px-2.5 py-2 text-xs leading-relaxed transition-opacity",
                !zeigeGold
                  ? "border-primary/50 bg-card text-foreground"
                  : "border-border text-muted-foreground opacity-60"
              )}
            >
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Silver (heute)
              </p>
              {zeile.silver}
            </div>
            <div
              className={cn(
                "rounded-md border px-2.5 py-2 text-xs leading-relaxed transition-opacity",
                zeigeGold
                  ? "border-primary/50 bg-card text-foreground"
                  : "border-border text-muted-foreground opacity-60"
              )}
            >
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Gold (Ziel)
              </p>
              {zeile.gold}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
