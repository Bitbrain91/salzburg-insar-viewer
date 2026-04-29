# `anomaly_local_v1` Phase-6 PS-InSAR Semantics Report

Stand: 2026-04-28
Worker: `P6-W1`, integrated by `P6-W3/W4`
Status: `green`
Scope: Tickets `P6-W1-T1`, `P6-W1-T2`, `P6-W1-T3`, `P6-W2`, `P6-W3`, `P6-W4`

## Executive decision

W1 found no hard source blocker. W2 implemented the 2D vector geometry and W3
verified it against the mandatory AOIs. The final Phase-6 decision is:

`keep_2d_vector`

Rationale: the 2D vector is source-correct for the documented AUGMENTERRA track
geometry, AOI-level status and reliability metrics remain explainable, and no broad
regression was observed in the mandatory Mirabell, Moosstrasse and Osthang runs.

Explicit caveat: reference case `mirabell_standard_high_conf` / building `548205`
changed from expected `ok` to `single_track_only`. This is an explainable weak
secondary-track small-N sensitivity, not a hidden regression. The old T95 support
was already weak with only two core points; after vectorized projection only one
T95 core point remains. This needs follow-up monitoring, but it does not overturn
the final `keep_2d_vector` decision.

No backend, frontend, harness, methodik, PDF or generated artifact is changed by
this W3/W4 documentation integration.

## Source basis

Primary point-semantics source:

- `docs/research/external/TREALTAMIRA_handbook_2.2_20180604.pdf`

Primary project geometry and sign sources:

- `docs/pipelines/anomaly_local_v1/ps_insar_semantics_decision.md`
- `docs/research/external/AUGMENTERRA_InSAR_Handbook_v1_3.pdf`

Implementation and prior-audit baseline:

- `docs/pipelines/anomaly_local_v1/methodik.md`
- `docs/pipelines/anomaly_local_v1/phase5_data_correctness_report.md`
- `docs/pipelines/anomaly_local_v1/artifacts/phase5_P5-W2-T2.md`
- `docs/pipelines/anomaly_local_v1/artifacts/phase5_P5-W3-T1.md`
- `docs/research/Datenanalyse_InSAR_Salzburg.md`
- `backend/app/ml/pipelines/anomaly_local_v1.py`
- `backend/app/routers/ml.py`
- `backend/app/routers/api.py`
- `frontend/src/lib/cameraModes.ts`
- `frontend/src/components/LayerPanel.tsx`

PDF extraction note: `pdfinfo` and `pdftotext` were not installed in this environment.
The PDFs were read locally with `pypdf` and checked against selected page text. The
report paraphrases the handbook content and uses no long copied PDF text.

## P6-W1-T1: Source and handbook evaluation

### AUGMENTERRA project response

The project decision document records the AUGMENTERRA response from 2026-04-28:

- `los = A` means ascending.
- `los = D` means descending.
- Track `44` is Sentinel-1 orbit `44`, look bearing `81.4 deg`, incidence/off-nadir
  `38.81 deg`.
- Track `95` is Sentinel-1 orbit `95`, look bearing `281.5 deg`, incidence/off-nadir
  `38.48 deg`.
- Negative `velocity` and `displacement` mean LOS lengthening, i.e. movement away
  from the satellite.
- Positive values mean movement toward the satellite.

This resolves the old P5 `inconclusive` source gap for the physical track direction.
P5 remains historically correct as an audit result, but P6 should use the new
decision document as the active project contract.

### TRE ALTAMIRA handbook findings

TRE ALTAMIRA is the primary source for point semantics in this report. Relevant
findings:

- SqueeSAR uses multi-temporal SAR images from the same area, mode and geometry. TRE
  states a minimum data stack of about 15-20 SAR images for the technique.
- Measurement points are selected from stable radar behavior. The handbook separates
  point-wise Permanent Scatterers (`PS`) from Distributed Scatterers (`DS`), where DS
  represent homogeneous patches rather than exact single targets.
- For each measurement point, SqueeSAR provides position/elevation, average annual
  displacement rate in LOS, and displacement time series in LOS.
- All SqueeSAR displacement measurements are 1D LOS measurements and are differential
  in space and time: relative to a reference point and to the first acquisition date.
- Coordinates and elevation are estimated from SAR geometry and elevation. For
  C-band Sentinel (`SNT`) examples, the handbook gives meter-scale point-location
  precision, not cadastral precision.
- Displacement precision improves with number of images, longer time span, temporal
  continuity, point density and distance to the reference point. A typical good case
  with at least 30 scenes over two years is below 1 mm/year standard deviation for
  average displacement rate, with single measurements around millimetre precision.
