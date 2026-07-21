import { Chapter } from "@/components/layout/Chapter";
import { GlossaryTerm } from "@/components/GlossaryTerm";
import { chapterById } from "@/content/chapters";
import { BUILDING_STATUS_LABELS, crossTrack, type BuildingStatus } from "@/content/facts";
import { CrossTrackComparator } from "./diagrams/CrossTrackComparator";

const STATUS_ERKLAERUNG: Record<BuildingStatus, string> = {
  ok: "beide Prüfungen tragfähig — belastbarer Befund",
  single_track_only: "nur eine Blickrichtung verfügbar — eingeschränkte Plausibilisierung",
  small_n: "Gesamt-Hauptclusterstützung unter 4 Punkten",
  noise_dominated: "mehr als die Hälfte der behaltenen Punkte ist Noise",
  insufficient_support: "unter 3 behaltene Punkte oder kein Hauptcluster",
};

export function Ch6Bewegung() {
  return (
    <Chapter
      meta={chapterById.bewegung}
      techDetails={
        <>
          <p>
            Je Track trägt der Hauptcluster die robuste Bewegung: den Median der{" "}
            <GlossaryTerm term="verticalProxy">Vertikal-Proxies</GlossaryTerm> seiner Punkte
            (Median statt Mittelwert — unempfindlich gegen Einzelausreißer). Die Gebäudebewegung{" "}
            <span className="font-mono">building_motion_mm_a</span> ist das Mittel über die
            verfügbaren Tracks. Der Kosinus im Proxy ist bei 0,30 gedeckelt, damit extreme
            Einfallswinkel die Werte nicht explodieren lassen.
          </p>
          <p>
            Der Track-Vergleich läuft ausschließlich zwischen Track {crossTrack.ascTrack} (ASC) und
            Track {crossTrack.dscTrack} (DSC). Volle Stützung (
            <span className="font-mono">full_support</span>) verlangt mindestens{" "}
            {crossTrack.fullSupportMinPoints} Hauptcluster-Punkte und eine Bewegungsaussage auf
            beiden Tracks. Die Übereinstimmung ist ein Plausibilitätsindikator, kein Ground Truth —
            und bis zu einer echten 2D-Dekomposition bewusst nur das.
          </p>
          <p>Gebäudestatus (Prüfreihenfolge wie im Code):</p>
          <ul className="grid gap-1">
            {(Object.keys(STATUS_ERKLAERUNG) as BuildingStatus[]).map((status) => (
              <li key={status} className="flex flex-wrap items-baseline gap-x-2 text-xs">
                <span className="font-mono font-semibold text-foreground">{status}</span>
                <span className="text-muted-foreground">
                  „{BUILDING_STATUS_LABELS[status]}" — {STATUS_ERKLAERUNG[status]}
                </span>
              </li>
            ))}
          </ul>
        </>
      }
    >
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Zwei unabhängige Blickrichtungen sind die stärkste Plausibilitätsprüfung der Methode: Wenn{" "}
        <GlossaryTerm term="ascDsc">ASC und DSC</GlossaryTerm> nach der lokalen Filterung dieselbe
        Bewegung sehen, ist ein Messartefakt unwahrscheinlich. Die{" "}
        <GlossaryTerm term="trackAgreement">Track-Übereinstimmung</GlossaryTerm> fällt exponentiell
        mit der Abweichung — probiere aus, wie Hangneigung die Toleranz weitet.
      </p>
      <CrossTrackComparator />
    </Chapter>
  );
}
