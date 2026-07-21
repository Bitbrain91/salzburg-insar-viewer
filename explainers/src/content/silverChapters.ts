/**
 * Kapitelregister des Silver-Ground-Truth-Explainers. Die IDs sind zugleich
 * die Hash-Anker (#silver-warum, #silver-korpus, ...) für Deep-Links und
 * Scroll-Spy.
 *
 * Konvention: Pipeline-Reise und Silver-Explainer teilen sich einen
 * Hash-Namensraum — alle IDs hier tragen deshalb das Präfix `silver-` und
 * müssen disjunkt zu den IDs in `chapters.ts` bleiben. `viewFromHash()` in
 * `lib/router.ts` entscheidet anhand dieses Registers, welche Ansicht
 * gerendert wird.
 */
import type { ChapterMeta } from "./chapters";

export type SilverChapterId =
  | "silver-warum"
  | "silver-label"
  | "silver-korpus"
  | "silver-benotung"
  | "silver-verwendung"
  | "silver-grenzen";

export const silverChapters: ChapterMeta<SilverChapterId>[] = [
  {
    id: "silver-warum",
    nummer: 0,
    eyebrow: "Start",
    titel: "Woher weiß man, ob die Pipeline richtig liegt?",
    kurz: "Warum Referenz?",
    lead:
      "Eine Pipeline, die Punkte zuordnet und Gebäude bewertet, braucht einen Maßstab: bestätigte " +
      "Fälle, an denen sich jede Änderung messen lassen muss. Weil unabhängige Expertenlabels noch " +
      "fehlen, führt das Projekt eine intern erhobene, ehrlich als solche deklarierte " +
      "„Silver Ground Truth“.",
  },
  {
    id: "silver-label",
    nummer: 1,
    eyebrow: "Station 1",
    titel: "Wie entsteht ein einzelnes Label?",
    kurz: "Label-Entstehung",
    lead:
      "Kein Punkt bekommt ein Urteil ohne dokumentierte Evidenz: Visual Audit, Survivors-Scan oder " +
      "User-Befund liefern den Verdacht, die Google-Earth-3D-Prüfung entscheidet über die bauliche " +
      "Verbindung — und wer nicht sicher ist, sagt ehrlich „unclear“.",
  },
  {
    id: "silver-korpus",
    nummer: 2,
    eyebrow: "Station 2",
    titel: "Was steckt im Korpus?",
    kurz: "Der Korpus",
    lead:
      "46 gelabelte Punkte an 10 Gebäuden in Salzburg und Bad Gastein — Dachkerne, zwei bestätigte " +
      "Anbauten, zehn Fremdreflektoren und bewusst viele unklare Fälle. Jede Zeile trägt ihre " +
      "Begründung, ihr Datum und ihre Quelle mit sich.",
  },
  {
    id: "silver-benotung",
    nummer: 3,
    eyebrow: "Station 3",
    titel: "Wie benotet der Harness einen Pipeline-Lauf?",
    kurz: "Benotung",
    lead:
      "Feste Test-Gebiete, bitgenau reproduzierbare Vergleichsläufe und eine automatische Benotung " +
      "jedes gelabelten Punkts: Aus Soll-Label und Ist-Zustand entsteht ein Verdict — und manche " +
      "Verdicts stellen die gesamte Auswertung sofort auf Rot.",
  },
  {
    id: "silver-verwendung",
    nummer: 4,
    eyebrow: "Station 4",
    titel: "Wofür werden die Ergebnisse verwendet?",
    kurz: "Verwendung",
    lead:
      "Scorecards und Referenzfälle entscheiden mit, ob eine Modelländerung integriert wird — und " +
      "ob ein Release-Kandidat akzeptiert wird. Beim v4-Stand blieb das Gate trotz vieler grüner " +
      "Prüfungen auf Rot: zwei Fälle waren fachlich nicht geklärt.",
  },
  {
    id: "silver-grenzen",
    nummer: 5,
    eyebrow: "Ziel",
    titel: "Was die Silver Ground Truth kann — und was nicht",
    kurz: "Grenzen",
    lead:
      "Der Korpus schützt vor Regressionen und macht Änderungen benotbar. Er ist aber klein, " +
      "intern erhoben und nicht unabhängig geprüft — der Weg zur „Gold“-Referenz führt über " +
      "Expertenlabels, Holdout-Gebiete und kalibrierte Zuverlässigkeit.",
  },
];

export const silverChapterById: Record<SilverChapterId, ChapterMeta<SilverChapterId>> =
  Object.fromEntries(silverChapters.map((chapter) => [chapter.id, chapter])) as Record<
    SilverChapterId,
    ChapterMeta<SilverChapterId>
  >;