- TRE distinguishes temporal coherence from interferogram coherence. Temporal
  coherence is a 0-1 model-fit indicator for a measurement point; higher means lower
  residual against the selected motion model. It should not be directly compared
  across independent SqueeSAR processings.
- Fast or isolated motion can cause phase-unwrapping ambiguity; spatial support and
  acquisition frequency help resolve it.
- Ascending and descending LOS measurements cannot be directly compared as if they
  observed the same motion component. A vertical reprojection from one LOS is only a
  real vertical displacement when horizontal motion is negligible.
- True 2D vertical/east-west decomposition requires both acquisition geometries over
  the same period and usually operates on cells/pseudo-measurement-points, not on
  exact point-to-point matches. North-south motion remains weakly observable.
- Time series can support derived acceleration, seasonality and interval-specific
  displacement/rate fields; these are derived analytics, not separate sensors.
- SAR geometry is range/azimuth based. LOS is the sensor-to-target slant range and is
  inclined by the off-nadir/incidence angle.
- Topography can create foreshortening, layover and shadowing. Layover/shadowing are
  not reliable for quantitative interpretation.
- Coherence/decorrelation is affected by terrain slope and orientation, surface
  properties, temporal baseline, normal baseline, vegetation and rapid surface
  changes.

### AUGMENTERRA handbook findings

The AUGMENTERRA handbook is consistent with the project response and supplies
project-local attribute semantics:

- ASC geometry moves south-to-north; DSC moves north-to-south.
- The radar look direction is side-looking and normally right-looking: ASC looks
  generally east, DSC generally west.
- Real movement is projected into LOS according to look direction and incidence
  angle; motion perpendicular to LOS is not detected.
- LOS displacement signs are project-explicit: positive is movement toward the
  satellite, negative is movement away.
- Vertical and east-west decomposition needs both ASC and DSC data. The resulting
  decomposed pseudo-points have lower point density and are not the same product as
  single-geometry measurement points.
- `height` is a WGS84 ellipsoid point height, `h_stdev` is its uncertainty,
  `incidence_angle` is the radar incidence angle at the point, `coherence` is a
  model-fit/signal-stability indicator, and `eff_area` describes DS effective area
  while PS has `eff_area = 0`.
- `vel`, `acc`, seasonal fields and `dYYYYMMDD` displacement fields are LOS-based.
  The time-series fields are the basis for trend, acceleration and seasonal analysis.

## W1 implementation snapshot before W2

At the start of W1, before the Phase-6 geometry implementation, the active code
implemented:

- Candidate-area range offset:
  `clamp(building_height * tan(incidence_angle) * buffer_multiplier, min_buffer_m, max_buffer_m)`.
- Pipeline candidate shift in UTM-X only:
  `track 44`/`los A` -> `-range_offset_m`, otherwise `+range_offset_m`.
- ML context API candidate areas with the same X-only sign:
  `CASE WHEN track = 44 THEN -range_offset_m ELSE range_offset_m END`.
- Frontend camera help: Track 44 looks east, Track 95 looks west.
- Hard gates:
  `no_building_assignment`, `valid_epoch_count < 24`,
  `valid_epoch_ratio < 0.50`, and `coherence < max(0.45, track_p05)`.
- `vertical_proxy = velocity / cos(incidence_angle)`.
- Clustering features include spatial offsets, height rank, `velocity`,
  `acceleration` and `coherence_penalty`.
- Scoring features include velocity uncertainty, TS trend/residual/roughness/steps,
  missingness, seasonality, optional amplitude TS features, building height, terrain
  context and local density.
- Reliability is soft and building-level: support, signal quality, assignment
  quality and track agreement are combined with band caps/penalties.

## PS-InSAR point semantics

### Gate-Rules

Evaluation: mostly confirmed, with threshold-status caveats.

`min_valid_epochs = 24` is compatible with TRE's minimum SqueeSAR stack guidance
because it is above the 15-20 image floor. It is still an engineering threshold, not
a handbook-derived universal constant. With Salzburg tracks offering 88-90 expected
epochs, `min_valid_epoch_ratio = 0.50` is a pragmatic protection against sparse time
series while still allowing missing data.

The coherence gate is defensible because both handbooks treat low coherence/signal
instability as a strong warning. However, the active threshold
`max(0.45, track_p05)` is intentionally a low hard floor. It should be described as
a "remove very weak points" gate, not as a guarantee of high reliability. Higher
confidence is correctly handled later through signal quality and reliability.

