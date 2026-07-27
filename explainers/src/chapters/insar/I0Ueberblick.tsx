import { Chapter } from "@/components/layout/Chapter";
import { GlossaryTerm } from "@/components/GlossaryTerm";
import { Card } from "@/components/ui";
import { insarChapterById } from "@/content/insarChapters";
import { SOURCES, type Scope } from "@/content/insarFacts";
import { DiagramFrame, ScopeBadge } from "./insarUi";
import { PointGenesisFlow } from "./diagrams/PointGenesisFlow";

const SCOPE_EXPLAINER: { scope: Scope; text: string }[] = [
  { scope: "allgemein", text: "gilt für jedes SAR-System — Physik der Radar-Interferometrie." },
  { scope: "s1", text: "gilt nur für Sentinel-1 (C-Band) — der frei verfügbare Flächen-Sensor." },
  { scope: "tsx", text: "gilt nur für TerraSAR-X (X-Band) — der hochauflösende Salzburg-Datensatz." },
];

export function I0Ueberblick() {
  return (
    <Chapter
      meta={insarChapterById["insar-ueberblick"]}
      techDetails={
        <>
          <p>
            Dieser Explainer stützt sich auf zwei Handbücher: das{" "}
            <span className="font-semibold text-foreground">{SOURCES.aug.kurz}</span> als
            Überblicksquelle und das{" "}
            <span className="font-semibold text-foreground">{SOURCES.tre.kurz}</span> als
            Detailquelle. Die konkreten Salzburg-Zahlen stammen aus dem{" "}
            {SOURCES.report.kurz} (TerraSAR-X) und der {SOURCES.inventar.kurz} (Sentinel-1).
          </p>
          <p>
            Alle sichtbaren Zahlen und Formeln sind zentral hinterlegt und werden in den
            Diagrammen live gerechnet — keine Kennzahl ist im Text fest verdrahtet. Wo sich die
            beiden Handbücher unterscheiden (etwa in der Sentinel-1-Wellenlänge), lösen wir das
            nicht still auf, sondern zeigen beide Werte als Fußnote.
          </p>
        </>
      }
    >
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Jeder Punkt im Viewer ist das Endprodukt einer langen Kette. Wer ihn richtig lesen will —
        was er über Bewegung, Lage und Höhe aussagt und was nicht —, muss wissen, wie er entsteht.{" "}
        <GlossaryTerm term="insar">InSAR</GlossaryTerm> beginnt nicht bei einem Messpunkt, sondern
        bei Radarpulsen aus dem Orbit: Ein <GlossaryTerm term="sar">SAR</GlossaryTerm>-Satellit
        beleuchtet die Erde schräg von der Seite und misst die zurückgeworfenen Echos.
      </p>
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Aus diesen Echos wird ein komplexes Radarbild, aus zwei Bildern ein{" "}
        <GlossaryTerm term="interferogramm">Interferogramm</GlossaryTerm>, aus vielen Aufnahmen über
        Jahre ein Bildstapel — und erst aus diesem Stapel werden die stabilen Reflektoren
        ausgewählt, die als Punktwolke im Viewer landen. Diese Seite geht die Kette Station für
        Station durch; jede Station führt zum passenden Kapitel.
      </p>
      <DiagramFrame id="pointGenesisFlow">
        <PointGenesisFlow />
      </DiagramFrame>
      <Card className="grid gap-3 p-4">
        <p className="text-sm font-semibold text-foreground">
          So kennzeichnen wir jede Aussage
        </p>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Vieles gilt für jedes Radar, manches nur für einen bestimmten Sensor. Damit nie unklar
          bleibt, worauf sich eine Zahl bezieht, trägt jede sensorspezifische Aussage, Karte und
          Diagramm-Ecke einen dieser drei Marker:
        </p>
        <ul className="grid gap-2">
          {SCOPE_EXPLAINER.map((item) => (
            <li key={item.scope} className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <ScopeBadge scope={item.scope} />
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
        <p className="max-w-3xl text-[11px] leading-relaxed text-muted-foreground">
          Genauigkeits- und Präzisionswerte zeigen wir außerdem nie ohne ihre Geltungsbedingung —
          etwa die Nähe zum Referenzpunkt und die Mindestzahl an Aufnahmen.
        </p>
      </Card>
    </Chapter>
  );
}
