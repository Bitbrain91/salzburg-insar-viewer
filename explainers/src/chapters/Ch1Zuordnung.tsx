import { Chapter } from "@/components/layout/Chapter";
import { FormulaBox } from "@/components/FormulaBox";
import { GlossaryTerm } from "@/components/GlossaryTerm";
import { chapterById } from "@/content/chapters";
import { assignment } from "@/content/facts";
import { formatDegrees, formatMeters } from "@/lib/format";
import { CandidateAreaDiagram } from "./diagrams/CandidateAreaDiagram";

export function Ch1Zuordnung() {
  return (
    <Chapter
      meta={chapterById.zuordnung}
      techDetails={
        <>
          <FormulaBox
            result="range_offset"
            terms={[{ name: "clamp(höhe · tan(inzidenz) · 1,0 | 3 m | 30 m)" }]}
            note={
              <>
                Die Candidate Area ist der Grundriss vereinigt mit seiner um{" "}
                <span className="font-mono">range_offset</span> entlang der Radar-Blickrichtung
                verschobenen Kopie, gepuffert um {formatMeters(assignment.lateralSlackM, 0)}{" "}
                lateralen Slack. Fehlt die Gebäudehöhe, gilt der Default{" "}
                {formatMeters(assignment.defaultHeightM, 0)}; fehlt der Einfallswinkel,{" "}
                {formatDegrees(assignment.defaultIncidenceDeg)}.
              </>
            }
          />
          <p>
            Prioritätsreihenfolge je Punkt: <span className="font-mono">within</span> (Priorität 0,
            Punkt liegt im Grundriss) vor <span className="font-mono">directional_buffer</span>{" "}
            (Priorität 1, Punkt in der Candidate Area) vor{" "}
            <span className="font-mono">nearest</span> (Priorität 2, nächstes Gebäude bis maximal{" "}
            {formatMeters(assignment.maxDistanceM, 0)}). Pro Punkt gewinnt genau ein Gebäude —
            sortiert nach Priorität, dann Distanz.
          </p>
          <p>
            Quellenspezifische Höhen: BEV nutzt <span className="font-mono">height_max_m</span> für
            die Candidate Area und <span className="font-mono">height_median_m</span> für spätere
            Plausibilitätsprüfungen (Station 3); GBA nutzt seine{" "}
            <span className="font-mono">height</span> für beides.
          </p>
        </>
      }
    >
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Wegen des <GlossaryTerm term="layover">Layover-Effekts</GlossaryTerm> erscheinen Dachpunkte
        hoher Gebäude zur Satellitenseite hin verschoben. Die Pipeline sucht deshalb je{" "}
        <GlossaryTerm term="track">Track</GlossaryTerm> in einer{" "}
        <GlossaryTerm term="candidateArea">Candidate Area</GlossaryTerm>: je höher das Gebäude und
        je flacher der <GlossaryTerm term="incidence">Einfallswinkel</GlossaryTerm>, desto weiter
        reicht sie. Probiere es aus — die Punkte färben sich live nach ihrer{" "}
        <GlossaryTerm term="assignmentMethod">Zuordnungsmethode</GlossaryTerm>.
      </p>
      <CandidateAreaDiagram />
      <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
        Punkt E liegt auf der satellitenabgewandten Seite — dort kann kein Dachpunkt hinprojiziert
        werden. Er wird zunächst nur als <span className="font-mono">nearest</span> geführt und in
        Station 3 genauer geprüft.
      </p>
    </Chapter>
  );
}
