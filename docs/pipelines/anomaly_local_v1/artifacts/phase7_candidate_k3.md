# Kandidat k3 - volle Scorecard (P7-D-W1-T2)

Stand: 2026-06-10. Verdikt: **candidate_green**, Referenzfaelle ok: True.
Konfiguration: `{"experiment_id": "k3", "description": "Kandidat K3 = a3_height", "algorithm": "hdbscan", "mcs_fraction": 0.2, "mcs_cap": 8, "mcs_floor": 2, "min_samples_mode": "half", "cluster_selection_method": "eom", "allow_single_cluster": true, "cluster_selection_epsilon": 0.0, "optics_cluster_method": "xi", "optics_xi": 0.05, "optics_eps": 0.5, "matrix_features": null, "coherence_floor": null, "coherence_gate_mode": "absolute", "assignment_policy": "a3_height", "smalln_mode": "baseline", "reassign_mode": "on"}`

| AOI | Lage | kept | noise | multi(robust) | nearest-mains | xtrack | bands |
| --- | --- | ---: | ---: | --- | ---: | ---: | --- |
| mirabell | flach | 1239 | 0.320 | 28(28) | 12 | 0.676 | {'unstable': 25, 'stable': 34, 'monitor': 30} |
| moosstrasse | flach | 1493 | 0.269 | 67(59) | 30 | 0.4383 | {'unstable': 51, 'monitor': 43, 'stable': 73} |
| osthang | hang | 515 | 0.248 | 25(23) | 10 | 0.8497 | {'monitor': 19, 'stable': 42, 'unstable': 16} |
| bg_flat_01_snt | flach | 972 | 0.271 | 42(26) | 28 | 0.6444 | {'unstable': 46, 'stable': 50, 'monitor': 32} |
| bg_slope_01_snt | hang | 626 | 0.310 | 17(16) | 10 | 0.1846 | {'stable': 37, 'unstable': 24, 'monitor': 20} |
| bg_flat_01_tsx | flach | 5674 | 0.364 | 71(61) | 18 | 0.4709 | {'stable': 34, 'monitor': 80, 'unstable': 45} |
| bg_slope_01_tsx | hang | 3812 | 0.279 | 49(44) | 6 | 0.0843 | {'stable': 43, 'unstable': 23, 'monitor': 46} |

Status-Aufwertungen vs Baseline (audit-pflichtig): 11
- mirabell 54773193: noise_dominated -> ok
- moosstrasse 96637502: noise_dominated -> ok
- moosstrasse 96955326: small_n -> single_track_only
- moosstrasse 96955370: noise_dominated -> ok
- bg_flat_01_snt 238099964: noise_dominated -> ok
- bg_flat_01_snt 238099968: noise_dominated -> ok
- bg_flat_01_snt 238099991: noise_dominated -> ok
- bg_flat_01_tsx 227901743: noise_dominated -> ok
- bg_flat_01_tsx 238099979: noise_dominated -> ok
- bg_flat_01_tsx 238100083: noise_dominated -> ok
- bg_slope_01_tsx 113309836: noise_dominated -> ok

Quellen: phase7_candidate_shortlist_full.json (Cross-Track/Konfidenz),
phase7_high_n_k2x.json bzw. phase7_hr_k1/k3.json (HR), phase7_visual_audit_cases.json (Audit).
