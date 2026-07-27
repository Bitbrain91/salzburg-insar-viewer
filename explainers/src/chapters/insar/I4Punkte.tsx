/**
 * Kernkapitel (Teil B · Kern): Vom Bildstapel zum Punkt — wer PS oder DS
 * wird, und wer nicht. Trägt das Hero-Diagramm PsDsCityScene.
 */
import { Chapter } from "@/components/layout/Chapter";
import { GlossaryTerm } from "@/components/GlossaryTerm";
import { insarChapterById } from "@/content/insarChapters";
import {
  coherence,
  minScenesSameGeometry,
  pointAttributes,
  salzburgTsx,
  seasonalEffects,
} from "@/content/insarFacts";
import { formatNumber, formatScore } from "@/lib/format";
import { DiagramFrame, ScopeBadge } from "./insarUi";
import { PsDsCityScene } from "./diagrams/PsDsCityScene";

export function I4Punkte() {
  return (
    <Chapter
      meta={insarChapterById["insar-punkte"]}
      techDetails={
        <>
          <p>
            Punktauswahl-Kriterien (Mindest-Stapel: TRE §2.1 S. 10; AUG S. 13; PS/DS-Verfahren:
            TRE §11.5 S. 64, §11.6 S. 65–66): Aus dem koregistrierten Bildstapel gleicher
            Geometrie und gleichen Modus (mindestens {formatNumber(minScenesSameGeometry.min, 0)}–
            {formatNumber(minScenesSameGeometry.max, 0)} Szenen) werden Zellen mit über die Zeit
            stabiler Phase ausgewählt. Die temporale Kohärenz misst diese Stabilität über den
            gesamten Stapel — sie ist nicht die Interferogramm-Kohärenz eines einzelnen
            Aufnahmepaars (TRE S. 15–16).
          </p>
          <p>
            Zwei Streuertypen (TRE §2.1 S. 10, §11.6 S. 65–66): Persistent Scatterer (PS) liefern
            ein punktförmiges, über Jahre nahezu identisches Echo (Gebäudekanten, Masten, Fels;
            eff_area = 0). Distributed Scatterer (DS) sind statistisch homogene Flächen, deren
            einzelne Zellen zu schwach sind — erst die Mittelung über die effektive Fläche ergibt
            ein brauchbares Signal (nur Fläche, keine Form). Vegetation dekorreliert zwischen den
            Aufnahmen und senkt die Punktdichte stark — sie ist die Hauptursache der Dekorrelation
            (TRE §11.2.2 S. 60); nur über Wasser sind laut TRE §2.1 S. 10 grundsätzlich keine
            Messpunkte identifizierbar.
          </p>
          <p>
            Zwei Kohärenz-Schwellen, zwei Begriffe: Die Interferogramm-Kohärenz eines einzelnen
            Aufnahmepaars gilt unter {formatScore(coherence.interferogramUnreliableBelow)} als
            unzuverlässig (TRE §11.2.2 S. 60); das gelieferte Punkt-Attribut coherence — ein
            Skalar je Punkt über den ganzen Stapel — gilt ab{" "}
            {formatScore(coherence.attributeReliableAbove)} als zuverlässig (AUG Appendix
            S. 24 f.). Beides sind{" "}
            <span className="font-semibold text-foreground">
              generische Interpretations-Faustregeln aus den Handbüchern
            </span>
            , keine Salzburg-Messwerte — die tatsächlichen coherence-Werte je Punkt hängen an
            Oberfläche und Region. Salzburg-Realwert: Der {salzburgTsx.mode}-TerraSAR-X-Datensatz
            ist mit {salzburgTsx.processing} prozessiert und liefert rund{" "}
            {formatNumber(salzburgTsx.densityPerKm2, 0)} Punkte/km²
            ({formatNumber(salzburgTsx.points, 0)} Punkte auf {formatNumber(salzburgTsx.areaKm2, 1)}{" "}
            km², REPORT S. 2–8). Punkt-Attribute je Datenpunkt: AUG Appendix §7 S. 24–25.
          </p>
          <p>
            Saisonaler Effekt Schnee: {seasonalEffects.schneeStreutDiffus}{" "}
            {seasonalEffects.winterluecken} Daraus folgt als{" "}
            <span className="font-semibold text-foreground">Projekt-Folgerung</span> (so nicht
            wörtlich in den Handbüchern): In schneereichen Lagen wie Bad Gastein sind saisonal
            niedrigere Kohärenzwerte, winterliche Datenlücken und insgesamt instabilere Punkte zu
            erwarten als im Salzburger Stadtgebiet.
          </p>
          <p className="text-muted-foreground/80">
            Historische Einordnung (Literaturangabe, nicht aus dem Zahlen-Vertrag): Die erste
            Generation PSInSAR (Ferretti et al., 2000) wählte ausschließlich Persistent Scatterer
            aus; die heutige Generation SqueeSAR ergänzt die Distributed Scatterer.
          </p>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <ScopeBadge scope="allgemein" detail="PS/DS-Prinzip" />
      </div>

      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Ein SAR-Bild hat Millionen Zellen, aber nur ein kleiner Teil davon wird je zum Messpunkt.
        Die Verarbeitung legt dazu einen <GlossaryTerm term="epoche">koregistrierten Bildstapel</GlossaryTerm>{" "}
        aus mindestens {formatNumber(minScenesSameGeometry.min, 0)}–
        {formatNumber(minScenesSameGeometry.max, 0)} Aufnahmen gleicher Geometrie und gleichen Modus
        übereinander und sucht Zellen, deren <GlossaryTerm term="phase">Phase</GlossaryTerm> über
        die ganze Zeit stabil bleibt. Genau diese Stabilität beziffert die{" "}
        <GlossaryTerm term="coherence">Kohärenz</GlossaryTerm>: Sie ist ein Maß über den gesamten
        Stapel — nicht die Kohärenz eines einzelnen{" "}
        <GlossaryTerm term="interferogramm">Interferogramms</GlossaryTerm>.
      </p>

      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Stabile Zellen fallen in zwei physikalisch verschiedene Klassen. Ein{" "}
        <GlossaryTerm term="ps">Permanent Scatterer</GlossaryTerm> ist ein punktförmiger,
        über Jahre nahezu identischer Reflektor: eine Gebäude- oder Dachkante, ein Laternenmast, eine
        Felswand. Sein Echo stammt von einer einzelnen Struktur, seine effektive Fläche ist null. Ein{" "}
        <GlossaryTerm term="ds">Distributed Scatterer</GlossaryTerm> dagegen ist eine ausgedehnte,
        statistisch homogene Fläche — ein Schotterplatz, unbewachsener Boden. Jede einzelne Zelle
        ist zu schwach, aber die Mittelung über die{" "}
        <GlossaryTerm term="effArea">effektive Fläche</GlossaryTerm> ergibt ein brauchbares Signal.
        Ein DS-Punkt repräsentiert eine Fläche, keine Form. Genau diese Kombination aus PS und DS
        leistet der Algorithmus <GlossaryTerm term="squeesar">SqueeSAR</GlossaryTerm>.
      </p>

      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Wiese und Wald liefern kaum etwas, Wasser nichts. Gras wächst, wird gemäht und nass;
        Blätter und Äste bewegen sich mit dem Wind; eine Wasseroberfläche ist nie zweimal gleich.
        Die Streuer ändern sich zwischen den Aufnahmen ständig — die Phase dekorreliert, und
        Vegetation ist dabei die Hauptursache. Über Vegetation sinkt die Punktdichte deshalb
        drastisch (einzelne stabile Ziele wie Masten oder Felsblöcke bleiben möglich; L-Band
        durchdringt Laub teilweise), über Wasser entstehen grundsätzlich keine Punkte. InSAR-Punkte
        sind darum kein gleichmäßiges Raster, sondern ein Muster, das der Physik der Oberfläche
        folgt: dicht über Bebauung und Fels, dünn bis leer über allem, was lebt oder fließt.
      </p>

      <DiagramFrame id="psDsCity">

        <PsDsCityScene />

      </DiagramFrame>

      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Wie dicht die Punkte am Ende liegen, hängt an der Auflösung des Sensors und an der Bebauung.
        Der reale Salzburger TerraSAR-X-Datensatz zeigt die Größenordnung für dicht bebautes Gebiet:
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <ScopeBadge scope="tsx" detail="Salzburg, Track 93" />
        <span className="text-sm text-muted-foreground">
          rund{" "}
          <span className="font-mono font-semibold text-foreground">
            {formatNumber(salzburgTsx.densityPerKm2, 0)}
          </span>{" "}
          Punkte/km² ·{" "}
          <span className="font-mono font-semibold text-foreground">
            {formatNumber(salzburgTsx.points, 0)}
          </span>{" "}
          Punkte insgesamt · prozessiert mit {salzburgTsx.processing}
        </span>
      </div>

      <div className="grid gap-2">
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Am Ende trägt jeder überlebende Punkt einen festen Satz Attribute — das ist es, was der
          Datensatz je Punkt liefert:
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {pointAttributes.map((attr) => (
            <div key={attr.key} className="rounded-md border border-border bg-card px-3 py-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">{attr.label}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{attr.einheit}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{attr.text}</p>
              <span className="mt-1.5 inline-block font-mono text-[10px] text-muted-foreground/70">
                {attr.key}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Chapter>
  );
}
