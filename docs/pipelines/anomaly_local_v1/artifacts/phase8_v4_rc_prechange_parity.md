# Phase 8 v4 RC - Differential-Paritaet vor der Semantikbereinigung

Stand: 2026-07-10T10:12:19.825228Z

Status: **green**
Phase: **prechange** (vor jeder Backend-Codeaenderung)

## Scope und Methode

Die lokale PostGIS-DB war erreichbar. Geprueft wurden die zehn in
`backend/app/ml/evaluation/phase7_clustering_experiments.py::AOIS`
gepinnten v4-Baseline-Runs. Alle Runs haben Status `succeeded`, alle
Punktzeilen tragen `local_hdbscan_rulegate_v4_k2xhf_diffv2`.

Pro eindeutigem Building-Rollup (`run_id`, `building_source`, `building_id`,
`building_rollup`) wurden geprueft:

1. `differential_motion_flag=true` bei Level `none`;
2. `differential_motion_flag=false` bei aktivem Level;
3. fehlendes, leeres, nicht-stringfoermiges oder ungueltiges Level;
4. fehlende oder inkonsistente Proxy-Evidenz.

Fuer ein aktives Level muss die Evidenz `track`, `cluster_id`, das signierte
`delta_mm_a`, `threshold_mm_a`, `sigma_delta_mm_a`, `downgrades`,
`annex_cluster` und `confirming_track` enthalten. Das Evidenz-Delta wurde
gegen

`cluster_rollup.median_vertical_proxy_mm_a - building_rollup.track_motion_mm_a[track]`

und sein Betrag gegen `cluster_rollup.motion_delta_to_main_mm_a` geprueft.
Toleranz: 0,011 mm/a, weil `delta_mm_a` in der persistierten Evidenz auf zwei
Dezimalstellen gerundet ist. Level `none` muss `evidence=null` haben.

## Ergebnis

- 10/10 Runs vorhanden und erfolgreich
- 23.278 Punktzeilen
- 870 eindeutige Building-Rollups
- Level: 849 `none`, 17 `candidate`, 4 `significant`, 0 `confirmed`
- `flag=true` / `level=none`: **0**
- `flag=false` / aktives Level: **0**
- fehlende Level: **0**
- ungueltige Level: **0**
- fehlende/inkonsistente Proxy-Evidenz: **0**

| AOI | Quelle | Run | Rollups | none | candidate | significant | confirmed | Paritaetsfehler | Evidenzfehler |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| mirabell | gba | `a9419755` | 58 | 58 | 0 | 0 | 0 | 0 | 0 |
| moosstrasse | gba | `c1297b3e` | 147 | 138 | 6 | 3 | 0 | 0 | 0 |
| osthang | gba | `d8aa1314` | 47 | 47 | 0 | 0 | 0 | 0 | 0 |
| bg_flat_01_snt | gba | `ce87a736` | 82 | 81 | 1 | 0 | 0 | 0 | 0 |
| bg_slope_01_snt | gba | `a7cd181e` | 60 | 60 | 0 | 0 | 0 | 0 | 0 |
| bg_flat_01_tsx | gba | `438ba411` | 82 | 75 | 6 | 1 | 0 | 0 | 0 |
| bg_slope_01_tsx | gba | `bb685fc3` | 63 | 63 | 0 | 0 | 0 | 0 | 0 |
| moosstrasse_bev | bev | `b4514e21` | 176 | 172 | 4 | 0 | 0 | 0 | 0 |
| bg_slope_01_snt_bev | bev | `b24b1e91` | 74 | 74 | 0 | 0 | 0 | 0 | 0 |
| bg_slope_01_tsx_bev | bev | `377393ca` | 81 | 81 | 0 | 0 | 0 | 0 | 0 |

## Entscheidung

Die persistierten v4-Rollups sind fuer die untersuchten Regeln intern
paritaetisch. `differential_motion_level` kann deshalb im aktiven Backend
zur alleinigen Semantik werden; der Bool ist in diesen Baselines redundant.

Einschraenkung: In den zehn Runs existiert kein positiver `confirmed`-Fall.
Die Pflicht `confirmed -> confirming_track != null` wurde daher nur als
Auditregel definiert, nicht an einem positiven persistierten Beispiel
beobachtet.

Maschinenlesbare Details: `phase8_v4_rc_prechange_parity.json`.
