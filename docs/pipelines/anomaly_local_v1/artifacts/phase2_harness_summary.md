# anomaly_local_v1 Phase-2 Harness Summary

Generated: 2026-04-23T21:59:27.478482+00:00
Bootstrap samples: 500
Bootstrap seed: 17

## AOI Runs

| AOI | Run ID | Buildings | Status counts | Reliability bands | Differential | Median reliability | Median agreement |
| --- | --- | ---: | --- | --- | ---: | ---: | ---: |
| Mirabell | `b816c7d9-97bd-4e4f-9f76-1bef4b02e077` | 58 | `{"insufficient_support": 13, "noise_dominated": 7, "ok": 24, "single_track_only": 6, "small_n": 8}` | `{"high": 22, "low": 11, "medium": 12, "unknown": 13}` | 0 | 0.75 | 0.65 |
| Moosstrasse | `578684cf-67f3-4899-bf68-a48009451dd0` | 147 | `{"insufficient_support": 40, "noise_dominated": 10, "ok": 65, "single_track_only": 12, "small_n": 20}` | `{"high": 42, "low": 25, "medium": 40, "unknown": 40}` | 3 | 0.69 | 0.45 |
| Osthang-Stressbereich | `93a50f3c-21d9-40fd-931a-12c12c2bd8a9` | 47 | `{"insufficient_support": 6, "noise_dominated": 2, "ok": 24, "single_track_only": 9, "small_n": 6}` | `{"high": 17, "low": 7, "medium": 17, "unknown": 6}` | 3 | 0.73 | 0.72 |

## Reference Cases

| Case | AOI | Building | Type | Status | Reliability | Agreement | Stability | Notes |
| --- | --- | --- | --- | --- | ---: | ---: | --- | --- |
| mirabell_standard_high_conf | Mirabell | `548205` | `standard_ok` | `ok` | 0.98 | 1.00 | `monitor` | High reliability is paired with at least one unstable track-local bootstrap signal. |
| mirabell_adjacent_standard | Mirabell | `548204` | `adjacent_ok` | `ok` | 0.91 | 0.65 | `monitor` | none |
| moosstrasse_differential_anchor | Moosstrasse | `96637447` | `differential_motion` | `ok` | 0.76 | 0.90 | `monitor` | High reliability is paired with at least one unstable track-local bootstrap signal. |
| moosstrasse_differential_low_agreement | Moosstrasse | `96637522` | `differential_motion_low_reliability` | `ok` | 0.52 | 0.45 | `monitor` | none |
| moosstrasse_single_track_only | Moosstrasse | `96637488` | `single_track_only` | `single_track_only` | 0.33 | n/a | `monitor` | none |
| moosstrasse_small_n | Moosstrasse | `96959854` | `small_n` | `small_n` | 0.14 | n/a | `monitor` | Status is already a small-sample guard; bootstrap values are diagnostic only. |
| moosstrasse_noise_dominated | Moosstrasse | `96637551` | `noise_dominated` | `noise_dominated` | 0.10 | n/a | `monitor` | none |
| osthang_insufficient_support | Osthang-Stressbereich | `395674088` | `insufficient_support` | `insufficient_support` | n/a | n/a | `unstable` | Status is already a small-sample guard; bootstrap values are diagnostic only. |
