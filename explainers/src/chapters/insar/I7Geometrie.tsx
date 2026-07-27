/**
 * Kapitel 7 (Teil C · 2): „Schrägsicht-Effekte".
 * Slant vs. Ground Range, Foreshortening/Layover/Schatten, Mehrwege in Städten
 * und die 1D-Blicklinie (N–S fast blind, 2D erst durch ASC+DSC). Brücke zur
 * Pipeline-Reise (Candidate Area modelliert genau diesen Layover-Versatz).
 */
import { Chapter } from "@/components/layout/Chapter";
import { GlossaryTerm } from "@/components/GlossaryTerm";
import { insarChapterById } from "@/content/insarChapters";
import { FOOTNOTES, salzburgTsx } from "@/content/insarFacts";
import { formatDegrees, formatNumber } from "@/lib/format";
import { LayoverPlayground } from "./diagrams/LayoverPlayground";
import { LosProjectionLab } from "./diagrams/LosProjectionLab";
import { DiagramFrame, ScopeBadge, goToAnchor } from "./insarUi";

export function I7Geometrie() {
  return (
    <Chapter
      meta={insarChapterById["insar-geometrie"]}
      techDetails={
        <>
          <p>
            <span className="font-semibold text-foreground">Slant vs. Ground
            Range (TRE Altamira §9.1, S. 51; Geometrie §9, S. 50):</span> Das
            Radar misst in Schrägentfernung; die abgebildete Bodenfläche je Zelle
            hängt von der Hangneigung relativ zum Einfallswinkel ab. Daraus
            folgen Foreshortening, Layover und Schatten.
          </p>
          <p>
            <span className="font-semibold text-foreground">Verzerrungs-Zonen
            (AUGMENTERRA §3, Tab. 3, S. 17):</span> Der Diagramm-Regler wertet
            <span className="font-mono"> slantMapping(Hangneigung, θ) </span>
            aus: zugewandter Hang flacher als θ = gestaucht (Foreshortening, mit
            der Neigung zunehmend), steiler als θ = umgeklappt (Layover);
            abgewandter Hang steiler als (90° − θ) = Radarschatten. Ein Hochhaus
            (nahezu senkrecht) liegt praktisch immer im Layover. Das ist ein
            idealisiertes 1D-Profil in Blickrichtung: Hang-Exposition quer zur
            Blicklinie und Verschattung durch vorgelagertes Gelände sind nicht
            modelliert — real entsteht daraus eine Sichtbarkeitskarte aus LOS und
            Topografie (TRE Fig. 29, S. 53).
          </p>
          <p>
            <span className="font-semibold text-foreground">1D-Messung, 2D erst
            durch zwei Bahnen (TRE §2.1.2, S. 19–20):</span> Gemessen wird die
            Projektion auf die Blicklinie. Zwei Blickrichtungen (ASC + DSC)
            erlauben eine Zerlegung in eine vertikale und eine Ost-West-Komponente
            in gemeinsamen Pseudozellen (TRE: „in general 100x100 m"); Nord–Süd
            bleibt unbestimmt. Fußnote zur Rastergröße: {FOOTNOTES.pseudoCells2d}
          </p>
          <p>
            <span className="font-semibold text-foreground">Salzburg TSX
            (Lieferreport ES2830A2S, S. 2):</span>{" "}
            <ScopeBadge scope="tsx" className="align-middle" /> Track 93
            (absteigend), Einfallswinkel {formatDegrees(salzburgTsx.thetaDeg)},
            Blicklinien-Versoren Ost {formatNumber(salzburgTsx.losVersor.e, 3)} /
            Nord {formatNumber(salzburgTsx.losVersor.n, 3)} / vertikal{" "}
            {formatNumber(salzburgTsx.losVersor.v, 3)} — die kleine
            Nord-Komponente ist der Grund für die Nord–Süd-Blindheit.
          </p>
        </>
      }
    >
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Das Radar blickt schräg und misst Entfernungen entlang seiner{" "}
        <GlossaryTerm term="slantRange">Schrägsicht</GlossaryTerm>. Beim
        Umrechnen auf die Karte entstehen drei geometrische Verzerrungen:{" "}
        <GlossaryTerm term="foreshortening">Foreshortening</GlossaryTerm> staucht
        dem Radar zugewandte Hänge, <GlossaryTerm term="layover">Layover</GlossaryTerm>{" "}
        klappt sehr steile Flächen und Hochbauten zum Sensor um, und im{" "}
        <GlossaryTerm term="radarschatten">Radarschatten</GlossaryTerm>{" "}
        abgewandter Steilhänge entsteht gar kein Signal. Im idealisierten
        Querschnitt unten hängt die Zone von Hangneigung und{" "}
        <GlossaryTerm term="incidence">Einfallswinkel</GlossaryTerm> ab (im
        realen 3D-Gelände zusätzlich von Exposition und vorgelagerter
        Topografie) — probiere es aus.
      </p>

      <DiagramFrame id="layover">

        <LayoverPlayground />

      </DiagramFrame>

      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        In dicht bebauten Gebieten kommt erschwerend hinzu, dass ein Echo oft
        über mehrere Wege zum Sensor gelangt (Boden → Fassade → Sensor). Solche
        Mehrwege überlagern sich in derselben Zelle und verschieben das
        Phasenzentrum — ein weiterer Grund, warum ein Punkt neben seinem
        vermeintlichen Objekt landen kann.
      </p>

      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Ebenso grundlegend: Gemessen wird immer nur eine einzige Komponente,
        nämlich die Projektion der Bewegung auf die{" "}
        <GlossaryTerm term="los">Blicklinie</GlossaryTerm>. Für Nord–Süd-Bewegung
        ist das Radar deshalb fast blind. Erst zwei Blickrichtungen —{" "}
        <GlossaryTerm term="ascDsc">aufsteigend und absteigend</GlossaryTerm> —
        ergeben ein 2D-Bild. Das Labor zeigt beides: die didaktischen ASC/DSC-
        Blicklinien und die reale Salzburger TSX-Geometrie.
      </p>

      <DiagramFrame id="losLab">

        <LosProjectionLab />

      </DiagramFrame>

      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Genau dieser systematische Layover-Versatz taucht in der Verarbeitung
        wieder auf: In der{" "}
        <button
          type="button"
          onClick={() => goToAnchor("zuordnung")}
          className="font-medium text-primary underline underline-offset-2"
        >
          Punktzuordnung der Pipeline-Reise
        </button>{" "}
        modelliert die Candidate Area, wohin Dachpunkte durch Layover projiziert
        werden — je höher das Gebäude und je flacher der Einfallswinkel, desto
        weiter reicht sie.
      </p>
    </Chapter>
  );
}