The `nearest_assignment` penalty is confirmed. TRE/AUGMENTERRA both imply
meter-scale point and object matching uncertainty; nearest-only assignment should
remain lower confidence than within/directional assignment.

### `vertical_proxy = velocity / cos(incidence_angle)`

Evaluation: confirmed as a pragmatic proxy, not as true decomposition.

The formula preserves the AUGMENTERRA sign convention. For mostly vertical motion,
positive LOS maps to positive uplift proxy and negative LOS maps to subsidence proxy.
This matches the current API threshold semantics for common vertical interpretation.

The limitation is important: TRE explicitly warns that one-geometry LOS
reprojection gives true vertical displacement only if horizontal components are
negligible. Therefore the field must remain named and documented as a proxy. It
should not be sold as real vertical motion or used as an absolute truth in
cross-track comparisons.

### `height`

Evaluation: confirmed with soft-use limits.

AUGMENTERRA defines `height` as WGS84 ellipsoid point height. TRE explains that MP
coordinates and elevation are estimated through SAR geocoding, with meter-scale
precision. The current methodik correctly avoids subtracting SRTM terrain from
point `height` as a hard physical feature.

The current pipeline uses building height, not point height, for the candidate-area
range offset. That is a good building-assignment heuristic. Point `height` is used
only as a within-building rank/soft feature, which is consistent with the source
limits.

Follow-up: `h_stdev` is available in the source schema but not used in the current
pipeline. It can remain deferred, but should be considered for reliability once the
assignment geometry has stabilized.

### `incidence_angle`

Evaluation: confirmed and required for geometry.

Both handbooks define LOS/off-nadir/incidence as central to SAR geometry. The active
range-offset formula uses `tan(incidence_angle)` and the vertical proxy uses
`cos(incidence_angle)`, which is consistent with that geometry.

The current implementation uses per-point incidence where available and a default
near `38.5 deg`. The new AUGMENTERRA contract gives track constants
`38.81 deg` for T44 and `38.48 deg` for T95. W2 should centralize these constants
for track geometry metadata, while still allowing point-level or median incidence in
the offset computation when that is the active data contract.

### `coherence`

Evaluation: confirmed as a signal/model quality feature.

TRE's temporal coherence is a 0-1 model-fit indicator for the selected measurement
point time series. AUGMENTERRA describes high values, for example above roughly
`0.7`, as reliable. The current code uses coherence in three defensive ways:

- hard exclusion only for very weak points,
- `coherence_penalty` as a clustering feature,
- `signal_quality` and reliability as soft scoring inputs.

This is appropriate. The main documentation adjustment is to avoid implying that
coherence is directly comparable across independent SqueeSAR processings. In this
pipeline it is used within the same Salzburg processing and track context, which is
acceptable.

### Time-series features

Evaluation: confirmed.

TRE states that displacement time series reveal behavior that mean annual velocity
alone cannot capture, including nonlinear behavior, seasonality, acceleration and
timing of changes. The current pipeline's `ts_slope`, `ts_residual_std`,
`ts_max_abs_delta`, `ts_roughness`, `ts_missing_rate` and step support align with
this interpretation.

Amplitude features are also defensible as optional signal-stability/context
features because SAR amplitude reflects backscatter energy and PS selection depends
partly on stable radar return. The current optional handling is correct because the
Salzburg inventory shows weaker AMP coverage for Track 95.

### Acceleration

Evaluation: confirmed with uncertainty follow-up.

TRE and AUGMENTERRA both treat acceleration as a derived time-series attribute in
LOS units. Using `acceleration` as a local clustering/deviation feature is
consistent with the source semantics because it is not treated as an independent
3D-motion vector.

Follow-up: `a_stdev` exists but is not used in the active pipeline. A later tuning
ticket should evaluate whether high acceleration uncertainty should soften
acceleration-driven outlier behavior.

### Seasonality

Evaluation: confirmed with deferred expansion.

TRE derives seasonality with a harmonic component and AUGMENTERRA exposes
`season_amp`, `s_amp_std`, `season_phs`, and `s_phs_std`. The current pipeline uses
`season_amp` as a scoring/context feature, which is appropriate and conservative.

Deferred research: seasonal phase and seasonal uncertainty are not yet used. That is
not a W1 blocker, but these fields could improve distinction between coherent
building behavior and isolated seasonal artefacts.

### Building-Level-Reliability

Evaluation: confirmed as a defensive aggregation layer.

