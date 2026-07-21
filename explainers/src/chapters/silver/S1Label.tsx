import { Chapter } from "@/components/layout/Chapter";
import { GlossaryTerm } from "@/components/GlossaryTerm";
import { silverChapterById } from "@/content/silverChapters";
import { erhebungsRegeln, GE3D_PFLICHT_SEIT } from "@/content/silverFacts";
import { LabelBadge } from "./silverUi";
import { LabelDecisionTree } from "./diagrams/LabelDecisionTree";

export function S1Label() {
  return (
    <Chapter
      meta={silverChapterById["silver-label"]}
      techDetails={
        <>
          <p>Die fünf Erhebungsregeln aus der Korpus-Konvention:</p>
          <ol className="grid list-decimal gap-1.5 pl-5">
            {erhebungsRegeln.map((regel) => (
              <li key={regel.nr}>
                <strong className="text-foreground">{regel.kurz}:</strong> {regel.text}
              </li>
            ))}
          </ol>
          <p>
            Google-Earth-3D ist seit {GE3D_PFLICHT_SEIT} Pflichtschritt vor jeder
            foreign-Vergabe; entscheidend ist die bauliche Verbindung (gemeinsame Wand/Giebel).
            Die Screenshots der Prüfungen liegen als Evidenz unter{" "}
            <span className="font-mono">artifacts/label_evidence/</span>. Für die Fläche skaliert
            der 3D-Blick bewusst nicht — dort sollen BEV-Attribute und künftig das nDSM aus dem
            1-m-Laserscan übernehmen.
          </p>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>Vier mögliche Urteile:</span>
        <LabelBadge label="roof" />
        <LabelBadge label="annex" />
        <LabelBadge label="foreign" />
        <LabelBadge label="unclear" />
      </div>
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Ein Label ist kein Bauchgefühl, sondern das Ende einer Beweiskette: Ein{" "}
        <GlossaryTerm term="visualAudit">Visual Audit</GlossaryTerm>, der{" "}
        <GlossaryTerm term="survivorsScan">Survivors-Scan</GlossaryTerm> oder ein User-Befund
        macht einen Punkt verdächtig; die Radar-Geometrie (
        <GlossaryTerm term="layover">Layover</GlossaryTerm>-Seite) und der 3D-Blick auf das
        Gebäude entscheiden das Urteil. Wer die Beweiskette nicht schließen kann, vergibt
        ehrlich <span className="font-mono">unclear</span> — klicke dich durch den
        Entscheidungsweg:
      </p>
      <LabelDecisionTree />
    </Chapter>
  );
}
