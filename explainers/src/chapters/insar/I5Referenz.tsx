/**
 * Kapitel Teil B · 3: Alles ist relativ — Referenzpunkt (Was ist das? Wie
 * viele? Was passiert mit der Distanz?), doppelt differenzielle Zeitreihe,
 * Einschwingzeit. Trägt ReferencePointDemo, RefDistanceSketch und
 * ConvergencePlot.
 */
import { Chapter } from "@/components/layout/Chapter";
import { GlossaryTerm } from "@/components/GlossaryTerm";
import { insarChapterById } from "@/content/insarChapters";
import {
  convergence,
  rateAccuracy,
  rateConditions,
  referencePoint,
  salzburgTsx,
  sensors,
} from "@/content/insarFacts";
import { formatNumber } from "@/lib/format";
import { DiagramFrame, ScopeBadge } from "./insarUi";
import { ReferencePointDemo } from "./diagrams/ReferencePointDemo";
import { RefDistanceSketch } from "./diagrams/RefDistanceSketch";
import { ConvergencePlot } from "./diagrams/ConvergencePlot";

export function I5Referenz() {
  return (
    <Chapter
      meta={insarChapterById["insar-referenz"]}
      techDetails={
        <>
          <p>
            Differenziell in Raum und Zeit (TRE S. 11–12: „differential in space and time"): Jeder
            Wert ist zweifach bezogen — räumlich auf den Referenzpunkt und zeitlich auf die erste
            Aufnahme des Stapels. Absolute Bewegung misst InSAR nicht; die Absolutlage des gesamten
            Feldes hängt am Referenzpunkt (TRE §2.1.1.1 S. 12). Nicht zu verwechseln mit dem
            „Differential" in DInSAR — dort meint es die Subtraktion der Topografie-Phase (TRE
            §11.3 S. 61).
          </p>
          <p>
            Referenzpunkt-Auswahl (TRE S. 12, „selected for its radar properties and motion
            behaviour"): {referencePoint.auswahlKriterien.join("; ")}. {referencePoint.auswahlDurch}{" "}
            Der REF kann trotzdem einen linearen Regionaltrend enthalten — erkennbar nur durch eine
            unabhängige Messung wie ein GPS-/GNSS-Netz; auch die Absolutlage gegenüber dem
            ITRS-Referenzsystem ist nur per GNSS prüfbar (TRE S. 12).
          </p>
          <p>
            Künstliche Referenzpunkte: {referencePoint.cornerReflector}
          </p>
          <p>
            Präzisionsbedingungen (TRE Tab. 2 S. 14–15): Die dokumentierte Bewegungspräzision gilt
            für Punkte unter {formatNumber(rateConditions.maxRefDistanceKm, 0)} km vom
            Referenzpunkt bei einem Stapel von mindestens{" "}
            {formatNumber(rateConditions.minScenes, 0)} Szenen über mindestens{" "}
            {formatNumber(rateConditions.minTimespanYears, 0)} Jahre. Die Standardabweichung der
            mittleren Rate erreicht dann unter {formatNumber(rateAccuracy.sigmaRateMmPerYear, 0)}{" "}
            mm/a — {sensors.tsx.name} nach {convergence.tsx.monthsToSigma1[0]}–
            {convergence.tsx.monthsToSigma1[1]} Monaten, {sensors.s1.name} nach{" "}
            {convergence.s1.monthsToSigma1[0]}–{convergence.s1.monthsToSigma1[1]} Monaten. Diese
            Fenster stammen aus TRE Fig. 5 (S. 15–16) und gelten unter deren Szenario-Annahmen:
            Atmosphärenrauschen {formatNumber(convergence.assumptions.atmoNoiseMm2, 0)} mm²,{" "}
            {convergence.assumptions.note}, Punkte unter{" "}
            {formatNumber(convergence.assumptions.maxRefDistanceKm, 0)} km vom Referenzpunkt. Für
            Punkte jenseits von {formatNumber(convergence.assumptions.maxRefDistanceKm, 0)} km wird
            die Atmosphären-Statistik laut TRE S. 15 „more complex to be quantitatively described".
          </p>
          <p>
            Salzburg-Realbezug: Referenzpunkt {salzburgTsx.refPoint} bei{" "}
            {formatNumber(salzburgTsx.refPointLonLat[0], 4)}° Ost /{" "}
            {formatNumber(salzburgTsx.refPointLonLat[1], 4)}° Nord (WGS 1984),{" "}
            {formatNumber(salzburgTsx.scenes, 0)} Szenen über {salzburgTsx.period} (REPORT S. 2–8).
            Der Report dokumentiert nur Code und Koordinaten — nicht, was für ein Objekt der Punkt
            physisch ist.
          </p>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <ScopeBadge scope="allgemein" detail="Messprinzip" />
      </div>

      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Kein InSAR-Punkt misst absolut. Jede Zeitreihe ist{" "}
        <strong className="text-foreground">doppelt differenziell</strong>: räumlich bezogen auf
        einen <GlossaryTerm term="referenzpunkt">Referenzpunkt</GlossaryTerm>, den die Verarbeitung
        als unbeweglich annimmt, und zeitlich bezogen auf die erste{" "}
        <GlossaryTerm term="epoche">Aufnahme</GlossaryTerm> des Stapels. Ein Wert von „+2 mm im
        Jahr 3“ heißt also: zwei Millimeter mehr zum Satelliten hin als der Referenzpunkt, gemessen
        gegenüber dem Zustand der ersten Szene — nicht zwei Millimeter im absoluten Raum.
      </p>

      {/* REF-Vertiefung: Was ist das für ein Punkt, wie viele gibt es? */}
      <div className="grid max-w-3xl gap-3">
        <h3 className="text-sm font-bold text-foreground">
          Was für ein Punkt ist das eigentlich — und wie viele gibt es?
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Der Referenzpunkt ist kein Vermessungsstein und kein GPS-Empfänger, sondern{" "}
          <strong className="text-foreground">einer der Messpunkte selbst</strong>: ein besonders
          stabiler Radar-Reflektor, den der Verarbeiter nach zwei Kriterien auswählt — geringes
          Phasenrauschen in <em>allen</em> Szenen des Stapels und keinerlei Ratenänderungen
          (weder nichtlineare noch zyklische Bewegung) im Zeitraum. Wo es gar keine natürlichen{" "}
          <GlossaryTerm term="ps">Persistent Scatterer</GlossaryTerm> gibt, werden künstliche
          Corner-Reflektoren aufgestellt, um einen stabilen Referenzpunkt zu schaffen.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Und die Anzahl ist einfacher als gedacht: Es gibt{" "}
          <strong className="text-foreground">genau einen je Verarbeitung</strong> — alle
          Messpunkte des Datensatzes beziehen sich auf diesen einen Punkt. Eine „Dichte pro
          Fläche" existiert deshalb nicht. Wichtig für die Interpretation: Die Wahl ist
          stapelabhängig — wird derselbe Bestand mit anderen Szenen neu prozessiert, kann ein
          anderer Messpunkt zum Referenzpunkt werden, und die Zeitreihen zweier Verarbeitungen
          sind dann nicht 1:1 vergleichbar.
        </p>
        {/* Salzburg-Steckbrief */}
        <div className="grid gap-1.5 rounded-md border border-border bg-card px-3 py-2.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-foreground">
              Der Salzburger Referenzpunkt: {salzburgTsx.refPoint}
            </span>
            <ScopeBadge scope="tsx" detail="Track 93" />
          </div>
          <span className="font-mono text-muted-foreground">
            {formatNumber(salzburgTsx.refPointLonLat[1], 4)}° N /{" "}
            {formatNumber(salzburgTsx.refPointLonLat[0], 4)}° O (WGS 1984)
          </span>
          <span className="leading-relaxed text-muted-foreground">
            Ein einziger Referenzpunkt für alle {formatNumber(salzburgTsx.points, 0)} Punkte auf{" "}
            {formatNumber(salzburgTsx.areaKm2, 1)} km². Der Lieferreport nennt nur Code und
            Koordinaten — was für ein Objekt der Punkt physisch ist, ist nicht dokumentiert.
          </span>
        </div>
      </div>

      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Der Referenzpunkt ist damit die stille Voraussetzung hinter jedem Wert. Bewegt er sich
        selbst — etwa mit einem großräumigen Regionaltrend —, wandert sein Trend als gegenläufige
        Scheinbewegung in alle Zeitreihen (jeder Wert ist Ziel minus Referenz). Diese Annahme
        lässt sich aus den Radardaten allein nicht prüfen, nur durch eine unabhängige Messung wie{" "}
        <GlossaryTerm term="gnss">GNSS</GlossaryTerm>. Verschiebe im Diagramm die tatsächliche
        Eigenbewegung des Referenzpunkts und beobachte, wie sich alle drei Zeitreihen gemeinsam
        mitbewegen:
      </p>

      <DiagramFrame id="refDemo">
        <ReferencePointDemo />
      </DiagramFrame>

      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Auch die <strong className="text-foreground">Entfernung</strong> zum Referenzpunkt geht in
        jede Messung ein. Der Grund ist die Atmosphäre: Ihre Restfehler sind nur räumlich glatt —
        zwischen zwei nahen Orten herrschen fast dieselben Bedingungen, zwischen weit entfernten
        können sie deutlich verschieden sein. Da jeder Punkt letztlich mit dem Referenzpunkt
        verglichen wird, wächst die Unsicherheit dieses Vergleichs mit der Distanz — wie beim
        Vermessen mit aneinandergelegten Maßstäben, wo jedes weitere Glied der Kette etwas
        Unsicherheit addiert. Die Quellen belegen dafür keine Kurve, aber klare Distanz-Bänder:
      </p>

      <DiagramFrame id="refDistance">
        <RefDistanceSketch />
      </DiagramFrame>

      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Die zweite Relativität ist zeitlicher Natur: Die Präzision der Rate ist nicht sofort da. Sie
        schwingt sich erst über viele Aufnahmen ein — die Standardabweichung der mittleren Rate
        sinkt mit wachsender Stapellänge unter die Zielmarke von{" "}
        {formatNumber(rateAccuracy.sigmaRateMmPerYear, 0)} mm/a. Wie schnell, hängt am Sensor:
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <ScopeBadge scope="tsx" detail={`${convergence.tsx.monthsToSigma1[0]}–${convergence.tsx.monthsToSigma1[1]} Mon.`} />
        <ScopeBadge scope="s1" detail={`${convergence.s1.monthsToSigma1[0]}–${convergence.s1.monthsToSigma1[1]} Mon.`} />
      </div>

      <DiagramFrame id="convergence">
        <ConvergencePlot />
      </DiagramFrame>
    </Chapter>
  );
}
