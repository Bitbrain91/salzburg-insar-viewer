# Phase 7 / Optimierungsphase 1 - Ausfuehrungsreport

Stand: 2026-06-10
Branch: `phase7-optimization`
Session: autonome Supervisor-Session (Claude, Schritte 1-4), beauftragt am
2026-06-10. Hinweis: Die "gpt-5.5"-Agentenregel des Plan-Dokuments stammt aus
dem externen Codex-Supervisor-Workflow und wurde fuer diese Session durch den
direkten User-Auftrag an die Claude-Session ersetzt; Subagent-Arbeit laeuft
ueber Claude-Subagents und wird vom Supervisor gegen die Ticket-DoD geprueft.

Massgebliche Spezifikation:
`docs/pipelines/anomaly_local_v1/phase7_clustering_optimization_plan.md`
(Stand 2026-06-10, Commit `ef25a74`).

## Ticketstatus-Uebersicht

| Ticket | Titel | Status |
| --- | --- | --- |
| P7-A-W1-T5 | OPTICS-Runtime-Fallback entfernen | green |
| P7-A-W1-T6 | GBA-Hoehen-Audit | green |
| P7-A-W1-T1 | Baseline einfrieren | planned |
| P7-A-W1-T2 | Research-Matrix | in_progress |
| P7-A-W1-T3 | AOI-Katalog | planned |
| P7-A-W1-T4 | Referenzfaelle | planned |
| P7-B-W2-T0 | Deep-Links + Track-Farben | planned |
| P7-B-W1-T1..T4 | Harness/Scorecard/Konfidenz/HR | planned |
| P7-B-W2-T1 | Visual-Audit-Workflow | planned |
| P7-E-W1-T3 | Run-Transparenz (vorgezogen) | planned |
| P7-C-W1-T1..T5 | Experimente Schritt 3/4 | planned |

---

## P7-A-W1-T5: OPTICS-Runtime-Fallback entfernen (green)

Ziel: deterministische Pipeline-Semantik; `hdbscan` als harte Dependency
(User-Auftrag 2026-06-10, "niemals als Runtime-Fallback").

Aenderungen:

- `backend/app/ml/pipelines/anomaly_local_v1.py`:
  - `from sklearn.cluster import OPTICS` entfernt.
  - `try/except ImportError -> hdbscan = None` ersetzt durch harten
    `ImportError` mit Erklaertext (Paketname, Ticket, Datum).
  - In `_apply_density_clustering` den `if hdbscan is not None / else
    OPTICS`-Zweig durch den unbedingten HDBSCAN-Pfad ersetzt; Parameter
    unveraendert (`min_cluster_size=max(2, min(8, ceil(0.2*n)))`,
    `min_samples=floor(mcs/2)`, `eom`, `allow_single_cluster=True`,
    `metric=euclidean`).
- `docs/pipelines/anomaly_local_v1/methodik.md`: hdbscan als harte
  Dependency dokumentiert, Begruendung der Entfernung, Verweis auf
  OPTICS als explizite Harness-Variante.

Belegrun (Mirabell `13.04027,47.80375,13.04387,47.80735`, salzburg_snt):

- Run A (vor Aenderung): `488aa8d0-4697-4906-b0a8-27c8ab7eff1c`
- Run B (nach Aenderung): `7beb8be8-f3af-449b-acb7-e41e6a3edd85`
- Vergleich: alle 17 `ml_run_metrics` identisch; Punktebene
  (`code x track`: `cluster_id`, `label`): `0` von `1481` Punkten abweichend.
- Zusatzbefund Determinismus: Run A reproduziert exakt die Kennzahlen des
  Verifikationsruns `2c4cec7b` vom 2026-04-29 (gleiche Datenbasis).

`MODEL_SET_VERSION` bleibt `local_hdbscan_rulegate_v1`: Im Referenz-Environment
(hdbscan 0.8.42 installiert) aendert sich kein Ergebnis; entfernt wurde nur
ein environment-abhaengiger stiller Semantikwechsel (Ausnahme von der
"keine produktiven Aenderungen vor P7-E"-Regel ist im Plan dokumentiert).

Mindestpruefungen: `compileall` gruen, Pipeline-Import gruen,
hdbscan `0.8.42` via `importlib.metadata`, `git diff --check` sauber.

Kommandos:

```bash
backend/.venv-wsl/bin/python -m backend.app.ml.cli \
  --pipeline anomaly_local_v1 --area-id salzburg --dataset-id salzburg_snt \
  --source gba --bbox 13.04027,47.80375,13.04387,47.80735
# Vergleich: ml_run_metrics beider Runs + JOIN ml_point_results auf (code, track)
```

---

## P7-A-W1-T6: GBA-Hoehen-Audit (green)

Artefakt: `artifacts/phase7_gba_height_audit.md` (alle Queries enthalten).

Kernergebnisse:

- Kein Loader-Fehler: Rohdaten-GeoJSON enthaelt die niedrigen Hoehen samt
  Schaetzvarianz `var`; GBA-Hoehenmodell unterschaetzt systematisch
  (Median-Ratio GBA/OSM `0.735` ueber 673 oeffentliche OSM-Hoehen) und
  saettigt bei hohen Gebaeuden (Dom 78 -> 27.4 m).
- Bad-Gastein-OSM-Gegenprobe nicht moeglich: `osm_buildings` hat fuer
  `bad_gastein` 0 Zeilen (nie geladen).
- NEU/EHRLICH (Wirkungsquantifizierung, Run `488aa8d0`): Eine
  Hoehenkorrektur `h/0.735` holt nur `10/210` (T44) bzw. `14/207` (T95)
  nearest-Punkte in die Candidate-Area (~5-7 %). Dominante nearest-Ursache
  ist seitlicher Versatz (laterale Slack 2 m vs. Geokodierung 8-12 m) bzw.
  echte Fremdobjekte - NICHT die Range-Laenge. Die fruehere Hypothese
  "Hoehenfehler erklaert einen relevanten Teil der nearest-Quote" ist damit
  fuer Mirabell widerlegt; primaerer Hebel bleibt die Assignment-Hygiene
  (`P7-C-W1-T5`, v. a. Demotion).
- Empfehlung: O1 (InSAR-selbstkalibrierte Hoehe) fuer das
  `height_above_ground_m`-Feature; O3 (globaler Kalibrierfaktor + var) nur
  als Experimentvariante mit geringer Erwartung; O2 (OSM) als
  Validierungsquelle; keine produktive Aenderung in P7-A.
