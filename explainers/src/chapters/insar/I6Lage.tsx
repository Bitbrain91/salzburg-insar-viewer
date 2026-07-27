/**
 * Kapitel 6 (Teil C · 1): „Wo liegt der Punkt wirklich?"
 * Geokodierung, die Entstehungskette der Höhenzahl (Ranging → Referenzfläche/
 * DEM → Baseline-Fit von ε), die Fehlerquellen der Höhe und das Phasenzentrum
 * als eigentlicher Ort der Messung. Zahlen kommen aus den Diagrammen
 * (insarFacts), nicht aus dem Fließtext.
 */
import { Chapter } from "@/components/layout/Chapter";
import { GlossaryTerm } from "@/components/GlossaryTerm";
import { insarChapterById } from "@/content/insarChapters";
import { FOOTNOTES, geoidOffsetSalzburgM, heightErrorSources } from "@/content/insarFacts";
import { formatMeters } from "@/lib/format";
import { GeolocationScatter } from "./diagrams/GeolocationScatter";
import { RangeArcGeocoding } from "./diagrams/RangeArcGeocoding";
import { BaselineStereoHeight } from "./diagrams/BaselineStereoHeight";
import { HeightPhaseCenter } from "./diagrams/HeightPhaseCenter";
import { DiagramFrame, ScopeBadge, goToAnchor } from "./insarUi";

