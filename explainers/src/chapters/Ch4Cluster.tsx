import { Chapter } from "@/components/layout/Chapter";
import { GlossaryTerm } from "@/components/GlossaryTerm";
import { chapterById } from "@/content/chapters";
import { ClusteringBranchDemo } from "./diagrams/ClusteringBranchDemo";

export function Ch4Cluster() {
  return (
    <Chapter
      meta={chapterById.cluster}
      techDetails={
        <>
          <p>
            Das Clustering läuft je <span className="font-mono">Gebäude × Track</span> auf dem
            Main-Set (kept-Punkte; als Bauteil-/Fremdkandidat markierte Punkte werden erst nach dem
            Clustering in ihre annex-/foreign-Cluster umetikettiert — „Peel after Clustering", so
            behalten die Hauptdach-Kerne exakt ihre Rollen).
          </p>
          <p>
            <GlossaryTerm term="hdbscan">HDBSCAN</GlossaryTerm> ist Pflichtdependency — es gibt
            keinen stillen Fallback auf andere Verfahren. Featurematrix: Längs-/Quer-Versatz,
            Höhenrang, Geschwindigkeit, Beschleunigung, Kohärenz-Malus; robust skaliert
            (Quantile 15–85) und gewichtet (1,10 / 1,00 / 0,75 / 1,30 / 0,90 / 0,80).
            Findet HDBSCAN keinen Cluster, wird ab 3 Punkten ein einzelner Cluster erzwungen
            (coerce_single_cluster); grenzwertige Noise-Punkte werden zurückgeholt, wenn lokale
            Abweichung ≤ 0,75, Kohärenz ≥ 0,45 und die Zuordnung es rechtfertigen.
          </p>
          <p>
            <GlossaryTerm term="smallN">Small-N</GlossaryTerm>-Fallback (smalln_strict):
            Velocity-Konsistenz <span className="font-mono">|v − median| ≤ max(1 | 2 · velocity_std)</span>{" "}
            für mindestens 2 Punkte, sonst <span className="font-mono">weak_support</span> mit
            Wahrscheinlichkeit 0,30. Core-/Noise-Split anhand des lokalen Abweichungsscores
            (Schwelle 0,80). Alle Small-N-Punkte tragen das Flag{" "}
            <span className="font-mono">small_n_fallback</span>.
          </p>
          <p>
            Mögliche <GlossaryTerm term="clusterRole">Cluster-Rollen</GlossaryTerm> nach dieser
            Stufe: <span className="font-mono">core</span>, <span className="font-mono">noise</span>
            , <span className="font-mono">weak_support</span>,{" "}
            <span className="font-mono">insufficient_support</span>; Gate-ausgeschlossene Punkte
            führen <span className="font-mono">excluded</span>.
          </p>
        </>
      }
    >
      <ClusteringBranchDemo />
    </Chapter>
  );
}
