/**
 * Vorher/Nachher-Fallkarten der vier Story-Fälle, die die Silver Ground
 * Truth geprägt haben (Daten: `silverFacts.storyCases`).
 */
import { useState } from "react";
import { Card, Toggle } from "@/components/ui";
import { FindingCard } from "@/components/ui/insights";
import { storyCases } from "@/content/silverFacts";

function CaseCard({ fall }: { fall: (typeof storyCases)[number] }) {
  const [nachher, setNachher] = useState(false);
  const seite = nachher ? fall.nachher : fall.vorher;

  return (
    <Card className="grid content-start gap-3 p-4">
      <div className="grid gap-0.5">
        <p className="text-sm font-semibold text-foreground">{fall.titel}</p>
        <p className="text-[11px] text-muted-foreground">{fall.ort}</p>
      </div>

      <Toggle
        checked={nachher}
        onCheckedChange={setNachher}
        label={nachher ? "Nachher (heutiger Stand)" : "Vorher — umschalten zum heutigen Stand"}
      />

      <FindingCard tone={seite.ton} label={seite.label} detail={seite.folge} />

      <p className="rounded-md bg-secondary/60 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Lehre:</strong> {fall.lehre}
      </p>
    </Card>
  );
}

export function CaseCards() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {storyCases.map((fall) => (
        <CaseCard key={fall.id} fall={fall} />
      ))}
    </div>
  );
}
