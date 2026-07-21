import { Chapter } from "@/components/layout/Chapter";
import { GlossaryTerm } from "@/components/GlossaryTerm";
import { KindBadge } from "@/components/ui/insights";
import { chapterById } from "@/content/chapters";
import { separation } from "@/content/facts";
import { formatMeters } from "@/lib/format";
import { SeparatorPlayground } from "./diagrams/SeparatorPlayground";

export function Ch3Trennung() {
  return (
    <Chapter
      meta={chapterById.trennung}
      techDetails={
        <>
          <p>
            Prüfreihenfolge: erst Dachniveau, dann Blickseite, dann Reichweite (interne Kürzel a8 →
            a6 → a7) — jeweils nur für nicht ausgeschlossene Punkte; Blickseiten- und
            Reichweiten-Prüfung zusätzlich nur ab {formatMeters(separation.offFootprintEpsM)}{" "}
            Abstand vom Grundriss:
          </p>
          <ul className="grid list-disc gap-1.5 pl-5">
            <li>
              <strong className="text-foreground">Unter dem Dachniveau</strong>{" "}
              (<span className="font-mono">a8 height_outlier</span>): Punkt liegt{" "}
              <span className="font-mono">tol &lt; Δ ≤ {formatMeters(separation.a8MaxBelowM, 0)}</span>{" "}
              unter dem Median der Dach-Anker, mit{" "}
              <span className="font-mono">tol = max(3 · 1,4826 · MAD | {formatMeters(separation.madFloorM, 0)})</span>.
              Anker sind within-/directional-Punkte am Grundriss; der Kandidat zählt nicht zu
              seinen eigenen Ankern, mindestens {separation.a8MinAnchors} unabhängige Anker nötig.
            </li>
            <li>
              <strong className="text-foreground">Falsche Seite</strong>{" "}
              (<span className="font-mono">a6 anti_layover</span>): Versatz entgegen der
              Radar-Blickrichtung —{" "}
              <span className="font-mono">
                dot &lt; {String(separation.antiLayoverDot).replace(".", ",")}
              </span>{" "}
              und{" "}
              <span className="font-mono">
                d · (−dot) &gt; {formatMeters(separation.antiComponentMinM)}
              </span>
              . Als Dachreflexion dieses Gebäudes physikalisch unmöglich.
            </li>
            <li>
              <strong className="text-foreground">Über der Layover-Reichweite</strong>{" "}
              (<span className="font-mono">a7 reach_height_excess</span>): implizite Reflektorhöhe{" "}
              <span className="font-mono">d / tan(inzidenz)</span> übersteigt die plausible
              Gebäudehöhe + {formatMeters(separation.heightMarginM, 0)}. GBA-Höhen werden zuvor
              entsättigt (<span className="font-mono">h / 0,735</span>).
            </li>
          </ul>
          <p>
            Routing <span className="font-mono">anti_foreign</span>:{" "}
            <span className="font-mono">anti_layover</span> ∨ (BEV ∧{" "}
            <span className="font-mono">reach_height_excess</span>) →{" "}
            <span className="font-mono">:foreign</span> (Rolle{" "}
            <span className="font-mono">weak_support</span>, Wahrscheinlichkeit 0,30) — nie
            Hauptcluster, nie Differential-Quelle. Übrige Kandidaten bilden den Annex-Seed und
            rekrutieren verhaltensbasiert (<span className="font-mono">annex_velocity_growth</span>
            ): ein Punkt ab {formatMeters(separation.annexRecruitMinDistanceM, 0)} Abstand, der sich
            mit dem Anbau und gegen das Hauptdach bewegt (Toleranz{" "}
            <span className="font-mono">max(1 mm/a | 2 · velocity_std)</span>), gehört kinematisch
            dazu. Mindestens {separation.annexMinConsistent} velocity-konsistente Punkte →{" "}
            <span className="font-mono">annex_0</span> (Rolle core), sonst{" "}
            <span className="font-mono">annex_weak</span> (weak_support).
          </p>
          <p>
            Öffentliches Feld: <GlossaryTerm term="clusterKind">cluster_kind</GlossaryTerm> ={" "}
            <span className="font-mono">standard | annex | foreign</span>, abgeleitet aus dem
            Cluster-Suffix; bei widersprüchlicher Kennung gewinnt{" "}
            <span className="font-mono">foreign</span>. Historische v3-annex-Kennungen sind keine
            rückwirkende v4-Bestätigung.
          </p>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>Drei mögliche Ergebnisse:</span>
        <KindBadge kind="standard" />
        <KindBadge kind="annex" />
        <KindBadge kind="foreign" />
      </div>
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Drei physikalische Prüfungen bewerten jeden Kandidatenpunkt: Liegt er deutlich{" "}
        <strong>unter dem Dachniveau</strong> (typisch für Anbauten)? Liegt er auf der{" "}
        <strong>falschen, vom Satelliten abgewandten Seite</strong> (dort kann keine Dachreflexion
        hinprojiziert werden)? Oder ist er{" "}
        <strong>weiter entfernt, als Layover erklären kann</strong>? Bewege den Punkt und beobachte,
        wie sich die Einstufung ändert.
      </p>
      <SeparatorPlayground />
      <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
        Warum das wichtig ist: In v3 konnten technisch erkannte Fremdpunkte als „Anbau"
        durchrutschen und so eine scheinbare differenzielle Gebäudebewegung erzeugen. Die
        v4-Trennung stellt sicher, dass Fremdreflektoren weder die Hauptbewegung noch die
        Differentialaussage beeinflussen.
      </p>
    </Chapter>
  );
}
