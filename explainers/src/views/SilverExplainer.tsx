/**
 * Ansicht "Silver Ground Truth": erklärt, wie der interne
 * Referenzlabel-Korpus entsteht, was er enthält und wofür er verwendet wird.
 */
import { ExplainerShell } from "@/components/layout/ExplainerShell";
import { silverChapters } from "@/content/silverChapters";
import {
  SILVER_CORPUS_UPDATED,
  SILVER_CORPUS_VERSION,
  SILVER_LABELED_BY,
} from "@/content/silverFacts";
import { S0Warum } from "@/chapters/silver/S0Warum";
import { S1Label } from "@/chapters/silver/S1Label";
import { S2Korpus } from "@/chapters/silver/S2Korpus";
import { S3Benotung } from "@/chapters/silver/S3Benotung";
import { S4Verwendung } from "@/chapters/silver/S4Verwendung";
import { S5Grenzen } from "@/chapters/silver/S5Grenzen";

export default function SilverExplainer() {
  return (
    <ExplainerShell
      view="silver"
      chapters={silverChapters}
      railTitel="Die Silver Ground Truth"
      header={
        <header className="grid gap-4">
          <p className="section-title !mb-0">Interaktive Erklärung</p>
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight md:text-4xl">
            Silver Ground Truth: der Maßstab, an dem sich die Pipeline messen muss
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Diese Seite erklärt, wie der interne Referenzlabel-Korpus des Projekts entsteht,
            was er enthält und wie er jede Modelländerung automatisch benotet — inklusive der
            Fälle, an denen ein Release-Kandidat scheiterte. Sie ist getrennt von der
            produktiven Viewer-App.
          </p>
          <p className="flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full border border-border bg-card px-2.5 py-1 font-mono text-muted-foreground">
              reference_labels.json · v{SILVER_CORPUS_VERSION} · {SILVER_CORPUS_UPDATED}
            </span>
            <span className="rounded-full border border-border bg-card px-2.5 py-1 font-mono text-muted-foreground">
              {SILVER_LABELED_BY} — nicht expertenvalidiert
            </span>
          </p>
        </header>
      }
    >
      <S0Warum />
      <S1Label />
      <S2Korpus />
      <S3Benotung />
      <S4Verwendung />
      <S5Grenzen />
    </ExplainerShell>
  );
}
