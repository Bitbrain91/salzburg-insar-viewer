/**
 * Gemeinsame UI-Helfer der Datenpunkt-Kapitel: Sensor-Farben, der
 * Geltungsbereich-Badge (Kernanforderung: jede Aussage ist als allgemein
 * oder sensorspezifisch gekennzeichnet) und der Sensor-Umschalter, den alle
 * parametrisierten Diagramme verwenden.
 *
 * Farbzuordnung bewusst aus den bestehenden Design-Tokens abgeleitet
 * (designTokens.ts ist die einzige Farbquelle): Sentinel-1 über die warme
 * Amplitude-Serienfarbe, TerraSAR-X über das Anbau-Violett, „Allgemein"
 * neutral — keine Ampel-/Bewertungsfarben, Sensor-Identität ist kein Urteil.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { tokens } from "@/lib/designTokens";
import { geoConditions, rateConditions, sensors, type Scope, type SensorId } from "@/content/insarFacts";

export const sensorColors: Record<SensorId, string> = {
  s1: tokens.series.amplitude,
  tsx: tokens.clusterKind.annex,
};

export const scopeColors: Record<Scope, string> = {
  allgemein: tokens.reliability.unknown,
  s1: sensorColors.s1,
  tsx: sensorColors.tsx,
};

export const scopeLabels: Record<Scope, string> = {
  allgemein: "Allgemein",
  s1: "Sentinel-1",
  tsx: "TerraSAR-X",
};

/**
 * Geltungsbereich-Chip: markiert Absätze, Karten und Diagramm-Ecken als
 * allgemeingültig oder sensorspezifisch. `detail` ergänzt z. B. „C-Band"
 * oder eine Geltungsbedingung.
 */
export function ScopeBadge({
  scope,
  detail,
  className,
}: {
  scope: Scope;
  detail?: ReactNode;
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
        style={{ backgroundColor: scopeColors[scope] }}
      />
      <span>{scopeLabels[scope]}</span>
      {detail && (
        <span className="font-mono text-[10px] font-normal text-muted-foreground">{detail}</span>
      )}
    </span>
  );
}

/**
 * Sensor-Umschalter der parametrisierten Diagramme — bewusst überall
 * identisch (Segmented Buttons mit Sensor-Punktfarbe), damit sofort
 * erkennbar ist, welche Zahlen gerade gelten.
 */
