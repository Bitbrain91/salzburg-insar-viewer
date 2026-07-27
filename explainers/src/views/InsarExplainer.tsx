/**
 * Ansicht "Entstehung der InSAR-Datenpunkte": erklärt den Weg von der
 * Radarmessung im Orbit über SAR-Aufnahmen und den Bildstapel bis zum
 * einzelnen Messpunkt — inklusive der Fehlerquellen und der
 * Sensor-Unterschiede Sentinel-1 / TerraSAR-X.
 */
import { ExplainerShell } from "@/components/layout/ExplainerShell";
import { insarChapters } from "@/content/insarChapters";
import { SOURCES } from "@/content/insarFacts";
import { I0Ueberblick } from "@/chapters/insar/I0Ueberblick";
import { I1Aufnahme } from "@/chapters/insar/I1Aufnahme";
import { I2Phase } from "@/chapters/insar/I2Phase";
import { I3Stoerungen } from "@/chapters/insar/I3Stoerungen";
import { I4Punkte } from "@/chapters/insar/I4Punkte";
import { I5Referenz } from "@/chapters/insar/I5Referenz";
import { I6Lage } from "@/chapters/insar/I6Lage";
import { I7Geometrie } from "@/chapters/insar/I7Geometrie";
import { I8Sensoren } from "@/chapters/insar/I8Sensoren";

export default function InsarExplainer() {
  return (
    <ExplainerShell
      view="insar"
      chapters={insarChapters}
      railTitel="Vom Orbit zum Punkt"
      header={
        <header className="grid gap-4">
          <p className="section-title !mb-0">Interaktive Erklärung</p>
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight md:text-4xl">
            Entstehung der InSAR-Datenpunkte: vom Radarpuls zum Messpunkt
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Diese Seite erklärt, wie die Punkte im Viewer physikalisch entstehen — von der
            SAR-Aufnahme über die Phasenmessung und den Bildstapel bis zur Punktauswahl — und
            warum Lage, Höhe und Bewegung jedes Punkts Schätzwerte mit bekannten Grenzen sind.
            Aussagen sind durchgängig als allgemeingültig oder sensorspezifisch (Sentinel-1 /
            TerraSAR-X) gekennzeichnet.
          </p>
          <p className="flex flex-wrap gap-2 text-[11px]">
            {[SOURCES.tre, SOURCES.aug, SOURCES.report, SOURCES.inventar].map((source) => (
              <span
                key={source.datei}
                className="rounded-full border border-border bg-card px-2.5 py-1 font-mono text-muted-foreground"
                title={source.datei}
              >
                {source.kurz} · {source.rolle}
              </span>
            ))}
          </p>
        </header>
      }
    >
      <I0Ueberblick />
      <I1Aufnahme />
      <I2Phase />
      <I3Stoerungen />
      <I4Punkte />
      <I5Referenz />
      <I6Lage />
      <I7Geometrie />
      <I8Sensoren />
    </ExplainerShell>
  );
}
