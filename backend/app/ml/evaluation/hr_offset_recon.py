"""HR-Offset-Recon: Streuungsmessung SNT-Main-Cluster vs. TSX-Cores.

Vorversuch fuer die Go/No-Go-Entscheidung zu P7-N3 (HR-Pseudo-Referenz auf
Cluster-/Patch-Ebene), siehe `docs/pipelines/anomaly_local_v1/
tsx_structural_reference_decision.md`. Misst ueber gekoppelte Gebaeude
(gleiche GBA-building_id, beide Quellen `gba`) die Verteilung der Abstaende

- SNT-Main-Cluster-Zentroid -> naechster TSX-Core (`min_offset_m`),
- SNT-Main-Cluster-Zentroid -> TSX-Main-Cluster-Zentroid
  (`main_centroid_dist_m`),

jeweils in Metern im lokalen UTM-Raum der Pipeline (x_m/y_m). Liegt die
Streuung in der Groessenordnung der Geokodierungs-Toleranzen (SNT 12 m +
TSX 3 m), ist Patch-Matching nicht diskriminativ -> No-Go.

Rein In-Memory (Harness-Pfad, keine ml_runs-Schreibvorgaenge). Bewegung ist
ausserhalb des Scopes (keine zeitliche SNT/TSX-Ueberlappung).

Aufruf (Repo-Root):
    backend/.venv-wsl/bin/python -m backend.app.ml.evaluation.hr_offset_recon \
        [--pairs bg_flat_01,mirabell] [--out-json ...] [--out-md ...]
"""

from __future__ import annotations

import argparse
import asyncio
import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np

from .phase7_clustering_experiments import (
    AOIS,
    ARTIFACTS_DIR,
    EXPERIMENTS,
    SNT_GEOCODE_TOL_M,
    TSX_GEOCODE_TOL_M,
    fetch_aoi_inputs,
    run_experiment_on_inputs,
)

# Salzburg-TSX-AOIs nur zur Laufzeit ergaenzen (kein Harness-Edit noetig;
# fetch_aoi_inputs braucht nur area_id/dataset_id/bbox; Quelle wird auf gba
# gepinnt, damit die Gebaeude-Kopplung auf beiden Seiten identisch ist).
RUNTIME_TSX_AOIS = {
    "mirabell_tsx": {
        "area_id": "salzburg", "dataset_id": "salzburg_tsx_t93_d",
        "role": "hr_offset_recon", "bbox": (13.04027, 47.80375, 13.04387, 47.80735),
    },
    "moosstrasse_tsx": {
        "area_id": "salzburg", "dataset_id": "salzburg_tsx_t93_d",
        "role": "hr_offset_recon", "bbox": (13.02714, 47.79189, 13.03074, 47.79549),
    },
    "osthang_tsx": {
        "area_id": "salzburg", "dataset_id": "salzburg_tsx_t93_d",
        "role": "hr_offset_recon", "bbox": (13.0492, 47.8036, 13.0528, 47.8054),
    },
}

PAIRS: dict[str, tuple[str, str]] = {
    "bg_flat_01": ("bg_flat_01_snt", "bg_flat_01_tsx"),
    "bg_slope_01": ("bg_slope_01_snt", "bg_slope_01_tsx"),
    "mirabell": ("mirabell", "mirabell_tsx"),
    "moosstrasse": ("moosstrasse", "moosstrasse_tsx"),
    "osthang": ("osthang", "osthang_tsx"),
}

HIST_BUCKETS = [(0, 3), (3, 6), (6, 9), (9, 12), (12, 15), (15, 20), (20, 30), (30, math.inf)]


def _main_cores_by_building(records) -> dict[str, list]:
    """Cores des Main-Clusters je Gebaeude (ueber alle Tracks gepoolt)."""
    out: dict[str, list] = {}
    for r in records:
        if not r.building_id or r.gate_excluded or r.cluster_role != "core":
            continue
        rollup = r.building_rollup or {}
        mains = {str(v) for v in (rollup.get("main_cluster_by_track") or {}).values()}
        if str(r.cluster_id) in mains:
            out.setdefault(r.building_id, []).append(r)
    return out


def _centroid(recs) -> tuple[float, float]:
    return (
        float(np.median([r.x_m for r in recs])),
        float(np.median([r.y_m for r in recs])),
    )


