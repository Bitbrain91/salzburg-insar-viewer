# Kandidat k2x - volle Scorecard (P7-D-W1-T2)

Stand: 2026-06-10. Verdikt: **candidate_green**, Referenzfaelle ok: True.
Konfiguration: `{"experiment_id": "k2x", "description": "Kandidat K2x = a5_crosslook + smalln_strict", "algorithm": "hdbscan", "mcs_fraction": 0.2, "mcs_cap": 8, "mcs_floor": 2, "min_samples_mode": "half", "cluster_selection_method": "eom", "allow_single_cluster": true, "cluster_selection_epsilon": 0.0, "optics_cluster_method": "xi", "optics_xi": 0.05, "optics_eps": 0.5, "matrix_features": null, "coherence_floor": null, "coherence_gate_mode": "absolute", "assignment_policy": "a5_crosslook", "smalln_mode": "strict", "reassign_mode": "on"}`

| AOI | Lage | kept | noise | multi(robust) | nearest-mains | xtrack | bands |
| --- | --- | ---: | ---: | --- | ---: | ---: | --- |
| mirabell | flach | 1141 | 0.358 | 25(28) | 5 | 0.6499 | {'stable': 39, 'monitor': 19, 'unstable': 20} |
| moosstrasse | flach | 1241 | 0.242 | 61(60) | 11 | 0.4383 | {'unstable': 51, 'monitor': 30, 'stable': 96} |
| osthang | hang | 484 | 0.246 | 21(22) | 3 | 0.8179 | {'monitor': 23, 'stable': 30, 'unstable': 21} |
| bg_flat_01_snt | flach | 718 | 0.292 | 32(29) | 9 | 0.6646 | {'unstable': 33, 'monitor': 25, 'stable': 49} |
| bg_slope_01_snt | hang | 533 | 0.272 | 14(15) | 4 | 0.1646 | {'stable': 34, 'monitor': 18, 'unstable': 19} |
| bg_flat_01_tsx | flach | 5652 | 0.366 | 68(60) | 12 | 0.5091 | {'stable': 23, 'monitor': 77, 'unstable': 46} |
| bg_slope_01_tsx | hang | 3912 | 0.287 | 49(44) | 5 | 0.0858 | {'unstable': 23, 'monitor': 47, 'stable': 40} |

Status-Aufwertungen vs Baseline (audit-pflichtig): 15
- mirabell 54773193: noise_dominated -> ok
- mirabell 54773226: noise_dominated -> ok
- mirabell 54843082: noise_dominated -> ok
- moosstrasse 632158001: noise_dominated -> ok
- moosstrasse 96637502: noise_dominated -> ok
- moosstrasse 96955326: small_n -> single_track_only
- moosstrasse 96955370: noise_dominated -> ok
- bg_flat_01_snt 238099964: noise_dominated -> ok
- bg_flat_01_snt 238099968: noise_dominated -> ok
- bg_flat_01_tsx 227901743: noise_dominated -> ok
- bg_flat_01_tsx 227901751: noise_dominated -> ok
- bg_flat_01_tsx 238099979: noise_dominated -> ok
- bg_flat_01_tsx 238100006: noise_dominated -> ok
- bg_flat_01_tsx Austria_120230032_193: noise_dominated -> single_track_only
- bg_slope_01_tsx 113309836: noise_dominated -> ok

Quellen: phase7_candidate_shortlist_full.json (Cross-Track/Konfidenz),
phase7_high_n_k2x.json bzw. phase7_hr_k1/k3.json (HR), phase7_visual_audit_cases.json (Audit).
