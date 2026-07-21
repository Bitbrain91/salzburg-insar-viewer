import { Chapter } from "@/components/layout/Chapter";
import { FindingCard } from "@/components/ui/insights";
import { chapterById } from "@/content/chapters";
import { VerdictAnatomy } from "./diagrams/VerdictAnatomy";

const CHECKLISTE: Array<{ frage: string; hinweis: string }> = [
  {
    frage: "Ist der Status belastbar?",
    hinweis:
      "„Belastbar“ (ok) trägt eine Aussage; „Nur ein Track“, „Wenige Punkte“, „Rauschdominiert“ oder „Zu wenig Datenpunkte“ verlangen Zurückhaltung.",
  },
  {
    frage: "Was sagt das Zuverlässigkeitsband — und warum?",
    hinweis:
      "Nicht nur hoch/mittel/gering lesen, sondern die Gründe im Panel „Warum diese Bewertung?“ prüfen: Jeder Abzug ist dort benannt.",
  },
  {
    frage: "Sind sich beide Blickrichtungen einig?",
    hinweis:
      "Eine hohe Track-Übereinstimmung stützt den Befund; Widerspruch (Spannungs-Flag) heißt: Einzelwerte nicht überinterpretieren.",
  },
  {
    frage: "Welches Differential-Level liegt vor — mit welcher Evidenz?",
    hinweis:
      "„Kandidat“ ist ein Hinweis, kein Beleg. Erst „signifikant“/„bestätigt“ sind statistisch bzw. durch die zweite Geometrie gestützt; leer = historischer Lauf ohne Level.",
  },
  {
    frage: "Wer trägt die Aussage — Hauptdach, Anbau oder Fremdreflektor?",
    hinweis:
      "Nur Standardcluster tragen die Gebäudebewegung. Ein Anbau kann eine Differentialaussage tragen; Fremdreflektoren nie — sie sind nur sichtbarer Kontext.",
  },
];

export function Ch9Befund() {
  return (
    <Chapter
      meta={chapterById.befund}
      techDetails={
        <>
          <p>
            Vokabular-Brücke in den Viewer: <span className="font-mono">standard</span> →
            „Standardcluster", <span className="font-mono">annex</span> → „Bauteil / Anbau",{" "}
            <span className="font-mono">foreign</span> → „Fremdreflektor";{" "}
            <span className="font-mono">none</span> → „keine",{" "}
            <span className="font-mono">candidate</span> → „Kandidat",{" "}
            <span className="font-mono">significant</span> → „signifikant",{" "}
            <span className="font-mono">confirmed</span> → „bestätigt". In der Gebäudeansicht des
            Viewers gehören dazu: schwarzer Gebäudeumriss, blaue/orange Kandidatenflächen je
            Blickrichtung, Cluster-Hüllen, farbige Kernpunkte, rote Noise-Punkte und graue
            Gate-ausgeschlossene Punkte.
          </p>
          <p>
            Aussagegrenzen der Plattform: keine Diagnose von Gebäudeschäden oder Rissen, keine
            statische oder bautechnische Begutachtung, keine kalibrierte
            Schadenswahrscheinlichkeit, keine garantierte Prognose künftiger Bewegung, keine
            ungeprüfte Übertragbarkeit auf andere Gebiete oder Sensoren. Jeder Befund gilt für den
            konkreten Lauf-, Modell- und Datenstand — die visuelle Prüfung ist Teil der Methode.
          </p>
        </>
      }
    >
      <VerdictAnatomy />
      <div className="grid gap-2">
        <p className="section-title !mb-0">Lese-Checkliste: fünf Fragen vor jeder Interpretation</p>
        {CHECKLISTE.map((item, index) => (
          <FindingCard
            key={item.frage}
            tone="neutral"
            label={`${index + 1}. ${item.frage}`}
            detail={item.hinweis}
          />
        ))}
        <FindingCard
          tone="warning"
          label="Und immer gilt"
          detail="Die Plattform erklärt Befunde und macht Modellentscheidungen prüfbar — sie diagnostiziert keine Gebäudeschäden."
        />
      </div>
    </Chapter>
  );
}