TRE warns that different acquisition geometries can observe different physical
objects and that decomposed products are derived from pseudo-points/cells. The
current building reliability design does not pretend a building has one exact
ground-truth motion. It combines local support, signal quality, assignment quality,
track agreement, weak secondary-track caps, noise/exclusion counts and differential
motion flags.

This is the right level of caution for building summaries. It should remain a
confidence summary over observed points/clusters, not a certified structural-health
classification.

### Retuning penalties

Evaluation: confirmed, no broad retuning in W1.

The current soft penalties for weak main-cluster support and low track agreement are
consistent with TRE's warnings about point density, different LOS objects, temporal
quality and geometry differences. They are also appropriately non-destructive:
penalties lower reliability but do not silently rewrite the source measurements.

No handbook finding requires broad HDBSCAN, reliability or neighbourhood retuning in
W1. The geometry implementation may change assignment composition, so retuning must
wait until after AOI comparison of x-only versus 2D vector.

## P6-W1-T2 decision lists

### confirmed

- The active data should be interpreted as PS/SqueeSAR measurement points with
  LOS-based velocity, displacement time series, acceleration and seasonal fields.
- `los = A`/`D` as ascending/descending and Track `44`/`95` labels are confirmed by
  AUGMENTERRA.
- The sign convention is confirmed: positive is toward the satellite, negative is
  away from the satellite.
- Candidate offsets based on `height * tan(incidence_angle)` are geometry-plausible
  for elevated building scatterers.
- Avoiding hard point-height-minus-terrain conclusions is correct because point
  `height` is ellipsoidal/SAR-derived and has geocoding uncertainty.
- Coherence is a valid signal/model-quality feature and hard gate for very weak
  points.
- Time-series trend, residual, roughness, step, acceleration and seasonality features
  are valid derived features for SqueeSAR time series.
- `nearest_assignment` should remain penalized.
- Building reliability should remain a soft confidence summary.

### needs_adjustment

- Replace x-only candidate-area translation with the 2D sensor/near-range vector
  defined below.
- Replace the active pipeline's x-only/coarse `along_look_offset_m` and
  `cross_look_offset_m` calculation with true vector projections from the same
  Track `44`/`95` geometry contract.
- Centralize the Track `44`/`95` geometry contract so pipeline and ML context API do
  not duplicate divergent signs or vectors.
- Expose or persist vector metadata where useful for auditability:
  `look_bearing_deg`, `sensor_bearing_deg`, `range_dx`, `range_dy`,
  `range_shift_x_m`, `range_shift_y_m`.
- Document `vertical_proxy` as a sign-preserving vertical approximation, not true
  vertical decomposition.
- Document the coherence hard gate as a low-quality exclusion gate, not as a
  high-reliability threshold.
- Re-check UI camera text after backend geometry changes. The coarse statement
  "T44 east / T95 west" is correct, but exact camera bearings need MapLibre visual
  verification before changing from the current presets.

### defer/research

- True vertical/east-west decomposition from ASC and DSC should remain deferred; the
  current product is single-geometry point semantics, not decomposed pseudo-MP data.
- `h_stdev`, `a_stdev`, `s_amp_std`, `season_phs`, `s_phs_std` and `eff_area`
  should be evaluated after geometry stabilization.
- Coherence threshold retuning should wait for AOI runs and should not be inferred
  from a generic handbook value alone.
- Broad HDBSCAN/reliability/neighbourhood retuning is out of W1 scope and should wait
  until after the 2D-vector assignment delta is measured.
- Terrain/aspect/DSM-DTM reintroduction remains out of Phase-6 W1 scope.

## P6-W1-T3: Track geometry contract

Bearings are degrees clockwise from north. Metric vectors are expressed in UTM-like
east/north axes:

- `dx = sin(bearing_rad)`
- `dy = cos(bearing_rad)`

For candidate areas, use the sensor/near-range direction, i.e. the opposite of the
AUGMENTERRA look bearing:

- `sensor_bearing_deg = (look_bearing_deg + 180) % 360`
- `shift_x_m = dx(sensor_bearing_deg) * range_offset_m`
- `shift_y_m = dy(sensor_bearing_deg) * range_offset_m`
- candidate geometry:
  `ST_Buffer(ST_Union(building_geom_utm, ST_Translate(building_geom_utm, shift_x_m, shift_y_m)), lateral_slack_m)`

For spatial features, use the look vector, not the current x-only/coarse sign logic.
Given a point-to-building-centroid delta in metric coordinates:

