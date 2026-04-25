# `anomaly_local_v1` Phase-3 Neighbourhood Verification

Stand: 2026-04-25
Status: green

## Ergebnis

`P3-W3-T2` ist mit echten neuen Live-Runs abgeschlossen.
Der Harness-Default und die Artefakte zeigen jetzt auf die neuen `P3`-Runs:

- Mirabell: `b5c20834-6b5d-4a8f-b2a7-90ce623c78f7`
- Moosstrasse: `fa27294d-a4f9-4ba8-97ef-5dafb4eb99e5`
- Osthang-Stressbereich: `71770d85-ec8c-4354-840a-545fa0b7c757`

`phase2_harness_results.json`, `phase2_harness_summary.md` und
`phase2_reference_cases.json` wurden auf `2026-04-25T06:40:03.068499+00:00`
neu geschrieben. Der Harness exportiert jetzt die `P3`-Nachbarschaftszaehler
auch in JSON, Markdown und den Referenzfall-Artefakten.

`P3` bleibt additiv: Referenzstatus und `P2R`-Reliability-Semantik bleiben
erhalten. `P4`-Terrain-/Aspect-Logik wurde nicht eingefuehrt.

Die verifizierte `P3-v1`-Kandidatensuche nutzt die im Pipeline-Record vorhandenen
GBA-Gebaeudezentroide in `EPSG:32633` mit `25 m` Radius und maximal `8` Nachbarn.
Es wurde kein neuer Geometry-Join und keine Punkt-Umbuchung eingefuehrt.

## Pflichtverifikation

| Check | Ergebnis | Evidenz |
| --- | --- | --- |
| `backend/.venv/bin/python -m compileall backend/app` | green | lief erfolgreich ueber `backend/app` inkl. aktualisiertem Harness |
| Mirabell-Run | green | neuer Run `b5c20834-6b5d-4a8f-b2a7-90ce623c78f7`, `2026-04-25 06:36:35+00:00 -> 06:37:08+00:00` |
| Moosstrasse-Run | green | neuer Run `fa27294d-a4f9-4ba8-97ef-5dafb4eb99e5`, `2026-04-25 06:37:17+00:00 -> 06:37:54+00:00` |
| Osthang-Run | green | neuer Run `71770d85-ec8c-4354-840a-545fa0b7c757`, `2026-04-25 06:37:59+00:00 -> 06:38:09+00:00` |
| `backend/.venv/bin/python -m backend.app.ml.evaluation.phase2_harness --mirabell-run-id ... --moosstrasse-run-id ... --osthang-run-id ...` | green | erfolgreicher Rerun gegen die drei neuen Run-IDs |
| `backend/.venv/bin/python -m backend.app.ml.evaluation.phase2_harness` | green | erfolgreicher Default-Rerun nach Update der festen AOI-Run-IDs |
| `cd frontend && npm run build` | green | Vite-Prod-Build erfolgreich; nur bestehende Chunk-Size-Warnung |

## AOI-Zaehler

Zaehler direkt aus `ml_point_results.meta` bzw. `building_rollup`:

| AOI | Run ID | Gebaeude gesamt | Gebaeude mit Nachbarschaftskontext | Fehlzuordnungs-Punkte | Gebaeude mit Fehlzuordnung | Gebaeude mit `neighbour_event_flag` |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Mirabell | `b5c20834-6b5d-4a8f-b2a7-90ce623c78f7` | 58 | 22 | 2 | 2 | 2 |
| Moosstrasse | `fa27294d-a4f9-4ba8-97ef-5dafb4eb99e5` | 147 | 106 | 2 | 2 | 12 |
| Osthang-Stressbereich | `71770d85-ec8c-4354-840a-545fa0b7c757` | 47 | 34 | 6 | 6 | 10 |

## Konkrete Fehlzuordnung

Staerkstes positives Beispiel im neuen Pflichtsatz:

- AOI: `Osthang-Stressbereich`
- Gebaeude: `54773360`
- Punkt: `NNG51IR01`, Track `95`, `assignment_method=within`
- `best_neighbour_building_id=54773352`
- `best_neighbour_cluster_id=54773352:t95:cluster_0`
- `own_cluster_fit_score=null`
- `neighbour_fit_score=0.7508`
- `neighbour_fit_delta=0.7508`

Die Diagnose ist damit klar additiv: der Punkt behaelt seine bestehende
Gebaeudezuordnung, wird aber als starker Fehlzuordnungskandidat gegen das
Nachbargebaeude markiert.

## Konkretes Event-Konsistenzbeispiel

Staerkstes Event-Beispiel im neuen Pflichtsatz:

- AOI: `Moosstrasse`
- Gebaeude: `96955277`
- `building_status=ok`
- `neighbour_event_score=0.8322`
- `neighbour_consistency_score=0.8322`
- `supporting_neighbour_count=2`
- `supporting_track_count=2`
- `neighbour_misassignment_share=0.0`

Track-lokale Hauptcluster desselben Gebaeudes zeigen auf zwei stimmige
Nachbargebaeude:

- Track `44`: bester Nachbar `96955356`, Score `0.7451`
- Track `95`: bester Nachbar `96955337`, Score `0.9193`

Das passt zur `P3`-Regel: zwei unterschiedliche stuetzende Nachbargebaeude,
keine dominante Fehlzuordnungsquote und nur additive Building-Diagnose.

## Referenzfaelle Nach P3

Alle acht `P2R`-Referenzfaelle behalten ihren erwarteten Status.
Es gibt keine Statusregression. Zusaetzliche `P3`-Diagnosen bleiben additiv.

| Gebaeude | Erwartet aus `P2R` | Nach `P3` | Kontext | Fehlzuordnung | Event | Bewertung |
| --- | --- | --- | --- | --- | --- | --- |
| `548205` | `ok` | `ok` | ja | `1` Punkt, Share `0.0714` | `false`, Score `0.3836`, Support `1` | green; additive Punktdiagnose, kein Event |
| `548204` | `ok` | `ok` | nein | `0` | `false`, Score `n/a`, Support `0` | green |
| `96637447` | `ok` | `ok` | ja | `0` | `false`, Score `0.0`, Support `0` | green; Kontext verfuegbar, aber keine Zusatzmarkierung |
| `96637522` | `ok` | `ok` | nein | `0` | `false`, Score `n/a`, Support `0` | green |
| `96637488` | `single_track_only` | `single_track_only` | nein | `0` | `false`, Score `n/a`, Support `0` | green |
| `96959854` | `small_n` | `small_n` | ja | `1` Punkt, Share `0.25` | `false`, Score `0.0`, Support `0` | green; additive Fehlzuordnungsdiagnose erklaert Zusatzmarkierung ohne Statuswechsel |
| `96637551` | `noise_dominated` | `noise_dominated` | ja | `0` | `false`, Score `0.0`, Support `0` | green |
| `395674088` | `insufficient_support` | `insufficient_support` | nein | `0` | `false`, Score `n/a`, Support `0` | green |

## Abschluss

`P3-W3-T2` ist gruen. Damit steht `P3` insgesamt auf `green`.
Die naechste offene Hauptphase bleibt `P4` auf `planned`.
