# anomaly_local_v1 Phase-2 Harness Summary

Generated: 2026-04-28T09:52:04.007790+00:00
Bootstrap samples: 500
Bootstrap seed: 17

## AOI Runs

| AOI | Run ID | Buildings | Status counts | Reliability bands | Differential | Median reliability | Median agreement |
| --- | --- | ---: | --- | --- | ---: | ---: | ---: |
| Mirabell | `e340a003-942f-5a14-9a30-0e388c5a06cf` | 58 | `{"insufficient_support": 14, "noise_dominated": 7, "ok": 23, "single_track_only": 7, "small_n": 7}` | `{"high": 19, "low": 8, "medium": 17, "unknown": 14}` | 0 | 0.73 | 0.63 |
| Moosstrasse | `5be5fc3c-d2ea-571d-97c2-97ad03227bca` | 147 | `{"insufficient_support": 41, "noise_dominated": 9, "ok": 65, "single_track_only": 11, "small_n": 21}` | `{"high": 24, "low": 31, "medium": 51, "unknown": 41}` | 4 | 0.61 | 0.45 |
| Osthang-Stressbereich | `ac578960-681c-5e8c-93d4-82fd32d375f1` | 47 | `{"insufficient_support": 6, "noise_dominated": 1, "ok": 26, "single_track_only": 8, "small_n": 6}` | `{"high": 12, "low": 6, "medium": 23, "unknown": 6}` | 2 | 0.71 | 0.74 |

## Neighbourhood Diagnostics

| AOI | Run ID | Buildings with context | Misassignment points | Buildings with misassignment | Event buildings |
| --- | --- | ---: | ---: | ---: | ---: |
| Mirabell | `e340a003-942f-5a14-9a30-0e388c5a06cf` | 22 | 0 | 0 | 1 |
| Moosstrasse | `5be5fc3c-d2ea-571d-97c2-97ad03227bca` | 105 | 5 | 5 | 9 |
| Osthang-Stressbereich | `ac578960-681c-5e8c-93d4-82fd32d375f1` | 34 | 6 | 4 | 8 |

## Reference Cases

| Case | AOI | Building | Type | Status | Reliability | Agreement | Nbr ctx | Misassign | Event | Stability | Notes |
| --- | --- | --- | --- | --- | ---: | ---: | --- | ---: | --- | --- | --- |
| mirabell_standard_high_conf | Mirabell | `548205` | `standard_ok` | `single_track_only` | 0.73 | n/a | `yes` | 0 | `no` | `monitor` | none |
| mirabell_adjacent_standard | Mirabell | `548204` | `adjacent_ok` | `ok` | 0.91 | 0.65 | `no` | 0 | `no` | `monitor` | none |
| moosstrasse_differential_anchor | Moosstrasse | `96637447` | `differential_motion` | `ok` | 0.74 | 0.81 | `yes` | 0 | `no` | `monitor` | none |
| moosstrasse_differential_low_agreement | Moosstrasse | `96637522` | `differential_motion_low_reliability` | `ok` | 0.52 | 0.36 | `no` | 0 | `no` | `monitor` | none |
| moosstrasse_single_track_only | Moosstrasse | `96637488` | `single_track_only` | `single_track_only` | 0.33 | n/a | `no` | 0 | `no` | `monitor` | none |
| moosstrasse_small_n | Moosstrasse | `96959854` | `small_n` | `small_n` | 0.04 | n/a | `yes` | 0 | `no` | `monitor` | Status is already a small-sample guard; bootstrap values are diagnostic only. |
| moosstrasse_noise_dominated | Moosstrasse | `96637551` | `noise_dominated` | `noise_dominated` | 0.00 | n/a | `yes` | 0 | `no` | `monitor` | none |
| osthang_insufficient_support | Osthang-Stressbereich | `395674088` | `insufficient_support` | `insufficient_support` | n/a | n/a | `no` | 0 | `no` | `unstable` | Status is already a small-sample guard; bootstrap values are diagnostic only. |