- `delta_x_m = point_x_m - building_centroid_x_m`
- `delta_y_m = point_y_m - building_centroid_y_m`
- `look_dx = sin(look_bearing_rad)`
- `look_dy = cos(look_bearing_rad)`
- `cross_dx = -look_dy`
- `cross_dy = look_dx`
- `along_look_offset_m = delta_x_m * look_dx + delta_y_m * look_dy`
- `cross_look_offset_m = delta_x_m * cross_dx + delta_y_m * cross_dy`

This path is part of the W2 design gate, not optional cleanup. These features are
persisted in `ml_point_results.meta.building_context`, used by clustering and local
deviation scoring, and exposed through ML point/context API responses as relevant.
They must therefore move in lockstep with candidate-area geometry so the pipeline
does not assign with a 2D vector while scoring with the old x-only approximation.

| Track | LOS | Look bearing | Incidence | Look vector `(dx, dy)` | Sensor bearing | Sensor vector `(dx, dy)` |
| ---: | --- | ---: | ---: | --- | ---: | --- |
| `44` | `A` | `81.4 deg` | `38.81 deg` | `(0.9888, 0.1495)` | `261.4 deg` | `(-0.9888, -0.1495)` |
| `95` | `D` | `281.5 deg` | `38.48 deg` | `(-0.9799, 0.1994)` | `101.5 deg` | `(0.9799, -0.1994)` |

Current x-only behavior approximates only the dominant east-west part:

- Track `44`: current `(-1, 0)` versus target `(-0.9888, -0.1495)`.
- Track `95`: current `(1, 0)` versus target `(0.9799, -0.1994)`.

At `range_offset_m = 30 m`, the missing south component is about `4.5 m` for Track
`44` and `6.0 m` for Track `95`. This is large enough relative to building edges
and point-geocoding uncertainty that it should be implemented and measured, not
ignored by default.

### Files affected by the next implementation wave

Expected W2 write set if the supervisor accepts this W1 gate:

- `backend/app/ml/pipelines/anomaly_local_v1.py`
  - replace x-only `ST_Translate(..., shift_sign * range_offset_m, 0.0)` with the
    2D sensor vector.
  - replace current `along_look_offset_m` / `cross_look_offset_m` x-only/coarse
    feature logic with the vector projection formula above.
  - keep the existing range-offset magnitude formula unless AOI evidence later says
    otherwise.
  - persist the projected spatial features and consider storing vector metadata in
    `ml_point_results.meta.building_context`.
- `backend/app/routers/ml.py`
  - build ML focus `candidate_areas` with the exact same vector logic.
  - keep returned ML point/context properties consistent with the projected
    `along_look_offset_m` / `cross_look_offset_m` semantics where those values are
    exposed, and include vector metadata in candidate feature properties if useful
    for UI/debug.
- `backend/app/routers/api.py`
  - optional only: expose exact track geometry in `/api/config` if UI or external
    callers need it.
- `frontend/src/lib/cameraModes.ts`
  - do not change camera bearings until MapLibre bearing semantics are verified with
    screenshots.
- `frontend/src/components/LayerPanel.tsx`
  - update helper text only if exact geometry metadata becomes user-visible.

### W1 design gate

Decision: `implement_2d_vector`.

Rationale:

- The AUGMENTERRA project source supplies concrete look bearings and incidence
  values for both tracks.
- TRE/AUGMENTERRA geometry confirms that LOS/range direction and incidence are
  central to point interpretation.
- The current x-only logic is internally consistent but knowingly drops a measurable
  north/south component.
- Implementing the 2D vector is a small, auditable geometry correction that can be
  tested against the mandatory AOIs.
- No handbook finding requires blocking the geometry change before implementation.

Gate condition for final `keep_2d_vector`:

- AOI comparison must show that Mirabell, Moosstrasse and Osthang remain explainable
  and do not show unacceptable regressions in assigned points, assignment method
  mix, kept points, building status, reliability bands or candidate-area placement.

## P6-W2: Implementation summary

W2 implemented the W1 design gate as a small geometry correction:

- Central track geometry was introduced in `backend/app/ml/track_geometry.py` with
  the AUGMENTERRA contract for Track `44` and Track `95`.
- The pipeline now uses the central geometry for 2D range shifts:
  `range_shift_x_m = range_dx * range_offset_m` and
  `range_shift_y_m = range_dy * range_offset_m`.
- Candidate-area translation in the pipeline and ML context API uses the same 2D
  sensor/near-range vector instead of the old x-only approximation.
- Spatial features now use projected `along_look_offset_m` and
  `cross_look_offset_m` from the track look vector.
