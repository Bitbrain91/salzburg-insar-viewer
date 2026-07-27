/**
 * Kapitelregister des Explainers „Entstehung der InSAR-Datenpunkte".
 * Die IDs sind zugleich die Hash-Anker (#insar-aufnahme, #insar-punkte, ...)
 * für Deep-Links und Scroll-Spy.
 *
 * Konvention: Alle Explainer teilen sich einen flachen Hash-Namensraum —
 * IDs hier tragen deshalb das Präfix `insar-` und müssen disjunkt zu den IDs
 * in `chapters.ts` und `silverChapters.ts` bleiben. `viewFromHash()` in
 * `lib/router.ts` entscheidet anhand dieses Registers, welche Ansicht
 * gerendert wird. (Nicht verwechseln mit dem Glossar-Key `insar` — der lebt
 * in einem eigenen Namensraum.)
 *
 * Die Eyebrows kodieren die drei inhaltlichen Teile: A = SAR-Aufnahme,
 * B = vom Bild zum Punkt (Kern, vier Kapitel), C = Ungenauigkeiten.
 */
import type { ChapterMeta } from "./chapters";

export type InsarChapterId =
  | "insar-ueberblick"
  | "insar-aufnahme"
  | "insar-phase"
  | "insar-stoerungen"
  | "insar-punkte"
  | "insar-referenz"
  | "insar-lage"
  | "insar-geometrie"
  | "insar-sensoren";

export const insarChapters: ChapterMeta<InsarChapterId>[] = [
  {
    id: "insar-ueberblick",
    nummer: 0,
    eyebrow: "Start",
    titel: "Vom Orbit zum Messpunkt — die ganze Kette auf einen Blick",
    kurz: "Überblick",
    lead:
      "Jeder Punkt im Viewer ist das Endprodukt einer langen Kette: Radarpulse aus dem Orbit, " +
      "komplexe Bildmatrizen, ein Stapel von Aufnahmen über Jahre, statistische Punktauswahl. " +
      "Diese Seite geht die Kette Station für Station durch — damit klar ist, was ein Punkt " +
      "aussagt und was nicht.",
  },
  {
    id: "insar-aufnahme",
    nummer: 1,
    eyebrow: "Teil A",
    titel: "Radar im Orbit: wie ein SAR-Bild entsteht",
    kurz: "SAR-Aufnahme",
    lead:
      "Ein SAR-Satellit beleuchtet die Erde schräg von der Seite und misst je Bildzelle zwei " +
      "Dinge: wie stark das Echo ist (Amplitude) und in welcher Schwingungslage es zurückkommt " +
      "(Phase). Die Zellgröße entscheidet, wie viele Objekte sich ein Pixel teilen müssen — " +
      "bei Sentinel-1 und TerraSAR-X sehr unterschiedlich.",
  },
  {
    id: "insar-phase",
    nummer: 2,
    eyebrow: "Teil B · 1",
    titel: "Die Phase als Maßband: Millimeter aus 700 km Höhe",
    kurz: "Phase",
    lead:
      "Die Phase wirkt wie ein Maßband mit Millimeterteilung: Verschiebt sich ein Reflektor um " +
      "Bruchteile der Wellenlänge, verschiebt sich die Phase messbar. Zwei Aufnahmen ergeben " +
      "ein Interferogramm — und die Wellenlänge des Sensors bestimmt, wie fein die Teilung ist.",
  },
  {
    id: "insar-stoerungen",
    nummer: 3,
    eyebrow: "Teil B · 2",
    titel: "Das Phasen-Puzzle: Störanteile, Abwicklung, Mehrdeutigkeit",
    kurz: "Störanteile",
    lead:
      "In der gemessenen Phase steckt nicht nur Bewegung: Topografie, Atmosphäre und Rauschen " +
      "mischen mit, und die Phase ist nur modulo einer halben Wellenlänge bekannt. Wie die " +
      "Verarbeitung die Anteile trennt — und warum schnelle Bewegung an einem isolierten Ziel " +
      "verloren geht.",
  },
  {
    id: "insar-punkte",
    nummer: 4,
    eyebrow: "Teil B · Kern",
    titel: "Vom Bildstapel zum Punkt: wer PS oder DS wird — und wer nicht",
    kurz: "PS & DS",
    lead:
      "Aus Millionen Bildzellen werden nur jene zu Messpunkten, deren Echo über den ganzen " +
      "Stapel (mindestens 15–20 Szenen) stabil bleibt: punktförmige Permanent Scatterer an " +
      "Gebäuden und Fels, flächige Distributed Scatterer auf homogenem Boden. Wiese und Wald " +
      "liefern kaum etwas, Wasser nichts — deshalb sind Punkte kein Raster, sondern ein " +
      "Glücksmuster der Physik.",
  },
  {
    id: "insar-referenz",
    nummer: 5,
    eyebrow: "Teil B · 3",
    titel: "Alles ist relativ: Referenzpunkt, Zeitreihe, Einschwingzeit",
    kurz: "Referenz",
    lead:
      "Kein InSAR-Punkt misst absolut: Jede Zeitreihe ist doppelt differenziell — relativ zu " +
      "einem als unbeweglich angenommenen Referenzpunkt und relativ zur ersten Aufnahme. Und " +
      "die Präzision der Rate ist nicht sofort da, sie konvergiert erst über Monate von Aufnahmen.",
  },
  {
    id: "insar-lage",
    nummer: 6,
    eyebrow: "Teil C · 1",
    titel: "Wo liegt der Punkt wirklich? XY-Streuung, Höhe, Phasenzentrum",
    kurz: "Lage & Höhe",
    lead:
      "Die Koordinaten eines Punkts sind selbst Schätzwerte: Die XY-Lage streut sensorabhängig " +
      "um Meter, die Höhenzahl entsteht aus Laufzeit, Geländemodell und einem Phasen-Fit über " +
      "den Bildstapel, und das Phasenzentrum eines Echos muss nicht am sichtbaren Objekt " +
      "liegen. Woher die Höhe kommt, welche Rolle das Geländemodell spielt — und warum ein " +
      "„Dachpunkt“ neben dem Grundriss stehen kann.",
  },
  {
    id: "insar-geometrie",
    nummer: 7,
    eyebrow: "Teil C · 2",
    titel: "Schrägsicht-Effekte: Layover, Schatten und die 1D-Blickrichtung",
    kurz: "Geometrie",
    lead:
      "Die Schrägsicht verzerrt die Welt: Hänge und Hochbauten werden gestaucht, umgeklappt " +
      "oder verschattet — und gemessen wird immer nur die eine Komponente entlang der " +
      "Blicklinie. Nord–Süd ist das Radar fast blind; erst zwei Blickrichtungen ergeben ein 2D-Bild.",
  },
  {
    id: "insar-sensoren",
    nummer: 8,
    eyebrow: "Vergleich",
    titel: "Sentinel-1 und TerraSAR-X konkret — und die Salzburger Datensätze",
    kurz: "Sensoren",
    lead:
      "Alle Zahlen nebeneinander: Wellenlänge, Zellgröße, Wiederkehr, Genauigkeiten und " +
      "Punktdichte für Sentinel-1 und TerraSAR-X — plus Steckbriefe der realen Salzburger " +
      "Datensätze, mit denen der Viewer arbeitet.",
  },
];

export const insarChapterById: Record<InsarChapterId, ChapterMeta<InsarChapterId>> =
  Object.fromEntries(insarChapters.map((chapter) => [chapter.id, chapter])) as Record<
    InsarChapterId,
    ChapterMeta<InsarChapterId>
  >;
