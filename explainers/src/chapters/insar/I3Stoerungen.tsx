/**
 * Kapitel 3 (Teil B·2): Störanteile, Phasenabwicklung, Mehrdeutigkeit.
 * Zwei Diagramme (PhaseBudgetMixer, AliasingDemo) plus eine kompakte
 * Inline-Grafik zur Abwicklung (bewusst KEIN eigenes Diagramm-Modul).
 */
import { Chapter } from "@/components/layout/Chapter";
import { GlossaryTerm } from "@/components/GlossaryTerm";
import { insarChapterById } from "@/content/insarChapters";
import { aliasingLimitMm, coherence, FOOTNOTES } from "@/content/insarFacts";
import { formatNumber } from "@/lib/format";
import { tokens } from "@/lib/designTokens";
import { PhaseBudgetMixer } from "./diagrams/PhaseBudgetMixer";
import { AliasingDemo } from "./diagrams/AliasingDemo";
import { DiagramFrame, ScopeBadge, goToAnchor } from "./insarUi";

/* Kompakte Inline-Illustration der Abwicklung (statisch, deterministisch). */
const UW = 440;
const UH = 132;
const U_L = 12;
const U_R = 12;
const U_T = 16;
const U_B = 22;
const U_PLOT_W = UW - U_L - U_R;
const U_PLOT_H = UH - U_T - U_B;
const WRAPS = 3;
const TOTAL_PHASE = WRAPS * 2 * Math.PI;
const UNWRAP_STEPS = 200;

const TRUE_COLOR = tokens.series.displacement;
const WRAP_COLOR = tokens.reliability.medium;

function unwrapY(phase: number): number {
  return U_T + U_PLOT_H * (1 - phase / TOTAL_PHASE);
}
function unwrapX(t: number): number {
  return U_L + t * U_PLOT_W;
}