- Geometry metadata is persisted/exposed for auditability where available:
  `look_bearing_deg`, `sensor_bearing_deg`, `range_dx`, `range_dy`,
  `range_shift_x_m`, `range_shift_y_m`, and the geometry contract version.
- The API config exposes the shared track geometry contract.
- UI/methodik text was updated by adjacent workers to describe the corrected 2D
  geometry. No UI camera-preset rollback was required after screenshot checks.

W2 kept the existing offset magnitude formula and reliability/scoring thresholds.
That containment is important: W3 therefore verifies the geometry change, not a
mixed geometry plus retuning change.

## P6-W3: AOI verification results

Mandatory AOI reruns:

| AOI | Run ID | Buildings | Status counts | Reliability bands | Differential | Median reliability | Median agreement |
| --- | --- | ---: | --- | --- | ---: | ---: | ---: |
| Mirabell | `e340a003-942f-5a14-9a30-0e388c5a06cf` | 58 | `{"insufficient_support": 14, "noise_dominated": 7, "ok": 23, "single_track_only": 7, "small_n": 7}` | `{"high": 19, "low": 8, "medium": 17, "unknown": 14}` | 0 | 0.73 | 0.63 |
| Moosstrasse | `5be5fc3c-d2ea-571d-97c2-97ad03227bca` | 147 | `{"insufficient_support": 41, "noise_dominated": 9, "ok": 65, "single_track_only": 11, "small_n": 21}` | `{"high": 24, "low": 31, "medium": 51, "unknown": 41}` | 4 | 0.61 | 0.45 |
| Osthang-Stressbereich | `ac578960-681c-5e8c-93d4-82fd32d375f1` | 47 | `{"insufficient_support": 6, "noise_dominated": 1, "ok": 26, "single_track_only": 8, "small_n": 6}` | `{"high": 12, "low": 6, "medium": 23, "unknown": 6}` | 2 | 0.71 | 0.74 |

Neighbourhood diagnostics remained explainable:

| AOI | Buildings with context | Misassignment points | Buildings with misassignment | Event buildings |
| --- | ---: | ---: | ---: | ---: |
| Mirabell | 22 | 0 | 0 | 1 |
| Moosstrasse | 105 | 5 | 5 | 9 |
| Osthang-Stressbereich | 34 | 6 | 4 | 8 |

Reference-case result:

| Case | AOI | Building | Expected | Actual | Reliability | Agreement | Assessment |
| --- | --- | --- | --- | --- | ---: | ---: | --- |
| `mirabell_standard_high_conf` | Mirabell | `548205` | `ok` | `single_track_only` | 0.73 | n/a | explainable caveat |
| `mirabell_adjacent_standard` | Mirabell | `548204` | `ok` | `ok` | 0.91 | 0.65 | stable |
| `moosstrasse_differential_anchor` | Moosstrasse | `96637447` | `ok` | `ok` | 0.74 | 0.81 | stable |
| `moosstrasse_differential_low_agreement` | Moosstrasse | `96637522` | `ok` | `ok` | 0.52 | 0.36 | stable |
| `moosstrasse_single_track_only` | Moosstrasse | `96637488` | `single_track_only` | `single_track_only` | 0.33 | n/a | stable |
| `moosstrasse_small_n` | Moosstrasse | `96959854` | `small_n` | `small_n` | 0.04 | n/a | stable |
| `moosstrasse_noise_dominated` | Moosstrasse | `96637551` | `noise_dominated` | `noise_dominated` | 0.00 | n/a | stable |
| `osthang_insufficient_support` | Osthang-Stressbereich | `395674088` | `insufficient_support` | `insufficient_support` | n/a | n/a | stable |

### Mirabell 548205 regression note

The only reference-case status shift is `mirabell_standard_high_conf` / building
`548205`: expected `ok`, actual `single_track_only`.

This is explainable from point support:

- Prior baseline: Track `44` core `7`, Track `95` core `2`, status `ok`,
  reliability about `0.88`, agreement about `1.00`.
- Phase-6 vectorized run: Track `44` core `7`, Track `95` core `1`, status
  `single_track_only`, reliability `0.73`, agreement `n/a`.
- The remaining Track `95` core point still has plausible signal quality
  (`cluster_reliability_score = 0.645`), but one secondary-track point is not enough
  to keep the building as a reliable two-track `ok` case.
- The status change is therefore a weak-secondary-track small-N sensitivity around
  one Mirabell building, not evidence of a broad AOI regression.

Follow-up: keep `548205` in the reference catalog as a monitored caveat, or split it
into a dedicated weak-secondary-track reference case so future harness results do
not hide this edge condition.

