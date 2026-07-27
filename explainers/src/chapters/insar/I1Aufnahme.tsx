import { Chapter } from "@/components/layout/Chapter";
import { GlossaryTerm } from "@/components/GlossaryTerm";
import { insarChapterById } from "@/content/insarChapters";
import { sensors } from "@/content/insarFacts";
import { formatNumber } from "@/lib/format";
import { DiagramFrame, ScopeBadge } from "./insarUi";
import { SarGeometrySketch } from "./diagrams/SarGeometrySketch";
import { ResolutionCellExplorer } from "./diagrams/ResolutionCellExplorer";

export function I1Aufnahme() {
  return (
    <Chapter
      meta={insarChapterById["insar-aufnahme"]}
      techDetails={
        <>
          <p>
            <span className="font-semibold text-foreground">Aktives Radar, kohärent gemessen:</span>{" "}
            Ein SAR-Sensor sendet eigene Mikrowellenpulse und ist deshalb unabhängig von
            Sonnenlicht; Mikrowellen durchdringen Wolken (TRE §7 S. 47). Je Bildpunkt werden zwei
            Größen gespeichert — Amplitude (Echostärke) und Phase (Schwingungslage) — zusammen eine
            komplexe Zahl (TRE §8 S. 48).
          </p>
          <p>
            <span className="font-semibold text-foreground">Synthetische Apertur:</span> Statt einer
            physisch riesigen Antenne kombiniert das Verfahren viele Echos entlang der Flugbahn
            kohärent und erreicht so eine feine Auflösung in Azimut (TRE §7 S. 47). Gemessen wird in{" "}
            <GlossaryTerm term="slantRange">Slant Range</GlossaryTerm> (Schrägentfernung); die
            Umrechnung auf den Boden (Ground Range) und der Off-Nadir-Winkel θ prägen die Geometrie
            (TRE §9–9.1 S. 50–51).
          </p>
          <p>
            <span className="font-semibold text-foreground">Zellgrößen (modusabhängig):</span>{" "}
            Sentinel-1 im Modus {sensors.s1.modeLabel} rastert{" "}
            {formatNumber(sensors.s1.cellRangeM, 0)} m in Range ×{" "}
            {formatNumber(sensors.s1.cellAzimuthM, 0)} m in Azimut; TerraSAR-X im{" "}
            {sensors.tsx.modeLabel} {formatNumber(sensors.tsx.cellRangeM, 0)} ×{" "}
            {formatNumber(sensors.tsx.cellAzimuthM, 0)} m (TRE Tab. 8 S. 56; AUG S. 5). Der
            TerraSAR-X-Stripmap ist der Modus der Salzburger Daten.
          </p>
        </>
      }
    >
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Ein <GlossaryTerm term="sar">SAR</GlossaryTerm>-Satellit trägt sein eigenes „Licht“: Er
        strahlt Mikrowellenpulse ab und empfängt deren Echos. Weil er nicht auf die Sonne angewiesen
        ist und Mikrowellen Wolken durchdringen, misst er bei Tag und Nacht und bei jedem Wetter —
        ein entscheidender Unterschied zu optischen Satelliten.
      </p>
      <div className="flex items-center gap-2">
        <ScopeBadge scope="allgemein" />
        <span className="text-xs text-muted-foreground">Aufnahmegeometrie jedes seitwärts blickenden SAR</span>
      </div>
      <DiagramFrame id="sarGeometry">
        <SarGeometrySketch />
      </DiagramFrame>
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Das Radar blickt schräg zur Seite, nie senkrecht nach unten. Zwei Richtungen spannen das
        Bild auf: <span className="font-semibold text-foreground">Range</span> quer zur Flugbahn und{" "}
        <span className="font-semibold text-foreground">Azimut</span> entlang der Bahn. In Azimut
        entsteht die feine Auflösung durch die <em>synthetische Apertur</em> — das kohärente
        Zusammenrechnen vieler Echos entlang der Bahn, als wäre die Antenne kilometerlang. Und weil
        die Bahn zweimal am selben Gebiet vorbeiführt, sieht das Radar es aufsteigend (
        <GlossaryTerm term="ascDsc">ASC</GlossaryTerm>) und absteigend (DSC) aus zwei Richtungen.
      </p>
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Das Ergebnis ist ein Raster aus{" "}
        <GlossaryTerm term="resolutionCell">Auflösungszellen</GlossaryTerm>. Für jede Zelle speichert
        das SAR-Bild genau eine komplexe Zahl: die <GlossaryTerm term="amplitude">Amplitude</GlossaryTerm>{" "}
        sagt, wie stark das Echo ist, die <GlossaryTerm term="phase">Phase</GlossaryTerm>, in welcher
        Schwingungslage es zurückkommt. Alles, was in derselben Zelle liegt, verschmilzt zu diesem
        einen Wert — und wie grob diese Vermischung ausfällt, hängt stark vom Sensor ab:
      </p>
      <DiagramFrame id="resolutionCell">
        <ResolutionCellExplorer />
      </DiagramFrame>
      <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
        Für die Bewegungsmessung zählt später fast nur die Phase. Wie aus ihr ein Millimeter-Maßband
        wird, zeigt das nächste Kapitel.
      </p>
    </Chapter>
  );
}