def hr_offset_rows(snt_records, tsx_records) -> list[dict[str, Any]]:
    snt_mains = _main_cores_by_building(snt_records)
    tsx_mains = _main_cores_by_building(tsx_records)
    tsx_cores: dict[str, list] = {}
    for r in tsx_records:
        if r.building_id and not r.gate_excluded and r.cluster_role == "core":
            tsx_cores.setdefault(r.building_id, []).append(r)

    rows = []
    for building_id in sorted(set(snt_mains) & set(tsx_cores)):
        s_recs = snt_mains[building_id]
        t_recs = tsx_cores[building_id]
        cx, cy = _centroid(s_recs)
        offsets = []
        for r in t_recs:
            d = math.hypot(r.x_m - cx, r.y_m - cy)
            eff = r.features.get("x_eff_area", 0.0)
            if eff and eff > 0:
                d = max(0.0, d - math.sqrt(eff))
            offsets.append(d)
        row = {
            "building_id": building_id,
            "n_snt_main_cores": len(s_recs),
            "n_tsx_cores": len(t_recs),
            "min_offset_m": round(min(offsets), 2),
            "median_offset_m": round(float(np.median(offsets)), 2),
            "p90_offset_m": round(float(np.percentile(offsets, 90)), 2),
            "main_centroid_dist_m": None,
        }
        if building_id in tsx_mains:
            tx, ty = _centroid(tsx_mains[building_id])
            row["main_centroid_dist_m"] = round(math.hypot(tx - cx, ty - cy), 2)
        rows.append(row)
    return rows


def _dist_stats(values: list[float]) -> dict[str, Any]:
    if not values:
        return {"n": 0}
    arr = np.array(values, dtype=float)
    tol = SNT_GEOCODE_TOL_M + TSX_GEOCODE_TOL_M
    hist = {
        f"{lo}-{'inf' if hi is math.inf else hi}m": int(((arr >= lo) & (arr < hi)).sum())
        for lo, hi in HIST_BUCKETS
    }
    return {
        "n": int(arr.size),
        "median": round(float(np.median(arr)), 2),
        "p75": round(float(np.percentile(arr, 75)), 2),
        "p90": round(float(np.percentile(arr, 90)), 2),
        f"share_le_{tol:.0f}m": round(float((arr <= tol).mean()), 3),
        "hist": hist,
    }


def summarize(rows: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "buildings_coupled": len(rows),
        "min_offset": _dist_stats([r["min_offset_m"] for r in rows]),
        "median_offset": _dist_stats([r["median_offset_m"] for r in rows]),
        "main_centroid_dist": _dist_stats(
            [r["main_centroid_dist_m"] for r in rows if r["main_centroid_dist_m"] is not None]
        ),
    }


async def run(pair_names: list[str]) -> dict[str, Any]:
    AOIS.update({k: v for k, v in RUNTIME_TSX_AOIS.items() if k not in AOIS})
    exp = EXPERIMENTS["noop"]
    results: dict[str, Any] = {
        "generated": datetime.now(timezone.utc).isoformat(),
        "experiment": "noop",
        "source": "gba",
        "tolerances_m": {"snt": SNT_GEOCODE_TOL_M, "tsx": TSX_GEOCODE_TOL_M},
        "pairs": {},
    }
    pooled_rows: list[dict[str, Any]] = []
    for name in pair_names:
        snt_aoi, tsx_aoi = PAIRS[name]
        print(f"[{name}] fetch {snt_aoi} ...")
        snt_inputs = await fetch_aoi_inputs(snt_aoi, {"source": "gba"})
        print(f"[{name}] fetch {tsx_aoi} ...")
        tsx_inputs = await fetch_aoi_inputs(tsx_aoi, {"source": "gba"})
        _, snt_records, _ = run_experiment_on_inputs(exp, snt_inputs)
        _, tsx_records, _ = run_experiment_on_inputs(exp, tsx_inputs)
        rows = hr_offset_rows(snt_records, tsx_records)
        pooled_rows.extend(rows)
        results["pairs"][name] = {
            "snt_aoi": snt_aoi,
            "tsx_aoi": tsx_aoi,
            "summary": summarize(rows),
            "rows": rows,
        }
        med = results["pairs"][name]["summary"].get("main_centroid_dist", {}).get("median")
        print(f"[{name}] coupled={len(rows)} main_centroid_dist median={med}")
    results["pooled"] = summarize(pooled_rows)
    return results


