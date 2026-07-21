/**
 * Korpus-Explorer: alle Label-Einträge aus `reference_labels.json`
 * (gespiegelt in `silverFacts.corpusEntries`) als klickbares, nach
 * Label-Klasse gefärbtes Raster — gruppiert nach Gebäude, filterbar nach
 * Label, mit Evidenz-Karte je Punkt.
 */
import { useMemo, useState } from "react";
import { Card } from "@/components/ui";
import { FindingCard } from "@/components/ui/insights";
import { cn } from "@/lib/utils";
import {
  corpus,
  corpusBuildingInfo,
  corpusEntries,
  datasetInfo,
  SILVER_LABELS,
  type CorpusEntry,
  type SilverLabel,
} from "@/content/silverFacts";
import { LabelBadge, silverLabelColors, silverLabelKurz } from "../silverUi";

const LABEL_COUNTS: Record<SilverLabel, number> = {
  roof: corpus.roof,
  annex: corpus.annex,
  foreign: corpus.foreign,
  unclear: corpus.unclear,
};

export function CorpusExplorer() {
  const [filter, setFilter] = useState<SilverLabel | null>(null);
  const [auswahl, setAuswahl] = useState<CorpusEntry | null>(null);

  const gebaeude = useMemo(() => {
    const reihenfolge: string[] = [];
    const gruppen = new Map<string, CorpusEntry[]>();
    for (const entry of corpusEntries) {
      if (!gruppen.has(entry.buildingId)) {
        gruppen.set(entry.buildingId, []);
        reihenfolge.push(entry.buildingId);
      }
      gruppen.get(entry.buildingId)!.push(entry);
    }
    return reihenfolge.map((id) => ({ id, punkte: gruppen.get(id)! }));
  }, []);

  return (
    <Card className="grid gap-4 p-4">
      {/* Filter: Label-Klassen mit Zählern */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setFilter(null)}
          className={cn(
            "rounded-full border px-2.5 py-1 font-semibold transition-colors",
            filter === null
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:text-foreground"
          )}
        >
          Alle {corpus.punkte}
        </button>
        {SILVER_LABELS.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => setFilter(filter === label ? null : label)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold transition-colors",
              filter === label
                ? "border-foreground/60 bg-card text-foreground shadow-sm"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: silverLabelColors[label] }}
            />
            {silverLabelKurz[label]} {LABEL_COUNTS[label]}
          </button>
        ))}
      </div>

      {/* Raster: ein Block je Gebäude, ein Kachel-Button je Punkt */}
      <div className="grid gap-3 sm:grid-cols-2">
        {gebaeude.map(({ id, punkte }) => {
          const info = corpusBuildingInfo[id];
          const sichtbar = filter ? punkte.filter((p) => p.label === filter) : punkte;
          return (
            <div
              key={id}
              className={cn(
                "grid content-start gap-2 rounded-md border border-border bg-background px-3 py-2.5",
                sichtbar.length === 0 && "opacity-40"
              )}
            >
              <div className="grid gap-0.5 text-xs">
                <span className="font-semibold text-foreground">{info?.name ?? id}</span>
                <span className="leading-snug text-muted-foreground">{info?.rolle}</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {id.length > 14 ? `${id.slice(0, 11)}…` : id} · {punkte[0].buildingSource} ·{" "}
                  {datasetInfo[punkte[0].datasetId]}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {sichtbar.map((entry) => {
                  const istAuswahl =
                    auswahl?.pointCode === entry.pointCode && auswahl?.track === entry.track;
                  return (
                    <button
                      key={`${entry.pointCode}:${entry.track}`}
                      type="button"
                      title={`${entry.pointCode} (Track ${entry.track}) — ${silverLabelKurz[entry.label]}`}
                      onClick={() => setAuswahl(istAuswahl ? null : entry)}
                      className={cn(
                        "rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white transition-transform hover:scale-105",
                        istAuswahl ? "border-foreground shadow" : "border-transparent"
                      )}
                      style={{ backgroundColor: silverLabelColors[entry.label] }}
                    >
                      {entry.pointCode}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Evidenz-Karte des ausgewählten Punkts */}
      {auswahl ? (
        <FindingCard
          tone="neutral"
          label={
            <span className="inline-flex flex-wrap items-center gap-2">
              <span className="font-mono">{auswahl.pointCode}</span>
              <span className="font-normal text-muted-foreground">Track {auswahl.track}</span>
              <LabelBadge label={auswahl.label} />
            </span>
          }
          aside={<span className="font-mono text-[10px] text-muted-foreground">{auswahl.date}</span>}
          detail={
            <>
              <p>{auswahl.evidenz}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {corpusBuildingInfo[auswahl.buildingId]?.name ?? auswahl.buildingId} ·{" "}
                {datasetInfo[auswahl.datasetId]} · Quelle {auswahl.buildingSource} · gekürzt aus
                reference_labels.json
              </p>
            </>
          }
        />
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Punkt anklicken, um die dokumentierte Evidenz zu lesen — jede Zeile des Korpus trägt
          ihre Begründung, ihr Datum und ihre Quelle mit sich.
        </p>
      )}
    </Card>
  );
}
