import { Chapter } from "@/components/layout/Chapter";
import { GlossaryTerm } from "@/components/GlossaryTerm";
import { silverChapterById } from "@/content/silverChapters";
import { corpus, korpusHistorie } from "@/content/silverFacts";
import { CorpusExplorer } from "./diagrams/CorpusExplorer";

export function S2Korpus() {
  return (
    <Chapter
      meta={silverChapterById["silver-korpus"]}
      techDetails={
        <>
          <p>
            Schema je Label-Zeile: <span className="font-mono">building_id</span>,{" "}
            <span className="font-mono">building_source</span> (gba/bev),{" "}
            <span className="font-mono">dataset_id</span>, <span className="font-mono">track</span>,{" "}
            <span className="font-mono">point_code</span>, <span className="font-mono">label</span>,{" "}
            <span className="font-mono">evidence</span> (Begründung inkl. Quelle und ggf.
            GE-3D-Screenshot), <span className="font-mono">labeled_by</span> und{" "}
            <span className="font-mono">date</span>.
          </p>
          <p>
            Zählweise: {corpus.buildingIds} verschiedene{" "}
            <span className="font-mono">building_id</span>s, aber {corpus.gebaeudePhysisch}{" "}
            physische Gebäude — der einzige BEV-Eintrag{" "}
            <span className="font-mono">{"{A9A7E442-…}"}</span> ist der als eigener BEV-Grundriss
            kartierte Anbau des GBA-Gebäudes 96959851. Labels sind quellen-stabil formuliert;
            bei Quellwechseln werden die IDs per Max-Overlap-Mapping migriert, Punktcode und
            Track bleiben stabil.
          </p>
          <p>Korpus-Entwicklung:</p>
          <ul className="grid list-disc gap-1.5 pl-5">
            {korpusHistorie.map((stand) => (
              <li key={stand.version}>
                <strong className="text-foreground">
                  v{stand.version} ({stand.datum}) — {stand.gebaeude} Gebäude / {stand.punkte}{" "}
                  Punkte:
                </strong>{" "}
                {stand.notiz}
              </li>
            ))}
          </ul>
        </>
      }
    >
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Der Korpus ist bewusst kein Zufallsquerschnitt: Er versammelt{" "}
        <strong>bestätigte Dachkerne</strong> als Schutz vor zu aggressiver Bereinigung,{" "}
        <strong>die geklärten Problemfälle</strong> (Anbau, Fremdreflektoren) als Schutz vor
        alten Fehlern — und auffällig viele <span className="font-mono">unclear</span>-Punkte,
        bei denen die Beweiskette nicht geschlossen werden konnte. Auch das ist Absicht: Ein
        erzwungenes Urteil wäre schlechter als ein dokumentiertes „wissen wir nicht". Jeder{" "}
        <GlossaryTerm term="referenzlabel">Eintrag</GlossaryTerm> unten ist echt — klicke ihn
        an und lies seine Begründung.
      </p>
      <CorpusExplorer />
    </Chapter>
  );
}
