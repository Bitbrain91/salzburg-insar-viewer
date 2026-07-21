/**
 * Annotiertes Befund-Mock (Synthese): zeigt die Anatomie der
 * Gebäude-Befundkarte des Viewers mit klickbaren Hotspots, die zu den
 * erklärenden Stationen zurückführen. Werte sind ein Beispiel.
 */
import { useState } from "react";
import { FindingCard, KindBadge, ReliabilityMeter } from "@/components/ui/insights";
import { DIFFERENTIAL_LEVEL_LABELS, tokens } from "@/lib/designTokens";
import { BUILDING_STATUS_LABELS } from "@/content/facts";
import type { ChapterId } from "@/content/chapters";
import { cn } from "@/lib/utils";

type Hotspot = {
  nr: number;
  titel: string;
  text: string;
  station: ChapterId;
  stationLabel: string;
};

const HOTSPOTS: Hotspot[] = [
  {
    nr: 1,
    titel: "Gebäudebewegung",
    text: "Mittel der Track-Bewegungen; jede Track-Bewegung ist der Median der Vertikal-Proxies des Hauptclusters. Negative Werte lesen sich als Senkung.",
    station: "bewegung",
    stationLabel: "Station 6",
  },
  {
    nr: 2,
    titel: "Zuverlässigkeitsband",
    text: "Score aus Stützung, Signal, Zuordnung und Track-Übereinstimmung minus benannter Abzüge; Bänder bei 0,45 und 0,75, ggf. gedeckelt.",
    station: "zuverlaessigkeit",
    stationLabel: "Station 8",
  },
  {
    nr: 3,
    titel: "Gebäudestatus",
    text: "Belastbar / Nur ein Track / Wenige Punkte / Rauschdominiert / Zu wenig Datenpunkte — sagt, wie viel Evidenz hinter dem Befund steht.",
    station: "bewegung",
    stationLabel: "Station 6",
  },
  {
    nr: 4,
    titel: "Differenzielle Bewegung",
    text: "Vierstufiges Level mit Evidenz (Δ, σ, Schwelle, bestätigender Track, Downgrades). Bewusst orange dargestellt — Forschungsbefund, keine Schadensaussage.",
    station: "differenzial",
    stationLabel: "Station 7",
  },
  {
    nr: 5,
    titel: "Cluster-Typen",
    text: "Standardcluster tragen den Befund; Bauteil/Anbau ist getrennt ausgewiesen; Fremdreflektoren sind sichtbar, fließen aber nie in Bewegung oder Differential ein.",
    station: "trennung",
    stationLabel: "Station 3",
  },
  {
    nr: 6,
    titel: "Punktbilanz",
    text: "Gewertet = kept nach allen Gates; ausgeschlossene und Noise-Punkte bleiben mit Gründen sichtbar — nichts verschwindet stillschweigend.",
    station: "qualitaet",
    stationLabel: "Station 2",
  },
];

function HotspotMarker({
  hotspot,
  active,
  onSelect,
}: {
  hotspot: Hotspot;
  active: boolean;
  onSelect: (nr: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(hotspot.nr)}
      aria-label={`Erklärung ${hotspot.nr}: ${hotspot.titel}`}
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] font-bold transition-all",
        active
          ? "border-primary bg-primary text-primary-foreground shadow"
          : "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20"
      )}
    >
      {hotspot.nr}
    </button>
  );
}

export function VerdictAnatomy() {
  const [activeNr, setActiveNr] = useState(1);
  const active = HOTSPOTS.find((hotspot) => hotspot.nr === activeNr) ?? HOTSPOTS[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      {/* Befund-Mock */}
      <div className="grid gap-3 rounded-lg border border-border bg-card p-4">
        <p className="section-title">Befund — Beispielgebäude (Mock)</p>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-3xl font-bold text-foreground">−2,1 mm/a</p>
            <p className="text-xs text-muted-foreground">Senkung, über beide Blickrichtungen gemittelt</p>
          </div>
          <HotspotMarker hotspot={HOTSPOTS[0]} active={activeNr === 1} onSelect={setActiveNr} />
        </div>

        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <ReliabilityMeter score={0.62} label="Zuverlässigkeit der Einschätzung" />
          </div>
          <HotspotMarker hotspot={HOTSPOTS[1]} active={activeNr === 2} onSelect={setActiveNr} />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-border bg-secondary px-2.5 py-1 font-semibold text-foreground">
            Status: {BUILDING_STATUS_LABELS.ok}
          </span>
          <HotspotMarker hotspot={HOTSPOTS[2]} active={activeNr === 3} onSelect={setActiveNr} />
          <span
            className="rounded-full border px-2.5 py-1 font-semibold"
            style={{
              color: tokens.differential.candidate,
              borderColor: `${tokens.differential.candidate}66`,
              backgroundColor: `${tokens.differential.candidate}14`,
            }}
          >
            Differenzielle Bewegung: {DIFFERENTIAL_LEVEL_LABELS.candidate}
          </span>
          <HotspotMarker hotspot={HOTSPOTS[3]} active={activeNr === 4} onSelect={setActiveNr} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <KindBadge kind="standard" />
          <KindBadge kind="annex" />
          <KindBadge kind="foreign" />
          <HotspotMarker hotspot={HOTSPOTS[4]} active={activeNr === 5} onSelect={setActiveNr} />
        </div>

        <FindingCard
          tone="warning"
          label="Warum diese Bewertung?"
          detail="Ein Anbaucluster zeigt +2,7 mm/a relativ zum Hauptdach (Kandidat); Track-Übereinstimmung 0,71; ein Punkt wegen niedriger Kohärenz ausgeschlossen."
        />

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            Punkte: <strong className="text-foreground">14 gewertet</strong> · 3 ausgeschlossen · 2
            Rauschen
          </span>
          <HotspotMarker hotspot={HOTSPOTS[5]} active={activeNr === 6} onSelect={setActiveNr} />
        </div>

        <p className="border-t border-border pt-2.5 text-[11px] italic text-muted-foreground">
          Befund des Laufs „Beispiel" — keine Aussage über Gebäudeschäden.
        </p>
      </div>

      {/* Erklärung zum aktiven Hotspot */}
      <div className="grid content-start gap-2.5">
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
          <p className="font-mono text-[10px] uppercase tracking-wide text-primary">
            Hotspot {active.nr}
          </p>
          <p className="mt-0.5 text-sm font-bold text-foreground">{active.titel}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{active.text}</p>
          <button
            type="button"
            onClick={() => {
              document
                .getElementById(active.station)
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
              history.replaceState(null, "", `#${active.station}`);
            }}
            className="mt-2.5 text-xs font-semibold text-primary underline-offset-2 hover:underline"
          >
            ↑ Nachlesen in {active.stationLabel}
          </button>
        </div>
        <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
          Klicke die nummerierten Punkte im Mock, um jedes Element des Befunds zu verstehen. Im
          echten Viewer findest du dieselben Elemente im Inspector unter „Befund".
        </p>
      </div>
    </div>
  );
}