export function I3Stoerungen() {
  const unwrappedLine = `${unwrapX(0).toFixed(1)},${unwrapY(0).toFixed(1)} ${unwrapX(1).toFixed(
    1
  )},${unwrapY(TOTAL_PHASE).toFixed(1)}`;
  const wrappedPoints = Array.from({ length: UNWRAP_STEPS + 1 }, (_, i) => {
    const t = i / UNWRAP_STEPS;
    const phase = t * TOTAL_PHASE;
    const wrapped = phase % (2 * Math.PI);
    return `${unwrapX(t).toFixed(1)},${unwrapY(wrapped).toFixed(1)}`;
  }).join(" ");

  return (
    <Chapter
      meta={insarChapterById["insar-stoerungen"]}
      techDetails={
        <>
          <p>
            Modell der interferometrischen Phase:{" "}
            <span className="font-mono">φ = Deformation + Topografie(+ε) + Atmosphäre + Rauschen</span>{" "}
            (TRE §11.2.1, S. 59; §11.3, S. 61). Der Topografie-Anteil wird mit einem Höhenmodell
            subtrahiert, sein Restfehler ε im Bildstapel mitgeschätzt; die Atmosphäre über den
            Multi-Interferogramm-Stapel (APS-Prinzip, §11.5, S. 64).
          </p>
          <p>
            <GlossaryTerm term="unwrapping">Abwicklung</GlossaryTerm>: Die Phase ist nur als Rest
            modulo 2π bekannt. Die Rekonstruktion der vollen Zyklen nimmt an, dass benachbarte
            Werte weniger als π auseinanderliegen — ein schlecht gestelltes Problem, das nur relativ
            zum <GlossaryTerm term="referenzpunkt">Referenzpunkt</GlossaryTerm> lösbar ist (TRE
            §11.3.1, S. 62). Deshalb misst InSAR nie absolut.
          </p>
          <p>
            Die <GlossaryTerm term="coherence">Kohärenz</GlossaryTerm> eines einzelnen
            Interferogramms unter {formatNumber(coherence.interferogramUnreliableBelow, 1)} gilt
            als unzuverlässig; Hauptursache ist Vegetation (TRE §11.2.2, S. 60). Nicht zu
            verwechseln mit dem gelieferten Punkt-Attribut coherence — einem Skalar über den
            ganzen Stapel (TRE S. 15 f.).
          </p>
          <p>
            Mehrdeutigkeit (Aliasing): Pro Aufnahme-Intervall darf die Bewegung eines isolierten
            Ziels höchstens λ/4 betragen (TRE §2.1.1.3, S. 16–17). Das sind für Sentinel-1{" "}
            {formatNumber(aliasingLimitMm("s1"), 1)} mm, für TerraSAR-X{" "}
            {formatNumber(aliasingLimitMm("tsx"), 1)} mm. Räumlich korrelierte Bewegung ist bei
            dichter Punktbelegung auch darüber hinaus auflösbar (TRE S. 17 f., Fig. 7).
          </p>
          <p className="border-l-2 border-border pl-3 text-[13px]">
            <span className="font-semibold text-foreground">Quellen-Fußnote λ/2 vs. λ/4:</span>{" "}
            {FOOTNOTES.aliasingProse}
          </p>
        </>
      }
    >
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Die gemessene <GlossaryTerm term="phase">Phase</GlossaryTerm> eines{" "}
        <GlossaryTerm term="interferogramm">Interferogramms</GlossaryTerm> enthält nicht nur die
        gesuchte Bodenbewegung — sie ist eine Summe aus vier Anteilen, und die Verarbeitung muss
        sie trennen. Der am wenigsten intuitive ist die Topografie: Die zwei Aufnahmen entstehen
        nie von exakt derselben Position im Orbit (der kleine Versatz heißt{" "}
        <GlossaryTerm term="baseline">Baseline</GlossaryTerm>). Dadurch blickt der Satellit beim
        zweiten Mal minimal anders auf das Gelände — und ein Höhenunterschied erzeugt dann einen
        Phasenunterschied, <em>auch wenn sich nichts bewegt hat</em>. Diesen Anteil rechnet die
        Verarbeitung mit einem bekannten Höhenmodell (DEM) heraus. Weil das Höhenmodell aber
        selbst nicht perfekt ist — es kennt z. B. nicht die exakte Höhe jeder Dachkante —, bleibt
        ein kleiner Rest übrig: der Höhenmodell-Restfehler ε, den die Verarbeitung erst im
        Bildstapel je Punkt mitschätzen kann. Merk dir dieses ε — aus genau dieser Schätzung
        entsteht später die gelieferte{" "}
        <button
          type="button"
          onClick={() => goToAnchor("insar-lage")}
          className="font-medium text-primary underline underline-offset-2"
        >
          Punkthöhe (Kapitel 6)
        </button>
        . Dazu kommen die atmosphärische Verzögerung und das Rauschen:
      </p>

      <DiagramFrame id="phaseBudget">

        <PhaseBudgetMixer />

      </DiagramFrame>

      {/* Abwicklung: kompakte Inline-Illustration */}
      <div className="grid gap-2 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Phasenabwicklung (Unwrapping)
          </p>
          <ScopeBadge scope="allgemein" detail="mod 2π" />
        </div>
        <svg
          viewBox={`0 0 ${UW} ${UH}`}
          role="img"
          aria-label="Gemessene Phase modulo 2π gegen die abgewickelte, echte Phase"
          className="w-full rounded-md border border-border bg-background"
        >
          {/* Wickel-Ebenen bei Vielfachen von 2π */}
          {[1, 2].map((level) => (
            <g key={level}>
              <line
                x1={U_L}
                y1={unwrapY(level * 2 * Math.PI)}
                x2={U_L + U_PLOT_W}
                y2={unwrapY(level * 2 * Math.PI)}
                stroke="hsl(var(--border))"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <text
                x={U_L + U_PLOT_W}
                y={unwrapY(level * 2 * Math.PI) - 3}
                textAnchor="end"
                fontSize={8.5}
                className="fill-current text-muted-foreground"
              >
                {level * 2}π
              </text>
            </g>
          ))}
          {/* gemessen (mod 2π): Sägezahn */}
          <polyline points={wrappedPoints} fill="none" stroke={WRAP_COLOR} strokeWidth={1.6} />
          {/* abgewickelt: echte, ansteigende Phase */}
          <polyline points={unwrappedLine} fill="none" stroke={TRUE_COLOR} strokeWidth={2.2} />
          <text x={U_L + 6} y={U_T + 4} fontSize={9} className="fill-current" fill={TRUE_COLOR}>
            abgewickelt (echte Phase)
          </text>
          <text
            x={U_L + 6}
            y={unwrapY(0) - 5}
            fontSize={9}
            className="fill-current"
            fill={WRAP_COLOR}
          >
            gemessen (mod 2π)
          </text>
        </svg>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Der Sensor liefert nur den Sägezahn — die Phase springt bei jedem vollen Umlauf zurück.
          Die Abwicklung addiert die fehlenden Zyklen wieder auf, unter der Annahme, dass Nachbarn
          nah beieinanderliegen. Weil sich die vollen Umläufe nicht absolut bestimmen lassen, ist
          jede Zeitreihe nur relativ zu einem Referenzpunkt gültig — nie absolut.
        </p>
      </div>

      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Diese Mehrdeutigkeit hat eine physikalische Grenze:{" "}
        <GlossaryTerm term="aliasing">Bewegt sich ein Ziel</GlossaryTerm> zwischen zwei Aufnahmen um
        ein Viertel der Wellenlänge (λ/4) oder mehr, lässt sich der wahre Umlauf{" "}
        <strong className="text-foreground">an diesem Ziel allein</strong> nicht mehr
        rekonstruieren. Das ist kein universelles Messlimit: Ist die Bewegung räumlich korreliert
        und die Punktdichte hoch, kann die Abwicklung über die Nachbarschaft auch schnellere
        Bewegung auflösen (TRE S. 17 f.). Für ein isoliertes Einzelziel aber gilt die Grenze —
        und wo sie liegt, hängt vom Sensor ab.
      </p>

      <DiagramFrame id="aliasing">

        <AliasingDemo />

      </DiagramFrame>
    </Chapter>
  );
}
