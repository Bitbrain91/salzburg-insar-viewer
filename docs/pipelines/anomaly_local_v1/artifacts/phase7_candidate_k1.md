# Kandidat k1 - volle Scorecard (P7-D-W1-T2)

Stand: 2026-06-10. Verdikt: **candidate_green**, Referenzfaelle ok: True.
Konfiguration: `{"experiment_id": "k1", "description": "Kandidat K1 = smalln_strict (konservativ)", "algorithm": "hdbscan", "mcs_fraction": 0.2, "mcs_cap": 8, "mcs_floor": 2, "min_samples_mode": "half", "cluster_selection_method": "eom", "allow_single_cluster": true, "cluster_selection_epsilon": 0.0, "optics_cluster_method": "xi", "optics_xi": 0.05, "optics_eps": 0.5, "matrix_features": null, "coherence_floor": null, "coherence_gate_mode": "absolute", "assignment_policy": "a0", "smalln_mode": "strict", "reassign_mode": "on"}`

| AOI | Lage | kept | noise | multi(robust) | nearest-mains | xtrack | bands |
| --- | --- | ---: | ---: | --- | ---: | ---: | --- |
| mirabell | flach | 1310 | 0.353 | 28(26) | 17 | 0.6497 | {'unstable': 22, 'stable': 41, 'monitor': 30} |
| moosstrasse | flach | 1601 | 0.279 | 70(60) | 34 | 0.4407 | {'unstable': 59, 'monitor': 41, 'stable': 67} |
| osthang | hang | 583 | 0.240 | 27(22) | 13 | 0.8497 | {'monitor': 22, 'stable': 38, 'unstable': 21} |
| bg_flat_01_snt | flach | 1042 | 0.296 | 45(23) | 39 | 0.5928 | {'unstable': 43, 'monitor': 37, 'stable': 50} |
| bg_slope_01_snt | hang | 660 | 0.335 | 18(16) | 14 | 0.1871 | {'stable': 38, 'unstable': 25, 'monitor': 19} |
| bg_flat_01_tsx | flach | 5981 | 0.374 | 72(58) | 23 | 0.5267 | {'stable': 34, 'monitor': 77, 'unstable': 48} |
| bg_slope_01_tsx | hang | 3969 | 0.287 | 50(43) | 10 | 0.0856 | {'unstable': 23, 'monitor': 51, 'stable': 38} |

Status-Aufwertungen vs Baseline (audit-pflichtig): 0

Quellen: phase7_candidate_shortlist_full.json (Cross-Track/Konfidenz),
phase7_high_n_k2x.json bzw. phase7_hr_k1/k3.json (HR), phase7_visual_audit_cases.json (Audit).
