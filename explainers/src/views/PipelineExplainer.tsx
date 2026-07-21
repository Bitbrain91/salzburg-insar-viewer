/**
 * Ansicht "Pipeline-Reise": die interaktive Erklärung der aktiven
 * ML-Pipeline in zehn Kapiteln (vormals direkt in App.tsx).
 */
import { ExplainerShell } from "@/components/layout/ExplainerShell";
import { chapters } from "@/content/chapters";
import { MODEL_SET_VERSION, PIPELINE_NAME } from "@/content/facts";
import { Ch0Einfuehrung } from "@/chapters/Ch0Einfuehrung";
import { Ch1Zuordnung } from "@/chapters/Ch1Zuordnung";
import { Ch2Qualitaet } from "@/chapters/Ch2Qualitaet";
import { Ch3Trennung } from "@/chapters/Ch3Trennung";
import { Ch4Cluster } from "@/chapters/Ch4Cluster";
import { Ch5Bewertung } from "@/chapters/Ch5Bewertung";
import { Ch6Bewegung } from "@/chapters/Ch6Bewegung";
import { Ch7Differenzial } from "@/chapters/Ch7Differenzial";
import { Ch8Zuverlaessigkeit } from "@/chapters/Ch8Zuverlaessigkeit";
import { Ch9Befund } from "@/chapters/Ch9Befund";

export default function PipelineExplainer() {
  return (
    <ExplainerShell
      view="pipeline"
      chapters={chapters}
      railTitel="Die Pipeline-Reise"
      header={
        <header className="grid gap-4">
          <p className="section-title !mb-0">Interaktive Erklärung</p>
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight md:text-4xl">
            Vom Radarpunkt zum Gebäudebefund: die Reise durch die ML-Pipeline
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Diese Seite erklärt die aktive Analyse-Pipeline des Salzburg InSAR Viewers —
            Schritt für Schritt, mit interaktiven Diagrammen und den exakten Regeln aus dem
            Quellcode. Sie ist getrennt von der produktiven Viewer-App.
          </p>
          <p className="flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full border border-border bg-card px-2.5 py-1 font-mono text-muted-foreground">
              {PIPELINE_NAME}
            </span>
            <span className="rounded-full border border-border bg-card px-2.5 py-1 font-mono text-muted-foreground">
              {MODEL_SET_VERSION}
            </span>
          </p>
        </header>
      }
    >
      <Ch0Einfuehrung />
      <Ch1Zuordnung />
      <Ch2Qualitaet />
      <Ch3Trennung />
      <Ch4Cluster />
      <Ch5Bewertung />
      <Ch6Bewegung />
      <Ch7Differenzial />
      <Ch8Zuverlaessigkeit />
      <Ch9Befund />
    </ExplainerShell>
  );
}
