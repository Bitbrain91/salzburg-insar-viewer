import { Chapter } from "@/components/layout/Chapter";
import { FindingCard } from "@/components/ui/insights";
import { GlossaryTerm } from "@/components/GlossaryTerm";
import { chapterById } from "@/content/chapters";
import { PipelineFlow } from "./diagrams/PipelineFlow";

export function Ch0Einfuehrung() {
  return (
    <Chapter
      meta={chapterById.einfuehrung}
      techDetails={
        <>
          <p>
            Die Pipeline analysiert Punkte lokal je <span className="font-mono">Gebäude × Track</span>.
            Kernfrage der Methodik: „Passt ein Punkt geometrisch, signaltechnisch und zeitlich zu
            diesem Gebäude und zu dessen anderen Punkten?" Ergebnisse sind Forschungsbefunde für den
            konkreten Lauf-, Modell- und Datenstand.
          </p>
          <p>
            Untersuchungsgebiete sind die Stadt Salzburg (Tracks 44/95) und Bad Gastein; die
            Standard-Gebäudequelle ist <GlossaryTerm term="bev">BEV</GlossaryTerm>,{" "}
            <GlossaryTerm term="gba">GBA</GlossaryTerm> und OSM dienen als Vergleichs- und
            Kontextquellen. Autoritative Methodikbeschreibung:{" "}
            <span className="font-mono">docs/pipelines/anomaly_local_v1/methodik.md</span>.
          </p>
        </>
      }
    >
      <div className="grid gap-2.5 md:grid-cols-3">
        <FindingCard
          tone="neutral"
          label="Radar misst schräg, nicht senkrecht"
          detail={
            <>
              <GlossaryTerm term="insar">InSAR</GlossaryTerm> erfasst Bewegung entlang der{" "}
              <GlossaryTerm term="los">Blickrichtung (LOS)</GlossaryTerm> des Satelliten. Der{" "}
              <GlossaryTerm term="verticalProxy">Vertikal-Proxy</GlossaryTerm> rechnet das in eine
              vertikale Näherung um — eine Näherung, keine echte 3D-Messung.
            </>
          }
        />
        <FindingCard
          tone="neutral"
          label="Zwei Blickrichtungen auf jedes Gebäude"
          detail={
            <>
              <GlossaryTerm term="ascDsc">Aufsteigende und absteigende</GlossaryTerm>{" "}
              Satellitenbahnen sehen dasselbe Gebäude von verschiedenen Seiten. Durch{" "}
              <GlossaryTerm term="layover">Layover</GlossaryTerm> erscheinen Dachpunkte seitlich
              versetzt — das ist erwartbar und wird von der Pipeline einkalkuliert.
            </>
          }
        />
        <FindingCard
          tone="warning"
          label="Keine Schadensdiagnose"
          detail={
            <>
              Die Plattform erklärt Befunde — sie diagnostiziert{" "}
              <strong>keine Gebäudeschäden</strong>, liefert keine Schadenswahrscheinlichkeit und
              keine Prognose. Jede Aussage gilt für den konkreten Analyse-Lauf.
            </>
          }
        />
      </div>
      <PipelineFlow />
    </Chapter>
  );
}