def _md_stats_row(label: str, stats: dict[str, Any]) -> str:
    if not stats or stats.get("n", 0) == 0:
        return f"| {label} | 0 | - | - | - | - |"
    share_key = next(k for k in stats if k.startswith("share_le_"))
    return (
        f"| {label} | {stats['n']} | {stats['median']} | {stats['p75']} | "
        f"{stats['p90']} | {stats[share_key]} |"
    )


def write_markdown(results: dict[str, Any], path: Path) -> None:
    tol = SNT_GEOCODE_TOL_M + TSX_GEOCODE_TOL_M
    lines = [
        "# HR-Offset-Recon: SNT-Main-Cluster vs. TSX-Cores",
        "",
        f"Stand: {results['generated']}",
        "",
        "Vorversuch fuer P7-N3 (Go/No-Go Patch-Matching), Kontext:",
        "`../tsx_structural_reference_decision.md`. Quelle beidseitig `gba`,",
        "Experiment `noop` (Produktionslogik), Bewegung out of scope.",
        "Salzburg-TSX ist single-track descending (t93), ohne Amplituden,",
        "eff_area NULL (reine PS); BG-TSX behaelt den DS-Toleranzterm.",
        "",
        f"Referenz-Toleranz: SNT {SNT_GEOCODE_TOL_M:.0f} m + TSX {TSX_GEOCODE_TOL_M:.0f} m = {tol:.0f} m.",
        "",
        "## Gepoolte Verteilung",
        "",
        "| Metrik | n | Median | p75 | p90 | Anteil <= " + f"{tol:.0f} m |",
        "| --- | ---: | ---: | ---: | ---: | ---: |",
        _md_stats_row("min_offset_m", results["pooled"].get("min_offset", {})),
        _md_stats_row("median_offset_m", results["pooled"].get("median_offset", {})),
        _md_stats_row("main_centroid_dist_m", results["pooled"].get("main_centroid_dist", {})),
        "",
        "Histogramm `main_centroid_dist_m` (gepoolt): "
        + json.dumps(results["pooled"].get("main_centroid_dist", {}).get("hist", {})),
        "",
        "## Je Paar",
        "",
        "| Paar | gekoppelt | main_centroid_dist Median | p90 | min_offset Median |",
        "| --- | ---: | ---: | ---: | ---: |",
    ]
    for name, pair in results["pairs"].items():
        s = pair["summary"]
        mc = s.get("main_centroid_dist", {})
        mo = s.get("min_offset", {})
        lines.append(
            f"| {name} | {s['buildings_coupled']} | {mc.get('median', '-')} | "
            f"{mc.get('p90', '-')} | {mo.get('median', '-')} |"
        )
    lines += [
        "",
        "## Lesart (Go/No-Go P7-N3)",
        "",
        "- `main_centroid_dist_m` misst, wie praezise sich SNT- und",
        "  TSX-Hauptcluster raeumlich entsprechen. Liegt der gepoolte Median",
        f"  in der Groessenordnung der Toleranz (~{tol:.0f} m), wuerde ein",
        "  Patch-Matching primaer Geokodierungsrauschen messen -> No-Go.",
        "- Deutlich kleinere Werte (<~5 m) wuerden Sub-Gebaeude-Matching",
        "  rechtfertigen (Go, mit Toleranzband).",
        "- Entscheidung wird im Decision Record nachgetragen.",
    ]
    path.write_text("\n".join(lines) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pairs", default=",".join(PAIRS),
                        help="Kommagetrennte Paar-Namen (Default: alle)")
    parser.add_argument("--out-json", default=str(ARTIFACTS_DIR / "hr_offset_recon.json"))
    parser.add_argument("--out-md", default=str(ARTIFACTS_DIR / "hr_offset_recon.md"))
    args = parser.parse_args()

    pair_names = [p.strip() for p in args.pairs.split(",") if p.strip()]
    unknown = [p for p in pair_names if p not in PAIRS]
    if unknown:
        raise SystemExit(f"Unbekannte Paare: {unknown}; verfuegbar: {list(PAIRS)}")

    results = asyncio.run(run(pair_names))

    out_json = Path(args.out_json)
    out_json.parent.mkdir(parents=True, exist_ok=True)
    out_json.write_text(json.dumps(results, indent=2, default=str))
    write_markdown(results, Path(args.out_md))
    print(f"written: {out_json}")
    print(f"written: {args.out_md}")


if __name__ == "__main__":
    main()
