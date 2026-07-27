/**
 * Kapitel 8 „Sentinel-1 und TerraSAR-X konkret — und die Salzburger
 * Datensätze": ordnet die zuvor erklärten Sensor-Unterschiede in eine
 * Interpretationshilfe ein und stellt die realen Bestände nebeneinander.
 * Kernstück ist das Diagramm `SensorFaceoff`.
 */
import { Chapter } from "@/components/layout/Chapter";
import { GlossaryTerm } from "@/components/GlossaryTerm";
import { insarChapterById } from "@/content/insarChapters";
import {
  geoAccuracy1Sigma,
  rateAccuracy,
  salzburgS1,
  salzburgTsx,
  sensors,
} from "@/content/insarFacts";
import { DiagramFrame, ScopeBadge } from "./insarUi";
import { SensorFaceoff } from "./diagrams/SensorFaceoff";

const fmt = new Intl.NumberFormat("de-AT");

export function I8Sensoren() {
  return (
    <Chapter
      meta={insarChapterById["insar-sensoren"]}
      techDetails={
        <>
          <p>
            Wellenlängen und Zellgrößen: TRE Altamira Tab. 8 (S. 56), ergänzt durch AUGMENTERRA
            §2.2.1–2.2.2 (S. 8 f.). Die Salzburger TerraSAR-X-Daten liegen im{" "}
            <span className="font-mono">Stripmap</span>-Modus (3 × 3 m); High-Res- (1 × 1 m) und
            Staring-Spotlight-Moden (1 × 0,25 m in Range × Azimut) sind nur der Vollständigkeit halber genannt und
            nicht der gelieferte Modus (Fußnote 2).
          </p>
          <p>
            Geokodierungs-Präzision 1σ: TRE Altamira Tab. 1 (S. 13); die Werte gelten nur unter den
            Bedingungen aus Tab. 1–2 (S. 13–15) — Punkt &lt; 1 km vom Referenzpunkt, Stapel ≥ 30
            Szenen über ≥ 2 Jahre. Die λ/4-Eindeutigkeitsgrenze folgt aus TRE §2.1.1.3 (S. 16 f.),
            die Einschwingzeit bis σ(Rate) &lt; 1 mm/a aus TRE Fig. 5 (S. 15 f., schematisch).
          </p>
          <p>
            Dokumentierte Quellen-Diskrepanzen (nie stillschweigend gemittelt, siehe Fußnoten 1 und
            4): die Sentinel-1-Wellenlänge (AUGMENTERRA ≈ 5,6 cm §2.2.1 S. 8 vs. TRE 5,93 cm Tab. 8
            S. 56) und die Ost-Genauigkeit Sentinel-1 (TRE ±12 m Tab. 1 S. 13 vs. AUGMENTERRA ±8 m
            Tab. 1 S. 14).
          </p>
          <p>
            Salzburger Bestände: TerraSAR-X Track 93 aus dem Lieferreport ES2830A2S (S. 2–8);
            Sentinel-1 Track 44/95 aus der Datenanalyse InSAR Salzburg
            (<span className="font-mono">docs/research/Datenanalyse_InSAR_Salzburg.md</span>).
          </p>
        </>
      }
    >
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Beide Sensoren messen dasselbe physikalische Prinzip, aber mit gegensätzlichen Stärken —
        und diese Unterschiede prägen, wie belastbar ein Punkt im Viewer ist. Kein Sensor ist
        „besser“; sie ergänzen sich.
      </p>
      <ul className="grid max-w-3xl gap-3 text-sm leading-relaxed text-muted-foreground">
        <li className="grid gap-1.5">
          <ScopeBadge scope="tsx" detail="X-Band" />
          <span>
            <GlossaryTerm term="sar">TerraSAR-X</GlossaryTerm> löst mit {sensors.tsx.cellRangeM} ×{" "}
            {sensors.tsx.cellAzimuthM} m fein auf, ist präzise{" "}
            <GlossaryTerm term="geokodierung">geokodiert</GlossaryTerm> (Lage im Meterbereich, Höhe
            1σ ±{fmt.format(geoAccuracy1Sigma.tsx.heightM)} m) und liefert in Salzburg mit{" "}
            {fmt.format(salzburgTsx.points)} Punkten die dichtere Abdeckung. Der Preis:
            kommerzielle Daten und ein bereits{" "}
            <strong className="text-foreground">abgeschlossener Zeitraum</strong> (2011–2020) — die
            TSX-Zeitreihen enden in der Vergangenheit.
          </span>
        </li>
        <li className="grid gap-1.5">
          <ScopeBadge scope="s1" detail="C-Band" />
          <span>
            <GlossaryTerm term="sar">Sentinel-1</GlossaryTerm> ist mit {sensors.s1.cellRangeM} ×{" "}
            {sensors.s1.cellAzimuthM} m gröber aufgelöst und in der Lage unpräziser (Ost 1σ bis ±
            {fmt.format(geoAccuracy1Sigma.s1.eastM)} m), dafür{" "}
            <strong className="text-foreground">frei verfügbar und deutlich aktueller</strong>:
            Der verifizierte Salzburger Bestand (Bewegungsdaten) reicht bis März 2025. Beide{" "}
            <GlossaryTerm term="track">Blickrichtungen</GlossaryTerm> (aufsteigend Track{" "}
            {salzburgS1.asc.track}, absteigend Track {salzburgS1.dsc.track}) liegen im Projekt
            vor — Grundlage jeder{" "}
            <GlossaryTerm term="ascDsc">Zwei-Richtungs-Plausibilisierung</GlossaryTerm>.
          </span>
        </li>
      </ul>
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Für die Interpretation heißt das: Die millimetergenaue Bewegungspräzision ist bei beiden
        vergleichbar (σ der Rate &lt; {fmt.format(rateAccuracy.sigmaRateMmPerYear)} mm/a), aber
        sie gilt nur unter den unten genannten
        Bedingungen. Wo TSX und Sentinel-1 sich zeitlich kaum überlappen, sind ihre Aussagen keine
        direkte Kontrolle füreinander, sondern zwei Fenster auf verschiedene Epochen desselben
        Geländes.
      </p>
      <DiagramFrame id="sensorFaceoff">
        <SensorFaceoff />
      </DiagramFrame>
    </Chapter>
  );
}
