/**
 * Kapitel 2 (Teil B·1): Die Phase als Maßband.
 * Fließtext + Hero-Diagramm PhaseRuler; alle Zahlen aus insarFacts.
 */
import { Chapter } from "@/components/layout/Chapter";
import { GlossaryTerm } from "@/components/GlossaryTerm";
import { insarChapterById } from "@/content/insarChapters";
import {
  FOOTNOTES,
  fringeSpacingMm,
  sensorIds,
  sensors,
  wavelengthMm,
} from "@/content/insarFacts";
import { formatNumber } from "@/lib/format";
import { PhaseRuler } from "./diagrams/PhaseRuler";
import { DiagramFrame, ScopeBadge, sensorColors } from "./insarUi";

export function I2Phase() {
  return (
    <Chapter
      meta={insarChapterById["insar-phase"]}
      techDetails={
        <>
          <p>
            Die Phasenverschiebung zwischen zwei Aufnahmen folgt exakt der Wegänderung entlang der
            Blicklinie: <span className="font-mono">Δφ = (4π/λ)·ΔR</span> (TRE §11.1, S. 57). Der
            Faktor 4π statt 2π kommt vom Zweiweg-Pfad — das Signal legt Hin- und Rückweg zurück.
            Positives ΔR meint hier Bewegung zum Satelliten.
          </p>
          <p>
            Ein voller <GlossaryTerm term="fringe">Fringe</GlossaryTerm> — ein kompletter
            Phasenumlauf von 2π — entspricht einer Wegänderung von einer halben Wellenlänge, λ/2
            (TRE Fig. 35, S. 59). Für Sentinel-1 sind das{" "}
            {formatNumber(fringeSpacingMm("s1"), 1)} mm, für TerraSAR-X nur{" "}
            {formatNumber(fringeSpacingMm("tsx"), 1)} mm.
          </p>
          <p>
            Wellenlängen: Sentinel-1 (C-Band){" "}
            {formatNumber(wavelengthMm("s1") / 10, 1)} cm, TerraSAR-X (X-Band){" "}
            {formatNumber(wavelengthMm("tsx") / 10, 2)} cm (TRE Tab. 8, S. 56; AUG S. 7 f.).
          </p>
          <p className="border-t border-border pt-2 text-xs">
            <strong className="text-foreground">Quellen-Diskrepanz:</strong> {FOOTNOTES.s1Wavelength}
          </p>
        </>
      }
    >
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Ein Radarsatellit misst nicht nur, wie stark ein Echo zurückkommt (die{" "}
        <GlossaryTerm term="amplitude">Amplitude</GlossaryTerm>), sondern auch in welcher
        Schwingungslage es eintrifft — die <GlossaryTerm term="phase">Phase</GlossaryTerm>. Diese
        Phase wirkt wie ein Maßband mit extrem feiner Teilung: Verschiebt sich ein Reflektor um
        einen Bruchteil der Wellenlänge zum Satelliten hin oder von ihm weg, dreht sich die Phase
        um einen genau berechenbaren Betrag.
      </p>
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Aus zwei Aufnahmen desselben Gebiets bildet die Verarbeitung die Phasendifferenz — das{" "}
        <GlossaryTerm term="interferogramm">Interferogramm</GlossaryTerm>. Dessen Streifenmuster
        (Fringes) sind die Wegänderungen zwischen den beiden Aufnahmen. Vorzeichen-Konvention im
        gesamten Explainer: <strong className="text-foreground">positiv = Bewegung zum
        Satelliten</strong>.{" "}
        <ScopeBadge scope="allgemein" className="align-middle" detail="Δφ = 4π/λ · ΔR" />
      </p>

      <DiagramFrame id="phaseRuler">

        <PhaseRuler />

      </DiagramFrame>

      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Die Wellenlänge des Sensors bestimmt, wie fein diese Teilung ist: Je kürzer die Welle,
        desto weniger Weg steckt in einem Fringe — desto empfindlicher misst der Sensor, aber desto
        schneller wird die Phase auch mehrdeutig (nächstes Kapitel).
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {sensorIds.map((id) => (
          <div
            key={id}
            className="grid gap-1 rounded-md border border-border bg-card px-3 py-2.5 text-xs"
            style={{ borderLeftColor: sensorColors[id], borderLeftWidth: 3 }}
          >
            <ScopeBadge scope={id} detail={`${sensors[id].band}-Band`} />
            <p className="text-muted-foreground">
              λ = {formatNumber(wavelengthMm(id) / 10, 2)} cm → 1 Fringe = λ/2 ={" "}
              <span className="font-semibold text-foreground">
                {formatNumber(fringeSpacingMm(id), 1)} mm
              </span>{" "}
              Wegänderung.
            </p>
          </div>
        ))}
      </div>
    </Chapter>
  );
}