export function I6Lage() {
  return (
    <Chapter
      meta={insarChapterById["insar-lage"]}
      techDetails={
        <>
          <p>
            <span className="font-semibold text-foreground">Geokodierung 1σ (TRE Altamira
            Tab. 1, S. 13):</span> Die Umrechnung der Radar-Bildkoordinaten
            (Schrägentfernung/Azimut) in Landeskoordinaten hat eine
            sensorabhängige Streuung — bei TerraSAR-X wenige Meter, bei
            Sentinel-1 ein Vielfaches davon, jeweils getrennt nach Nord und Ost.
            Die Werte gelten nur unter den Bedingungen aus Tab. 1–2 (S. 13–15):
            Punkt nahe am Referenzpunkt, ausreichend langer Bildstapel.
          </p>
          <p>
            <span className="font-semibold text-foreground">Höhe aus der Phase,
            Absolutlage am Referenzpunkt (TRE §2.1.1.1, S. 12):</span> Die Höhe
            eines Punkts wird aus der interferometrischen Phase geschätzt — kein
            Laserscan. Die absolute Lage des ganzen Datensatzes hängt am als
            unbeweglich angenommenen Referenzpunkt; jeder Fehler dort verschiebt
            alle Punkte gemeinsam.
          </p>
          <p>
            <span className="font-semibold text-foreground">Entstehungskette der
            Höhenzahl:</span> Die Laufzeit ortet in Entfernung, die
            Antennenausrichtung in Azimut („ranging", TRE §7 S. 47); die
            Lagekoordinaten hängen von der geschätzten Höhe ab (AUG §2.4.1
            S. 14). Die Feinhöhe ist der über den Bildstapel gefittete
            DEM-Restfehler ε (TRE §11.3 S. 61) — möglich, weil jede Szene eine
            eigene Baseline hat (bis „hundreds of meters", TRE §9 S. 50;
            Sentinel-1-Orbitalröhre unter 50 m, TRE §10 S. 55). Geliefert wird
            die Höhe über dem WGS-84-Ellipsoid (AUG Appendix S. 23; TRE Tab. 3
            S. 28). Über die Handbücher hinaus, jeweils gekennzeichnet:
            Mehrdeutigkeitshöhe hₐ, Lageversatz ε/tanθ und der Salzburger
            Geoid-Offset (FOOTNOTES.heightOfAmbiguity,
            .heightGeocodingCoupling, .geoidOffset in insarFacts).
          </p>
          <p>
            <span className="font-semibold text-foreground">Phasenzentrum und
            Mehrwege:</span> Jede Zelle enthält viele Elementarstreuer; die
            Handbücher nennen Mehrwegeffekte und „multiple Reflexionen von
            unterschiedlichen Höhenlagen" als Fehlerquellen (AUG S. 10 und
            Tab. 3 S. 17). Die konkrete Erklärung dazu — bei Zweifachreflexionen
            (Boden → Fassade) liegt das Phasenzentrum am Fuß der Struktur, nicht
            auf dem Dach — ist <span className="font-semibold text-foreground">
            etabliertes SAR-Standardwissen über die beiden Projekt-Handbücher
            hinaus</span> (Stichwort Double Bounce in der SAR-Literatur): Die
            gemessene Position ist der Ort des Echos, nicht des sichtbaren
            Objekts.
          </p>
          <p className="border-l-2 border-border pl-3 text-[13px]">
            <span className="font-semibold text-foreground">Fußnote Ost-Wert
            Sentinel-1:</span> {FOOTNOTES.s1EastAccuracy}
          </p>
        </>
      }
    >
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Die Koordinaten eines Punkts sehen exakt aus, sind aber selbst ein
        Schätzergebnis. Die{" "}
        <GlossaryTerm term="geokodierung">Geokodierung</GlossaryTerm> rechnet die
        Radar-Bildkoordinaten in Landeskoordinaten um, und diese Umrechnung
        streut — sensorabhängig und in Nord- und Ost-Richtung unterschiedlich
        stark. Die Draufsicht zeigt den Kontrast: Bei{" "}
        <ScopeBadge scope="tsx" className="align-middle" /> bleibt die Wolke
        eng ums wahre Objekt, bei{" "}
        <ScopeBadge scope="s1" className="align-middle" /> deckt schon die
        1σ-Ellipse halbe Straßenzüge ab.
      </p>

      <DiagramFrame id="geoScatter">

        <GeolocationScatter />

      </DiagramFrame>

      {/* Höhen-Entstehung: Laufzeit → Referenzfläche/DEM → Baseline-Fit */}
      <div className="grid max-w-3xl gap-3">
        <h3 className="text-sm font-bold text-foreground">
          Woher kommt die Höhenzahl — und welche Rolle spielt das Geländemodell?
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Ein Punkt mit „height = 470 m“ wirkt, als hätte der Satellit ein Maßband bis zum
          Boden abgerollt. Tatsächlich entsteht die Zahl in drei Schritten — und der erste
          kommt ganz ohne Phase aus: <GlossaryTerm term="ranging">Ranging</GlossaryTerm>.
          Aus der Laufzeit jedes Pulses folgt die Entfernung Sensor–Ziel auf Meter genau,
          und die Satellitenbahn selbst ist präzise bekannt. Damit steht für jede Bildzelle
          eine Linie gleicher Laufzeit fest. Nur <em>wo auf dieser Linie</em> der Punkt
          liegt, ist noch offen — genau das ist die Höhenfrage.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Schritt 2 beantwortet sie vorläufig: Die{" "}
          <GlossaryTerm term="geokodierung">Geokodierung</GlossaryTerm> schneidet die
          Laufzeit-Linie mit einer Referenzfläche — dem Geländemodell (DEM) beziehungsweise
          dem Ellipsoid. <strong className="text-foreground">Das Geländemodell liefert also
          die Start-Höhenannahme jeder Zelle.</strong> Und weil sich Laufzeit-Linie und
          Boden schräg schneiden, gilt: Stimmt die Höhe nicht, landet der Punkt seitlich
          versetzt auf der Karte — Höhen- und Lagefehler sind gekoppelt. Probiere es aus:
        </p>
      </div>

      <DiagramFrame id="rangeArc">
        <RangeArcGeocoding />
      </DiagramFrame>

      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Schritt 3 macht aus der Annahme eine Messung. Das Geländemodell kennt keine
        Dachkanten und keine Masten — die wahre Höhe eines Streuers weicht vom Modell ab,
        und genau diese Abweichung ist der{" "}
        <GlossaryTerm term="demRestfehler">DEM-Restfehler ε</GlossaryTerm> aus dem{" "}
        <button
          type="button"
          onClick={() => goToAnchor("insar-stoerungen")}
          className="font-medium text-primary underline underline-offset-2"
        >
          Phasen-Budget von Kapitel 3
        </button>
        . Weil jede Aufnahme des Stapels von einer minimal anderen Orbitposition entsteht (
        <GlossaryTerm term="baseline">Baseline</GlossaryTerm>), hinterlässt ε in jeder Szene
        einen anderen Phasenrest — und aus der Steigung dieses Musters fittet die
        Verarbeitung die Höhe jedes Punkts: ein Stereo-Prinzip aus vielen leicht versetzten
        Blickpunkten. Dass eine Zentimeter-Welle dabei Meter misst und nicht an ihrer
        Mehrdeutigkeit scheitert, liegt an der{" "}
        <GlossaryTerm term="mehrdeutigkeitshoehe">Mehrdeutigkeitshöhe</GlossaryTerm>: Bei
        der Höhe entspricht ein voller Phasenumlauf nicht Millimetern, sondern zig bis
        hunderten Metern.
      </p>

      <DiagramFrame id="baselineStereo">
        <BaselineStereoHeight />
      </DiagramFrame>

      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Die gelieferte Höhe ist damit Referenzfläche plus gefittetes ε — bezogen auf das
        WGS-84-<GlossaryTerm term="ellipsoidhoehe">Ellipsoid</GlossaryTerm>, nicht auf
        Meereshöhe: In Salzburg fallen height-Werte rund{" "}
        {formatMeters(geoidOffsetSalzburgM, 0)} höher aus als die vertraute Meereshöhe.
        Bleibt die Frage, wie sehr man sich auf die Zahl verlassen kann — sechs Gründe,
        warum sie abweichen kann:
      </p>

      {/* Fehlerquellen der Höhe */}
      <div className="grid gap-2 sm:grid-cols-2">
        {heightErrorSources.map((src) => (
          <div key={src.key} className="rounded-md border border-border bg-card px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-foreground">{src.label}</span>
              {src.standardwissen && (
                <span className="shrink-0 rounded-full border border-border bg-secondary px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                  z. T. Standardwissen
                </span>
              )}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{src.text}</p>
            <span className="mt-1.5 inline-block font-mono text-[10px] text-muted-foreground/70">
              {src.quelle}
            </span>
          </div>
        ))}
      </div>

      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Einer dieser Gründe verdient ein eigenes Bild: Selbst wenn die Höhenschätzung
        perfekt ist, muss der Punkt nicht auf dem sichtbaren Objekt sitzen. Jede Zelle
        bündelt viele Streuer zu einem{" "}
        <GlossaryTerm term="phasenzentrum">Phasenzentrum</GlossaryTerm> — und bei einer{" "}
        <GlossaryTerm term="doubleBounce">Double-Bounce-Reflexion</GlossaryTerm> an einer
        Fassade liegt dieses Zentrum am Fassadenfuß, nicht am Dach. Deshalb kann ein
        „Dachpunkt“ mehrere Meter neben oder unter dem Dach stehen.
      </p>

      <DiagramFrame id="heightPhaseCenter">

        <HeightPhaseCenter />

      </DiagramFrame>

      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Schließlich steht nicht jeder Punkt für einen einzelnen Reflektor: Ein{" "}
        <GlossaryTerm term="ds">Distributed Scatterer</GlossaryTerm> mittelt über
        eine ganze Fläche (<GlossaryTerm term="effArea">eff_area</GlossaryTerm>);
        seine Koordinate steht repräsentativ für diese homogene Fläche, nicht für
        ein bestimmtes Objekt darin — ein{" "}
        <GlossaryTerm term="ps">Permanent Scatterer</GlossaryTerm> dagegen hat die
        Fläche null. Zur zufälligen Streuung kommt noch ein systematischer
        Versatz durch die Schrägsicht: Wie dieser{" "}
        <button
          type="button"
          onClick={() => goToAnchor("insar-geometrie")}
          className="font-medium text-primary underline underline-offset-2"
        >
          Layover-Versatz
        </button>{" "}
        entsteht, zeigt das nächste Kapitel.
      </p>
    </Chapter>
  );
}
