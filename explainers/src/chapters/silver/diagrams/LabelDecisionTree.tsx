/**
 * Durchklickbarer Entscheidungsbaum der Label-Erhebung — entlang der realen
 * Regeln aus `reference_labels.md` (repliziert in `silverFacts.ts`):
 * Evidenz-Pflicht (Regel 1), Anti-Layover als harte physikalische Prüfung,
 * Google-Earth-3D-Pflichtcheck (seit 2026-07-07) und die ehrliche
 * Restklasse unclear (Regel 2).
 */
import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { FindingCard } from "@/components/ui/insights";
import { GlossaryTerm } from "@/components/GlossaryTerm";
import { labelSemantik, type SilverLabel } from "@/content/silverFacts";
import { LabelBadge } from "../silverUi";

type StepId = "evidenz" | "dachkern" | "antilayover" | "ge3d";

type Answer = { step: StepId; wahl: string };

type StepDef = {
  id: StepId;
  frage: string;
  hinweis: string;
  optionen: { wahl: string; naechster?: StepId; ergebnis?: SilverLabel | "kein_label" }[];
};

const STEPS: Record<StepId, StepDef> = {
  evidenz: {
    id: "evidenz",
    frage: "Gibt es dokumentierte Evidenz für ein Urteil über diesen Punkt?",
    hinweis:
      "Visual-Audit-Report, Survivors-Scan, User-Befund oder DB-Recheck — Regel 1 verbietet Ad-hoc-Urteile.",
    optionen: [
      { wahl: "Ja, Evidenz liegt vor", naechster: "dachkern" },
      { wahl: "Nein", ergebnis: "kein_label" },
    ],
  },
  dachkern: {
    id: "dachkern",
    frage: "Ist der Punkt ein bestätigter Dachkern?",
    hinweis:
      "Typische Belege: within-Zuordnung auf dem Grundriss, Kern des Hauptclusters in einem persistierten Lauf, Visual Audit sauber.",
    optionen: [
      { wahl: "Ja, bestätigter Dachkern", ergebnis: "roof" },
      { wahl: "Nein, Punkt ist verdächtig", naechster: "antilayover" },
    ],
  },
  antilayover: {
    id: "antilayover",
    frage: "Liegt der Punkt auf der Anti-Layover-Seite?",
    hinweis:
      "Versatz entgegen der Radar-Blickrichtung: dorthin kann keine Dachreflexion projiziert werden — eine harte physikalische Unmöglichkeit (Regel 2 erlaubt dann foreign ohne weitere Prüfung).",
    optionen: [
      { wahl: "Ja, Anti-Layover", ergebnis: "foreign" },
      { wahl: "Nein / Layover-konform", naechster: "ge3d" },
    ],
  },
  ge3d: {
    id: "ge3d",
    frage: "Google-Earth-3D-Pflichtprüfung: Was zeigt der 3D-Blick an der Punktposition?",
    hinweis:
      "Seit 2026-07-07 Pflichtschritt vor jeder foreign-Vergabe. Entscheidend ist die bauliche Verbindung (gemeinsame Wand/Giebel).",
    optionen: [
      { wahl: "Baulich verbundene Struktur", ergebnis: "annex" },
      { wahl: "Bestätigte freistehende Fremdstruktur", ergebnis: "foreign" },
      { wahl: "Nicht auflösbar / Quelle unklar", ergebnis: "unclear" },
    ],
  },
};

type Ergebnis = SilverLabel | "kein_label";

/** Preset "Fall 96959851": derselbe Punkt, einmal ohne und einmal mit GE-3D. */
const PRESETS: {
  key: string;
  titel: string;
  antworten: Answer[];
  ergebnis: Ergebnis;
  notiz: string;
}[] = [
  {
    key: "v1",
    titel: "Fall 96959851 — Urteil vor der 3D-Pflicht",
    antworten: [
      { step: "evidenz", wahl: "Ja, Evidenz liegt vor" },
      { step: "dachkern", wahl: "Nein, Punkt ist verdächtig" },
      { step: "antilayover", wahl: "Nein / Layover-konform" },
    ],
    ergebnis: "foreign",
    notiz:
      "2026-06-11 wurde die Blechdach-Struktur ohne 3D-Blick als „unkartiertes Nebengebäude“ " +
      "gelesen — das Label wurde fälschlich foreign. Genau dieser Fehler machte die " +
      "GE-3D-Prüfung zum Pflichtschritt.",
  },
  {
    key: "v2",
    titel: "Fall 96959851 — mit GE-3D-Pflichtprüfung",
    antworten: [
      { step: "evidenz", wahl: "Ja, Evidenz liegt vor" },
      { step: "dachkern", wahl: "Nein, Punkt ist verdächtig" },
      { step: "antilayover", wahl: "Nein / Layover-konform" },
      { step: "ge3d", wahl: "Baulich verbundene Struktur" },
    ],
    ergebnis: "annex",
    notiz:
      "Der 3D-Blick zeigte die gemeinsame Wand am SW-Giebel: ein baulich verbundener Anbau. " +
      "Revision 2026-07-07: annex — Trennung + Differentialbewertung statt Entfernung.",
  },
];