export function SensorSwitch({
  value,
  onChange,
  className,
}: {
  value: SensorId;
  onChange: (sensor: SensorId) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Sensor wählen"
      className={cn(
        "grid w-fit grid-cols-2 gap-0.5 rounded-lg border border-border bg-muted p-0.5",
        className
      )}
    >
      {(Object.keys(sensors) as SensorId[]).map((id) => {
        const isActive = id === value;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold leading-tight transition-colors",
              isActive
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: sensorColors[id] }}
            />
            {sensors[id].name}
            <span className="font-mono text-[10px] font-normal text-muted-foreground">
              {sensors[id].band}-Band
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Diagramm-Register: stabile Nummern (Kapitel.Index) und Namen für alle
 * Diagramme dieser Ansicht — damit sie in Feedback und Querverweisen
 * eindeutig ansprechbar sind. Anker-Schema: #insar-d<K>-<n>.
 */
export const DIAGRAMS = {
  pointGenesisFlow: { nummer: "0.1", titel: "Vom Orbit zum Punkt — die Kette" },
  sarGeometry: { nummer: "1.1", titel: "Aufnahmegeometrie (Side-Looking)" },
  resolutionCell: { nummer: "1.2", titel: "Auflösungszellen-Explorer" },
  phaseRuler: { nummer: "2.1", titel: "Phasen-Maßband" },
  phaseBudget: { nummer: "3.1", titel: "Phasen-Anteile-Mixer" },
  aliasing: { nummer: "3.2", titel: "λ/4-Mehrdeutigkeit" },
  psDsCity: { nummer: "4.1", titel: "PS/DS-Stadtszene" },
  refDemo: { nummer: "5.1", titel: "Referenzpunkt-Demo" },
  refDistance: { nummer: "5.2", titel: "Präzision und REF-Distanz" },
  convergence: { nummer: "5.3", titel: "Einschwingzeit der Präzision" },
  geoScatter: { nummer: "6.1", titel: "Geolokalisierungs-Streuung" },
  rangeArc: { nummer: "6.2", titel: "Laufzeit ortet, die Höhe platziert" },
  baselineStereo: { nummer: "6.3", titel: "Baseline-Stereo: Höhe aus dem Stapel" },
  heightPhaseCenter: { nummer: "6.4", titel: "Höhe und Phasenzentrum" },
  layover: { nummer: "7.1", titel: "Schrägsicht-Projektion (Layover)" },
  losLab: { nummer: "7.2", titel: "LOS-Projektions-Labor" },
  sensorFaceoff: { nummer: "8.1", titel: "Sensor-Vergleich und Salzburg-Daten" },
} as const;

export type DiagramId = keyof typeof DIAGRAMS;

/** Anker eines Diagramms, z. B. "insar-d5-3" für Diagramm 5.3. */
export function diagramAnchor(id: DiagramId): string {
  return `insar-d${DIAGRAMS[id].nummer.replace(".", "-")}`;
}

/**
 * Rahmen um jedes Diagramm: nummerierte Kopfzeile („Diagramm 6.1 · Name")
 * mit stabilem Anker — die Kapitel binden ihre Diagramme hierüber ein.
 */
export function DiagramFrame({ id, children }: { id: DiagramId; children: ReactNode }) {
  const meta = DIAGRAMS[id];
  return (
    <figure id={diagramAnchor(id)} className="grid scroll-mt-20 gap-2">
      <figcaption className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
        <span className="font-mono font-semibold text-primary">Diagramm {meta.nummer}</span>
        <span className="font-semibold text-foreground">· {meta.titel}</span>
      </figcaption>
      {children}
    </figure>
  );
}

/**
 * Zu einem Kapitel-Anker springen (Muster silverUi.tsx): existiert der Anker
 * in der aktuellen Ansicht, wird sanft gescrollt; sonst übernimmt der
 * Hash-Router den Ansichtswechsel.
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

/**
 * Kompakte Geltungsbedingungen-Zeile für Präzisionsangaben — die
 * Tab.-1-/Tab.-2-Werte gelten nur unter diesen Bedingungen und werden nie
 * ohne sie gezeigt. `variant`: "geo" = Geokodierung (Tab. 1, ohne
 * Zeitspanne), "rate" = Bewegungspräzision (Tab. 2, zusätzlich ≥ 2 Jahre),
 * "beide" = kombinierte Anzeige.
 */
export function ConditionsNote({
  variant = "beide",
  className,
}: {
  variant?: "geo" | "rate" | "beide";
  className?: string;
}) {
  const geo = `Geokodierung (Tab. 1, S. 13): < ${geoConditions.maxRefDistanceKm} km vom Referenzpunkt, Stapel ≥ ${geoConditions.minScenes} Szenen`;
  const rate = `Bewegungspräzision (Tab. 2, S. 14–15): < ${rateConditions.maxRefDistanceKm} km vom Referenzpunkt, ≥ ${rateConditions.minScenes} Szenen über ≥ ${rateConditions.minTimespanYears} Jahre`;
  return (
    <p className={cn("text-[11px] leading-relaxed text-muted-foreground", className)}>
      {variant === "geo" && <>Gilt laut TRE für die {geo}.</>}
      {variant === "rate" && <>Gilt laut TRE für die {rate}.</>}
      {variant === "beide" && (
        <>
          Geltungsbedingungen (TRE): {geo}; {rate}.
        </>
      )}{" "}
      Mit wachsender Distanz zum Referenzpunkt nimmt die Präzision ab.
    </p>
  );
}