## Screenshots and artifacts

Harness artifacts:

- `docs/pipelines/anomaly_local_v1/artifacts/phase6_harness_summary.md`
- `docs/pipelines/anomaly_local_v1/artifacts/phase6_harness_results.json`
- `docs/pipelines/anomaly_local_v1/artifacts/phase6_reference_cases.json`

Visual verification artifacts:

- `docs/pipelines/anomaly_local_v1/artifacts/phase6_mirabell_candidate_both.png`
- `docs/pipelines/anomaly_local_v1/artifacts/phase6_mirabell_candidate_t44.png`
- `docs/pipelines/anomaly_local_v1/artifacts/phase6_mirabell_candidate_t95.png`
- `docs/pipelines/anomaly_local_v1/artifacts/phase6_mirabell_camera_t44.png`
- `docs/pipelines/anomaly_local_v1/artifacts/phase6_mirabell_camera_t95.png`

The screenshots were used as a UI-facing sanity check for candidate-area placement
and Track `44`/`95` camera orientation after the backend/API vector change.

## P6-W4: Final decision

Decision: `keep_2d_vector`.

Rationale:

- It is the source-correct implementation of the documented AUGMENTERRA look and
  sensor-side geometry.
- Backend pipeline and ML context API now share one geometry contract, removing the
  old duplicated x-only sign logic.
- The AOI-level harness remains stable enough to explain: Mirabell, Moosstrasse and
  Osthang all produce coherent status distributions and reliability bands.
- Seven of eight reference cases remain status-stable.
- The one changed reference case is an expected sensitivity of a weak secondary
  Track `95` support case and is now explicitly documented.

Rejected alternatives:

- `rollback_to_x_only`: rejected because the old approximation knowingly dropped the
  north/south range component and the AOI evidence does not show broad regression.
- `defer_after_dry_run`: rejected because W3 used real AOI reruns and screenshot
  checks, not only a dry-run.

Open follow-ups:

- Monitor Mirabell `548205` as a weak-secondary-track caveat after any future
  assignment, HDBSCAN, reliability or candidate-buffer change.
- Consider adjusting the reference catalog expectation for
  `mirabell_standard_high_conf`, or adding a separate weak-secondary-track reference
  so the harness expectation matches the new source-correct geometry.
- Do not retune thresholds from this single case alone; investigate only if more
  weak-secondary cases move bands/status unexpectedly.
- Keep `vertical_proxy` documented as a proxy, not true ASC/DSC decomposition.
- Evaluate deferred uncertainty fields (`h_stdev`, `a_stdev`, seasonal uncertainty,
  `eff_area`) after geometry stabilization.

## Local verification and commands

Commands used for W1:

```bash
sed -n '1,240p' docs/pipelines/anomaly_local_v1/phase6_ps_insar_semantics_supervisor_prompt.md
sed -n '1,520p' docs/pipelines/anomaly_local_v1/phase6_ps_insar_semantics_plan.md
sed -n '1,260p' docs/pipelines/anomaly_local_v1/ps_insar_semantics_decision.md
sed -n '1,260p' docs/pipelines/anomaly_local_v1/methodik.md
sed -n '1,280p' docs/pipelines/anomaly_local_v1/phase5_data_correctness_report.md
sed -n '1,260p' docs/pipelines/anomaly_local_v1/artifacts/phase5_P5-W2-T2.md
sed -n '1,260p' docs/pipelines/anomaly_local_v1/artifacts/phase5_P5-W3-T1.md
sed -n '1,320p' docs/research/Datenanalyse_InSAR_Salzburg.md
rg -n "range_offset|shift_sign|incidence_angle|coherence|valid_epoch|vertical_proxy|season|acceleration|nearest|quality_score|rule_penalty|reliability|height|ST_Translate" backend/app/ml/pipelines/anomaly_local_v1.py
rg -n "candidate_areas|range_offset|incidence_angle|ST_Translate|track = 44|velocity|subsidence|config|Track 44|Track 95|los" backend/app/routers/ml.py backend/app/routers/api.py
rg -n "Track 44|Track 95|Blick|bearing|pitch|Ascending|Descending|InSAR|LOS|Osten|Westen" frontend/src/lib/cameraModes.ts frontend/src/components/LayerPanel.tsx
python - <<'PY'
from pypdf import PdfReader
print(len(PdfReader('docs/research/external/TREALTAMIRA_handbook_2.2_20180604.pdf').pages))
print(len(PdfReader('docs/research/external/AUGMENTERRA_InSAR_Handbook_v1_3.pdf').pages))
PY
python - <<'PY'
import math
for track, look in [(44,81.4),(95,281.5)]:
    sensor=(look+180)%360
    rad=math.radians(sensor)
    print(track, sensor, math.sin(rad), math.cos(rad))
PY
git status --short --branch
git diff --check
```

