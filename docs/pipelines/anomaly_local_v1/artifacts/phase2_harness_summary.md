# anomaly_local_v1 Phase-2 Harness Summary

Generated: 2026-04-25T06:40:03.068499+00:00
Bootstrap samples: 500
Bootstrap seed: 17

## AOI Runs

| AOI | Run ID | Buildings | Status counts | Reliability bands | Differential | Median reliability | Median agreement |
| --- | --- | ---: | --- | --- | ---: | ---: | ---: |
| Mirabell | `b5c20834-6b5d-4a8f-b2a7-90ce623c78f7` | 58 | `{"insufficient_support": 13, "noise_dominated": 7, "ok": 24, "single_track_only": 6, "small_n": 8}` | `{"high": 20, "low": 11, "medium": 14, "unknown": 13}` | 0 | 0.72 | 0.65 |
| Moosstrasse | `fa27294d-a4f9-4ba8-97ef-5dafb4eb99e5` | 147 | `{"insufficient_support": 40, "noise_dominated": 10, "ok": 65, "single_track_only": 12, "small_n": 20}` | `{"high": 28, "low": 31, "medium": 48, "unknown": 40}` | 3 | 0.60 | 0.45 |
| Osthang-Stressbereich | `71770d85-ec8c-4354-840a-545fa0b7c757` | 47 | `{"insufficient_support": 6, "noise_dominated": 2, "ok": 24, "single_track_only": 9, "small_n": 6}` | `{"high": 12, "low": 8, "medium": 21, "unknown": 6}` | 3 | 0.70 | 0.72 |

## Neighbourhood Diagnostics

| AOI | Run ID | Buildings with context | Misassignment points | Buildings with misassignment | Event buildings |
| --- | --- | ---: | ---: | ---: | ---: |
| Mirabell | `b5c20834-6b5d-4a8f-b2a7-90ce623c78f7` | 22 | 2 | 2 | 2 |
| Moosstrasse | `fa27294d-a4f9-4ba8-97ef-5dafb4eb99e5` | 106 | 2 | 2 | 12 |
| Osthang-Stressbereich | `71770d85-ec8c-4354-840a-545fa0b7c757` | 34 | 6 | 6 | 10 |

## Reference Cases

| Case | AOI | Building | Type | Status | Reliability | Agreement | Nbr ctx | Misassign | Event | Stability | Notes |
| --- | --- | --- | --- | --- | ---: | ---: | --- | ---: | --- | --- | --- |
| mirabell_standard_high_conf | Mirabell | `548205` | `standard_ok` | `ok` | 0.88 | 1.00 | `yes` | 1 | `no` | `monitor` | High reliability is paired with at least one unstable track-local bootstrap signal. |
| mirabell_adjacent_standard | Mirabell | `548204` | `adjacent_ok` | `ok` | 0.91 | 0.65 | `no` | 0 | `no` | `monitor` | none |
| moosstrasse_differential_anchor | Moosstrasse | `96637447` | `differential_motion` | `ok` | 0.76 | 0.90 | `yes` | 0 | `no` | `monitor` | High reliability is paired with at least one unstable track-local bootstrap signal. |
| moosstrasse_differential_low_agreement | Moosstrasse | `96637522` | `differential_motion_low_reliability` | `ok` | 0.52 | 0.45 | `no` | 0 | `no` | `monitor` | none |
| moosstrasse_single_track_only | Moosstrasse | `96637488` | `single_track_only` | `single_track_only` | 0.33 | n/a | `no` | 0 | `no` | `monitor` | none |
| moosstrasse_small_n | Moosstrasse | `96959854` | `small_n` | `small_n` | 0.04 | n/a | `yes` | 1 | `no` | `monitor` | Status is already a small-sample guard; bootstrap values are diagnostic only. |
| moosstrasse_noise_dominated | Moosstrasse | `96637551` | `noise_dominated` | `noise_dominated` | 0.00 | n/a | `yes` | 0 | `no` | `monitor` | none |
| osthang_insufficient_support | Osthang-Stressbereich | `395674088` | `insufficient_support` | `insufficient_support` | n/a | n/a | `no` | 0 | `no` | `unstable` | Status is already a small-sample guard; bootstrap values are diagnostic only. |