export function LabelDecisionTree() {
  const [antworten, setAntworten] = useState<Answer[]>([]);
  const [ergebnis, setErgebnis] = useState<Ergebnis | null>(null);
  const [presetNotiz, setPresetNotiz] = useState<string | null>(null);

  const aktuellerStep: StepDef | null =
    ergebnis !== null
      ? null
      : antworten.length === 0
        ? STEPS.evidenz
        : (() => {
            const letzte = antworten[antworten.length - 1];
            const option = STEPS[letzte.step].optionen.find((o) => o.wahl === letzte.wahl);
            return option?.naechster ? STEPS[option.naechster] : null;
          })();

  const beantworten = (step: StepDef, wahl: string) => {
    const option = step.optionen.find((o) => o.wahl === wahl);
    if (!option) return;
    setPresetNotiz(null);
    setAntworten((prev) => [...prev, { step: step.id, wahl }]);
    if (option.ergebnis) setErgebnis(option.ergebnis);
  };

  const reset = () => {
    setAntworten([]);
    setErgebnis(null);
    setPresetNotiz(null);
  };

  const spielePreset = (preset: (typeof PRESETS)[number]) => {
    setAntworten(preset.antworten);
    setErgebnis(preset.ergebnis);
    setPresetNotiz(preset.notiz);
  };

  return (
    <Card className="grid gap-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((preset) => (
          <Button key={preset.key} size="sm" variant="outline" onClick={() => spielePreset(preset)}>
            {preset.titel}
          </Button>
        ))}
        <Button size="sm" variant="outline" onClick={reset}>
          Zurücksetzen
        </Button>
      </div>

      {/* Bereits beantwortete Schritte */}
      {antworten.length > 0 && (
        <ol className="grid gap-1.5">
          {antworten.map((antwort) => (
            <li
              key={antwort.step}
              className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-md border border-border bg-background px-3 py-2 text-xs"
            >
              <span className="text-muted-foreground">{STEPS[antwort.step].frage}</span>
              <span className="font-semibold text-foreground">→ {antwort.wahl}</span>
            </li>
          ))}
        </ol>
      )}

      {/* Aktuelle Frage */}
      {aktuellerStep && (
        <div className="grid gap-2 rounded-md border border-primary/40 bg-card px-3 py-3">
          <p className="text-sm font-semibold text-foreground">{aktuellerStep.frage}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">{aktuellerStep.hinweis}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {aktuellerStep.optionen.map((option) => (
              <Button
                key={option.wahl}
                size="sm"
                variant="outline"
                onClick={() => beantworten(aktuellerStep, option.wahl)}
              >
                {option.wahl}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Ergebnis */}
      {ergebnis !== null &&
        (ergebnis === "kein_label" ? (
          <FindingCard
            tone="neutral"
            label="Kein Label"
            detail="Ohne dokumentierte Evidenz wird kein Urteil aufgenommen (Regel 1). Der Punkt bleibt einfach ungelabelt."
          />
        ) : (
          <FindingCard
            tone={ergebnis === "unclear" ? "neutral" : "good"}
            label={
              <span className="inline-flex flex-wrap items-center gap-2">
                Label: <LabelBadge label={ergebnis} />
              </span>
            }
            detail={
              <>
                <p>{labelSemantik[ergebnis].text}</p>
                <p className="mt-1">
                  <strong className="text-foreground">Zielverhalten der Pipeline:</strong>{" "}
                  {labelSemantik[ergebnis].zielverhalten}
                </p>
              </>
            }
          />
        ))}

      {presetNotiz && (
        <p className="rounded-md border border-border bg-secondary/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {presetNotiz}
        </p>
      )}

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Der Baum zeigt den Erhebungsweg eines <GlossaryTerm term="referenzlabel">Referenzlabels</GlossaryTerm>{" "}
        — nicht die Pipeline-Logik: Die Pipeline kennt die Labels nicht und wird später an ihnen
        gemessen.
      </p>
    </Card>
  );
}
