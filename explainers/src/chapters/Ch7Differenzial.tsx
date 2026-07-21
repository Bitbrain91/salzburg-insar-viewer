import { Chapter } from "@/components/layout/Chapter";
import { GlossaryTerm } from "@/components/GlossaryTerm";
import { chapterById } from "@/content/chapters";
import { differential } from "@/content/facts";
import { DifferentialStepper } from "./diagrams/DifferentialStepper";

export function Ch7Differenzial() {
  return (
    <Chapter
      meta={chapterById.differenzial}
      techDetails={
        <>
          <p>
            Zulässige Sekundärcluster: Rolle core, mindestens {differential.secondaryMinPoints}{" "}
            Punkte, nicht der Hauptcluster — Fremd-Cluster (foreign, weak_support) sind damit
            per Konstruktion ausgeschlossen; Anbau-Cluster (annex_0, core) können eine
            Differentialaussage tragen. Je Sekundärcluster wird das <em>signierte</em> Delta seines
            medianen Vertikal-Proxys zum Hauptcluster genau einmal bewertet; das beste Ergebnis
            (höchste Stufe, dann größtes |Δ|) bestimmt das Gebäude-Level.
          </p>
          <p>
            <GlossaryTerm term="sigma">Sigma</GlossaryTerm> ist analytisch:{" "}
            <span className="font-mono">σ_Δ = hypot(se_Main, se_Sekundär)</span> mit{" "}
            <span className="font-mono">se = 1,253 · max(1,4826 · MAD | noise_floor) / √n</span>{" "}
            (1,253 = √(π/2), hebt vom Median- auf den Mittelwert-Standardfehler). Signifikanz
            verlangt zusätzlich mindestens {differential.minPointsForSignificance} Punkte je
            Cluster — ein MAD aus 2 Werten ist nicht belastbar (small_n_guard).
          </p>
          <p>
            Downgrades (je −1 Stufe, Floor „Kandidat"):{" "}
            <span className="font-mono">small_n_guard</span>,{" "}
            <span className="font-mono">season_amp_mismatch</span> (Saisonamplituden-Differenz
            &gt; {String(differential.seasonAmpMismatchThreshold).replace(".", ",")}),{" "}
            <span className="font-mono">unstable_amplitude</span> (Amplituden-Variation über dem
            Track-p95). Die Evidenz (Track, Cluster, Δ, σ, Schwelle, bestätigender Track,
            Downgrades) wird als <span className="font-mono">differential_motion_evidence</span>{" "}
            gespeichert und im Viewer angezeigt.
          </p>
          <p>
            Läufe vor Einführung des Levels liefern <span className="font-mono">null</span> —
            „historischer Modellstand", bewusst nicht dasselbe wie{" "}
            <span className="font-mono">none</span>. Ab Stufe „signifikant" kostet das Level 0,15
            Zuverlässigkeit (Station 8). Die Anzeigefarben sind bewusst orange, nicht rot — es ist
            ein Forschungsbefund, keine Schadensaussage.
          </p>
        </>
      }
    >
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Setzt sich ein Gebäudeteil anders als der Rest? Das{" "}
        <GlossaryTerm term="differentialLevel">Differential-Level</GlossaryTerm> beantwortet das in
        vier Stufen — von „überschreitet die Schwelle" bis „von der zweiten Blickrichtung
        bestätigt". Plausibilitätszweifel stufen herab, können einen gültigen Kandidaten aber nie
        ganz löschen. Stelle die Regler und beobachte den Entscheidungsweg.
      </p>
      <DifferentialStepper />
    </Chapter>
  );
}