Additional W3/W4 integration commands:

```bash
git status --short
sed -n '1,260p' docs/pipelines/anomaly_local_v1/phase6_ps_insar_semantics_report.md
sed -n '660,780p' docs/pipelines/anomaly_local_v1/phase2_execution_plan.md
sed -n '1,240p' docs/pipelines/anomaly_local_v1/artifacts/phase6_harness_summary.md
jq '.run_summaries[] | {aoi, run_id, building_count, building_status_counts, reliability_band_counts, differential_motion_buildings, median_building_reliability, median_track_agreement}' docs/pipelines/anomaly_local_v1/artifacts/phase6_harness_results.json
jq '.reference_cases[] | {case_id, aoi, building_id, expected_status, actual_status: .building_analysis.building_status, reliability: .building_analysis.building_reliability_score, agreement: .building_analysis.track_agreement_score}' docs/pipelines/anomaly_local_v1/artifacts/phase6_harness_results.json
jq '.reference_cases[] | select(.case_id == "mirabell_standard_high_conf") | {run_id, expected_status, actual_status: .building_analysis.building_status, reliability: .building_analysis.building_reliability_score, clusters: [.cluster_summaries[] | {track, role: .cluster_role, point_count, is_main_cluster: .is_main_cluster}]}' docs/pipelines/anomaly_local_v1/artifacts/phase6_harness_results.json
rg -n "TRACK|track_geometry|look_bearing|sensor_bearing|range_shift|range_dx|range_dy|along_look|cross_look|ST_Translate|candidate_areas" backend/app/ml/pipelines/anomaly_local_v1.py backend/app/ml/track_geometry.py backend/app/routers/ml.py backend/app/routers/api.py frontend/src/lib/cameraModes.ts frontend/src/components/LayerPanel.tsx docs/pipelines/anomaly_local_v1/methodik.md
ls -l docs/pipelines/anomaly_local_v1/artifacts/phase6_mirabell_candidate_both.png docs/pipelines/anomaly_local_v1/artifacts/phase6_mirabell_candidate_t44.png docs/pipelines/anomaly_local_v1/artifacts/phase6_mirabell_candidate_t95.png docs/pipelines/anomaly_local_v1/artifacts/phase6_mirabell_camera_t44.png docs/pipelines/anomaly_local_v1/artifacts/phase6_mirabell_camera_t95.png
git diff --check -- docs/pipelines/anomaly_local_v1/phase6_ps_insar_semantics_report.md docs/pipelines/anomaly_local_v1/phase2_execution_plan.md docs/pipelines/anomaly_local_v1/iterations.md
```

Local verification:

- Required W1 source files were read.
- TRE and AUGMENTERRA PDF text was locally extractable with `pypdf`.
- Geometry vectors were recomputed from the documented formula.
- W3/W4 harness artifacts were read from the Phase-6 artifact set.
- Phase-6 screenshot artifacts exist on disk.
- Backend/API/UI implementation evidence was checked read-only with `rg`; no code,
  generated artifacts, methodik or PDFs were edited by this documentation pass.
- Backend compile and frontend build were reported green by the implementation/UI
  workers; this documentation pass did not rerun them.
- `git diff --check` was run for the touched docs.

## Open risks

- The AUGMENTERRA look bearing is treated as a bearing clockwise from north. This is
  consistent with the decision document and handbook wording and has now passed the
  W3 AOI verification gate.
- Mirabell `548205` remains sensitive to weak Track `95` support. It should be
  treated as a monitored weak-secondary case, not a high-confidence two-track
  standard anchor.
- `vertical_proxy` remains vulnerable to horizontal motion; it is not a substitute
  for ASC/DSC decomposition.
- Coherence thresholds are engineering choices and need empirical validation after
  assignment geometry changes.
- Point geocoding precision, building-footprint precision and DS effective area can
  all affect assignment quality near building edges.
- UI camera exact bearings require visual MapLibre verification before changing
  camera presets.

## Next gate

Phase 6 is complete and green with final decision `keep_2d_vector`.

Next gate: keep the geometry contract in place for the next production dry-run or
retuning phase, with Mirabell `548205` called out as an explicit weak-secondary-track
monitoring case.
