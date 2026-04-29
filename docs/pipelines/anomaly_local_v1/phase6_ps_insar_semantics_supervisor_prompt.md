# Supervisor Prompt fuer die Phase-6-PS-InSAR-Semantik- und Track-Geometrie-Session

Der folgende Prompt ist fuer eine eigenstaendige Phase-6-Session gedacht. Er ist auf
die AUGMENTERRA-Rueckmeldung vom 2026-04-28, die neuen AUGMENTERRA-/TRE-ALTAMIRA-
Handbooks, den abgeschlossenen `P5`-Stand und den aktuellen Code von
`anomaly_local_v1` abgestimmt.

## Minimaler Session-Start

Fuer eine neue Session reicht dieser Einzeiler:

`Lies docs/pipelines/anomaly_local_v1/phase6_ps_insar_semantics_supervisor_prompt.md und fuehre es vollstaendig aus.`

```text
Arbeite in diesem Repo als Supervisor fuer die Phase-6-PS-InSAR-Semantik- und
Track-Geometrie-Session von `anomaly_local_v1`.

Ziel:
Setze in dieser Session nur `P6` aus
`docs/pipelines/anomaly_local_v1/phase6_ps_insar_semantics_plan.md` autonom um.

Diese Session verarbeitet die neue AUGMENTERRA-Rueckmeldung:

- `los = A` bedeutet Ascending.
- `los = D` bedeutet Descending.
- Track `44` ist Orbit Nummer `44`, Blickrichtung `81.4 deg`,
  Off-Nadir / Incidence `38.81 deg`.
- Track `95` ist Orbit Nummer `95`, Blickrichtung `281.5 deg`,
  Off-Nadir / Incidence `38.48 deg`.
- Negative `velocity` / `displacement` bedeuten LOS-Verlaengerung, also Bewegung weg
  vom Satelliten.
- Positive Werte bedeuten Bewegung hin zum Satelliten.

Zusaetzlich ist `docs/research/external/TREALTAMIRA_handbook_2.2_20180604.pdf`
eine zentrale Fachquelle: Es erklaert, wie PS-InSAR/SqueeSAR-Punkte entstehen und
wie Punktattribute fachlich zu interpretieren sind. Nutze dieses Handbook nicht nur
fuer Geometrie, sondern als Validierungsbasis fuer die aktive Pipeline-Semantik.

Behandle den Plan als Scheduler-Eingabe:

`Plan -> Phase -> Welle -> Ticket`

Arbeitsmodus:

- Nutze Subagents aktiv und strikt; halte den Supervisor-Kontext klein.
- Delegiere alle Ticket-Arbeiten an Subagents.
- Der Supervisor ist Scheduler, Gatekeeper und Integrator, nicht der primaere
  Implementierer.
- Starte alle delegierten Agents mit `gpt-5.5` und reasoning effort `xhigh`.
- Keine Mini-, Nano- oder sonstigen kleineren Modelle.
- Falls `gpt-5.5` nicht verfuegbar ist, stoppe und melde den Modell-Blocker; kein Fallback auf kleinere Modelle.
- Verlange von jedem delegierten Agent, dass er seine Ticket-DoD selbst prueft,
  bei Bedarf selbst nachbessert und dann mit klarem Ticket-Status zurueckmeldet.
- Integriere nur Tickets mit Status `green`.
- Bei `red` oder `inconclusive` dokumentiere den Blocker und entscheide gemaess Plan,
  ob parallele Arbeit weiterlaufen darf.

Pflichtlektuere zu Beginn:

- `docs/pipelines/anomaly_local_v1/phase6_ps_insar_semantics_plan.md`
- `docs/pipelines/anomaly_local_v1/ps_insar_semantics_decision.md`
- `docs/pipelines/anomaly_local_v1/phase5_data_correctness_report.md`
- `docs/pipelines/anomaly_local_v1/artifacts/phase5_P5-W2-T2.md`
- `docs/pipelines/anomaly_local_v1/artifacts/phase5_P5-W3-T1.md`
- `docs/pipelines/anomaly_local_v1/methodik.md`
- `docs/pipelines/anomaly_local_v1/runbook.md`
- `docs/pipelines/anomaly_local_v1/phase2_retuning_verification.md`
- `docs/pipelines/anomaly_local_v1/phase3_neighbourhood_verification.md`
- `docs/research/Datenanalyse_InSAR_Salzburg.md`
- `docs/research/external/AUGMENTERRA_InSAR_Handbook_v1_3.pdf`
- `docs/research/external/TREALTAMIRA_handbook_2.2_20180604.pdf`
- `pipeline/prepare_insar.py`
- `backend/app/ml/pipelines/anomaly_local_v1.py`
- `backend/app/ml/evaluation/phase2_harness.py`
- `backend/app/routers/api.py`
- `backend/app/routers/ml.py`
- `backend/app/schemas.py`
- `frontend/src/lib/cameraModes.ts`
- `frontend/src/components/LayerPanel.tsx`
- `frontend/src/components/MapView.tsx`
- `frontend/src/components/InspectorPanel.tsx`
- `frontend/src/hooks/useApi.ts`

Verbindliche P6-Ziele:

1. Werte die neue AUGMENTERRA-Antwort und die beiden Handbooks aus; das TRE
   ALTAMIRA Handbook ist die zentrale Fachquelle fuer PS-InSAR-Punktentstehung.
2. Spiegle die aktive Pipeline-Semantik gegen das Handbook:
   - Gate-Rules
   - `vertical_proxy = velocity / cos(incidence_angle)`
   - `height` und `incidence_angle`
   - `coherence`
   - Zeitreihenfeatures
   - Beschleunigung und Saisonalitaet
   - Building-Level-Reliability und Retuning-Penalties
3. Zentralisiere den Track-Geometrie-Vertrag fuer Track `44` und `95`.
4. Entscheide, ob die bestehende X-only-Candidate-Area auf einen echten 2D-Range-
   Vektor umgestellt wird.
5. Falls ja: Implementiere Pipeline und ML-Kontext-API konsistent.
6. Pruefe die LOS-Vorzeichenkonvention gegen Methodik, Velocity-Thresholds und
   `vertical_proxy`.
7. Pruefe UI-Kameramodi und Track-Hilfetexte gegen die bestaetigte Geometrie.
8. Verifiziere mit Mirabell, Moosstrasse und Osthang.
9. Dokumentiere alt/neu-Auswirkungen und entscheide am Ende bewusst:
   `keep_2d_vector`, `rollback_to_x_only` oder `defer_after_dry_run`.
10. Dokumentiere zusaetzlich, welche Pipeline-Annahmen durch das Handbook
    bestaetigt sind, welche angepasst werden sollten und welche in eine spaetere
    Research-/Kalibrationsphase gehoeren.

Verbindliche Nicht-Ziele:

- Keine Terrain-/Aspect-Wiederaufnahme.
- Kein DTM-/DSM-Upgrade.
- Keine statischen Linktabellen.
- Keine breite HDBSCAN-/Reliability-/Nachbarschafts-Neukalibrierung in dieser
  Session. Fachliche Abweichungen aus dem Handbook muessen aber als konkrete
  Follow-up-Tickets oder klar begrenzte Anpassungen dokumentiert werden.
- Kein breiter UI-Refactor.

Geometrie-Startannahmen:

- AUGMENTERRA-Blickrichtung ist als Bearing im Uhrzeigersinn von Norden zu behandeln,
  bis eine Quelle aus den Handbooks etwas anderes belegt.
- Sensor-/Near-Range-Richtung ist die Gegenrichtung der Blickrichtung:
  - Track `44`: `81.4 + 180 = 261.4 deg`
  - Track `95`: `281.5 + 180 = 101.5 deg`
- Metrischer Vektor:
  - `dx = sin(bearing_rad)`
  - `dy = cos(bearing_rad)`
- Daraus folgt:
  - Track `44`: `dx=-0.9888`, `dy=-0.1495`
  - Track `95`: `dx=0.9799`, `dy=-0.1994`

Ticket-Reihenfolge:

1. `P6-W1-T1`: PS-InSAR-/SqueeSAR-Quellen- und Handbook-Auswertung
2. `P6-W1-T2`: Pipeline-Semantik gegen PS-InSAR-Fachquelle spiegeln
3. `P6-W1-T3`: Geometrie-Delta und Implementierungsdesign
4. `P6-W2-T1`: Backend 2D-Range-Vektor fuer Candidate-Areas, falls freigegeben
5. `P6-W2-T2`: UI-Kamera und Track-Geometrie-Anzeige
6. `P6-W2-T3`: LOS-Vorzeichenkonvention dokumentieren und pruefen
7. `P6-W3-T1`: AOI-Reruns und Harness-Vergleich
8. `P6-W3-T2`: UI- und Screenshot-Verifikation
9. `P6-W4-T1`: Abschlussentscheidung und Planfortschreibung

Wellenregeln:

- `P6-W1-T1` startet zuerst.
- `P6-W1-T2` startet erst nach Quellenbasis.
- `P6-W1-T3` startet erst nach Pipeline-Semantik-Spiegelung.
- `P6-W2-*` startet erst nach Designentscheidung.
- `P6-W3-*` startet erst nach Implementierung oder bewusstem Dry-Run-Pfad.
- `P6-W4-T1` integriert alle Ergebnisse.

Rueckgabeformat fuer jeden Agent:

- Ticket-Status: `green`, `red` oder `inconclusive`
- Geaenderte Dateien
- DoD-Evidenz
- verwendete Kommandos/SQL/API-Endpunkte
- lokale Verifikation
- offene Risiken
- klare Bewertung und naechstes Gate

Erwartete konkrete Umsetzung:

- Erstelle `docs/pipelines/anomaly_local_v1/phase6_ps_insar_semantics_report.md`.
- Der Bericht muss einen eigenen Abschnitt `PS-InSAR point semantics` enthalten,
  der Gate-Rules, Feature-Nutzung, `vertical_proxy`, `height`, `incidence_angle`,
  `coherence`, Zeitreihenfeatures, Beschleunigung, Saisonalitaet und Reliability
  gegen das TRE ALTAMIRA Handbook bewertet.
- Falls implementiert, aktualisiere Backend-Pipeline und ML-Kontext-API mit derselben
  2D-Vektorlogik.
- Falls Frontend geaendert wird, halte Kamera-/Hilfetexte knapp und fachlich korrekt.
- Lege Screenshots oder kleine Geometrie-Artefakte unter
  `docs/pipelines/anomaly_local_v1/artifacts/phase6_*` ab, falls UI oder
  Candidate-Areas sichtbar geaendert werden.
- Aktualisiere am Ende `docs/pipelines/anomaly_local_v1/phase2_execution_plan.md`
  und optional `docs/pipelines/anomaly_local_v1/iterations.md`.

Mindestpruefungen:

- `git status --short --branch`
- `backend/.venv/bin/python -m compileall backend/app`
- neue Runs oder Dry-Run-Vergleich fuer:
  - Mirabell
  - Moosstrasse
  - Osthang-Stressbereich
- `backend/.venv/bin/python -m backend.app.ml.evaluation.phase2_harness`, falls die
  produktive Pipeline-Logik geaendert wurde und die DB verfuegbar ist
- `cd frontend && npm run build`, falls Frontend-Dateien geaendert wurden
- `git diff --check`

Abschlusskriterium:

Die Session endet erst, wenn `P6` einen integrierten Bericht mit Entscheidung hat
oder ein harter Blocker dokumentiert ist. Keine stillschweigende Weiterarbeit an
Terrain, Aspect oder MatchSAR ausserhalb dieses Scope.
```

## Erwartung an den Supervisor

Der Supervisor soll:

- die neue AUGMENTERRA-Quelle ernst nehmen,
- das TRE ALTAMIRA Handbook als fachliche Validierung der PS-InSAR-Punktinterpretation
  priorisieren,
- die 2D-Geometrie nicht ungeprueft produktiv setzen,
- Pipeline-Annahmen nicht ungeprueft behalten, wenn das Handbook klare Grenzen oder
  Risiken zeigt,
- Backend/API/UI-Geometrie nicht auseinanderlaufen lassen,
- Referenz-AOIs als Gate verwenden,
- und am Ende eine klare, reproduzierbare Entscheidung liefern.
