"""Survivors-Scan (Lessons Learned Fall 96959851, 2026-06-12).

Prueft die UEBERLEBENDEN Punkte eines Gebaeude-Runs - nicht die demotierten.
Hintergrund: Beim Visual-Audit wurde nur gefragt "ist die bekannte
Kontamination weg?", nicht "ist alles Verbleibende gerechtfertigt?". Dadurch
blieben Fremdpunkte eines unkartieren Nebengebaeudes (weder GBA noch OSM)
als Cores unentdeckt (User-Befund 2026-06-11, Gebaeude 96959851).

Fuer jeden zugeordneten, nicht gate-ausgeschlossenen Punkt ausserhalb des
Footprints wird geometrisch/physikalisch vorsortiert, ob die Reflexion durch
das ZIELGEBAEUDE erklaerbar ist:

  anti_layover     Punkt liegt entgegen der Range-Verschiebungsrichtung
                   (range_dx/dy) -> als Dachpunkt physikalisch nicht
                   erklaerbar (Layover verschiebt nur in EINE Richtung)
  implied_height   implizite Reflektorhoehe d_fp/tan(inc) uebersteigt die
                   plausible Gebaeudehoehe (GBA-Hoehe/0.735 + 3 m;
                   Saturierungs-Ratio aus Hoehen-Audit P7-A-W1-T6)
  height_outlier   Punkthoehe ausserhalb Median +/- 3*1.4826*MAD der
                   within/directional-Kern-Anker desselben Tracks
                   (nur RELATIVE Hoehen - Datums-Offset!)

Selbstkalibrierend, keine Gebietskonstanten. Das Tool sortiert nur vor;
das Urteil gedeckt/verdaechtig/fremd faellt der Mensch am Luftbild
(unkartierte Strukturen sind footprint-basiert prinzipiell unsichtbar -
genau deshalb existiert dieser Scan).

Aufruf (Einzelfall):
  python -m backend.app.ml.evaluation.phase7_survivors_scan \
    --run <run_id> --building <gba_id> --out-json scan.json --out-md scan.md
Aufruf (alle Schritt-6-Audit-Faelle):
  python -m backend.app.ml.evaluation.phase7_survivors_scan \
    --cases docs/pipelines/anomaly_local_v1/artifacts/phase7_visual_audit_cases.json \
    --out-json scan.json --out-md scan.md
"""

from __future__ import annotations

import argparse
import asyncio
import json
import math
import statistics
from pathlib import Path

import asyncpg

from ...config import settings

SCAN_QUERY = """
SELECT r.code, r.track, r.cluster_id, r.label,
       r.meta->'cluster'->>'cluster_role' AS role,
       COALESCE(r.meta->'building_context'->>'assignment_method',
                r.meta->'feature_flags'->>'assignment_method') AS assignment,
       (r.meta->'visual_context'->>'gate_excluded')::boolean AS gate_excluded,
       (r.meta->'building_context'->>'range_dx')::double precision AS range_dx,
       (r.meta->'building_context'->>'range_dy')::double precision AS range_dy,
       (r.meta->'building_context'->>'building_height')::double precision AS gba_height,
       p.height, p.velocity, p.incidence_angle,
       ST_Distance(p.geom::geography, b.geom::geography) AS d_fp,
       degrees(ST_Azimuth(ST_ClosestPoint(b.geom, p.geom)::geography,
                          p.geom::geography)) AS az_from_fp
FROM ml_point_results r
JOIN insar_points p
  ON p.area_id = r.area_id AND p.dataset_id = r.dataset_id
 AND p.code = r.code AND p.track = r.track
JOIN gba_buildings b ON b.gba_id = r.building_id
WHERE r.run_id = $1::uuid AND r.building_source = 'gba' AND r.building_id = $2
"""

SURVIVOR_ROLES = {"core", "weak_support", "noise"}
SCORE_ROLES = {"core", "weak_support"}
OFF_FOOTPRINT_EPS_M = 0.5
HEIGHT_SATURATION_RATIO = 0.735  # GBA unterschaetzt Hoehen (Audit P7-A-W1-T6)
HEIGHT_MARGIN_M = 3.0
MAD_K = 3.0 * 1.4826
MAD_FLOOR_M = 1.0
# Bei nur EINEM within-Anker ist MAD undefiniert; Dachspannen (First vs.
# Traufe) liegen bei Kleinbauten im einstelligen Meterbereich.
SINGLE_ANCHOR_TOL_M = 3.0
ANTI_LAYOVER_DOT = -0.2
# Die Anti-Layover-Komponente muss die Geocoding-Toleranz uebersteigen
# (halbe min_buffer_m-Slack der Assignment-Politik), sonst ist die
# Seiteninformation bei Sub-Meter-Versaetzen reines Rauschen.
ANTI_COMPONENT_MIN_M = 1.5


def _scan_points(rows: list) -> dict:
    anchors_by_track: dict[int, list[float]] = {}
    for r in rows:
        if (r["gate_excluded"] is not True and (r["role"] or "") == "core"
                and (r["assignment"] or "") in ("within", "directional_buffer")
                and r["height"] is not None and float(r["d_fp"]) <= OFF_FOOTPRINT_EPS_M):
            anchors_by_track.setdefault(r["track"], []).append(float(r["height"]))

    anchor_stats: dict[int, dict[str, float]] = {}
    for track, hs in anchors_by_track.items():
        med = statistics.median(hs)
        if len(hs) > 1:
            mad = statistics.median([abs(h - med) for h in hs])
            tol = max(MAD_K * mad, MAD_FLOOR_M)
        else:
            tol = SINGLE_ANCHOR_TOL_M
        anchor_stats[track] = {"n": len(hs), "median": med, "tol": tol}

    points = []
    for r in rows:
        if r["gate_excluded"] is True or (r["role"] or "") not in SURVIVOR_ROLES:
            continue
        d_fp = float(r["d_fp"])
        off_fp = d_fp > OFF_FOOTPRINT_EPS_M
        inc = float(r["incidence_angle"]) if r["incidence_angle"] is not None else 38.5
        implied_h = d_fp / max(math.tan(math.radians(inc)), 1e-6)
        gba_h = float(r["gba_height"]) if r["gba_height"] is not None else None
        plausible_h = (gba_h / HEIGHT_SATURATION_RATIO + HEIGHT_MARGIN_M) if gba_h else None

        flags: list[str] = []
        dot = None
        if off_fp:
            if r["range_dx"] is not None and r["range_dy"] is not None and r["az_from_fp"] is not None:
                az = math.radians(float(r["az_from_fp"]))
                ux, uy = math.sin(az), math.cos(az)
                norm = math.hypot(float(r["range_dx"]), float(r["range_dy"])) or 1.0
                dot = (ux * float(r["range_dx"]) + uy * float(r["range_dy"])) / norm
                if dot < ANTI_LAYOVER_DOT and d_fp * (-dot) > ANTI_COMPONENT_MIN_M:
                    flags.append("anti_layover")
            else:
                flags.append("no_range_vector")
            if plausible_h is not None and implied_h > plausible_h:
                flags.append("implied_height_excess")
            stats = anchor_stats.get(r["track"])
            if stats and r["height"] is not None:
                delta = float(r["height"]) - stats["median"]
                if abs(delta) > stats["tol"]:
                    flags.append("height_outlier")
            elif not stats:
                flags.append("no_height_anchor")

        hard_flags = {"anti_layover", "implied_height_excess", "height_outlier"}
        verdict = ("suspicious" if off_fp and hard_flags.intersection(flags)
                   else ("covered_geometry" if off_fp else "covered_within"))

        stats = anchor_stats.get(r["track"])
        points.append({
            "code": r["code"], "track": r["track"], "role": r["role"],
            "assignment": r["assignment"], "cluster_id": r["cluster_id"],
            "score_relevant": (r["role"] or "") in SCORE_ROLES,
            "velocity": round(float(r["velocity"]), 2) if r["velocity"] is not None else None,
            "d_fp_m": round(d_fp, 1),
            "range_dot": round(dot, 2) if dot is not None else None,
            "implied_reflector_height_m": round(implied_h, 1) if off_fp else 0.0,
            "plausible_height_m": round(plausible_h, 1) if plausible_h is not None else None,
            "height_delta_vs_anchor_m": (round(float(r["height"]) - stats["median"], 1)
                                         if stats and r["height"] is not None else None),
            "flags": flags,
            "verdict_pre": verdict,
        })

    points.sort(key=lambda p: (p["verdict_pre"] != "suspicious", -p["d_fp_m"]))
    suspicious = [p for p in points if p["verdict_pre"] == "suspicious"]
    return {
        "anchor_stats": {str(t): {"n": s["n"], "height_tol_m": round(s["tol"], 1)}
                         for t, s in anchor_stats.items()},
        "summary": {
            "n_survivors": len(points),
            "n_off_footprint": sum(1 for p in points if p["d_fp_m"] > OFF_FOOTPRINT_EPS_M),
            "n_suspicious": len(suspicious),
            "n_suspicious_score_relevant": sum(1 for p in suspicious if p["score_relevant"]),
            "suspicious_codes": [p["code"] for p in suspicious],
        },
        "points": points,
    }


async def scan_cases(cases: list[dict]) -> list[dict]:
    conn = await asyncpg.connect(settings.db_dsn)
    results = []
    try:
        for case in cases:
            rows = await conn.fetch(SCAN_QUERY, case["run_id"], case["building_id"])
            result = _scan_points(rows)
            results.append({"case_id": case["case_id"], "run_id": case["run_id"],
                            "building_id": case["building_id"], **result})
    finally:
        await conn.close()
    return results


def to_markdown(results: list[dict], stand: str) -> str:
    lines = [f"# Survivors-Scan (Stand: {stand})", "",
             "Vorsortierung pro ueberlebendem Punkt (core/weak_support/noise, nicht",
             "gate-ausgeschlossen). `suspicious` = ausserhalb Footprint UND mind. ein",
             "harter Flag (anti_layover / implied_height_excess / height_outlier).",
             "Das fachliche Urteil (gedeckt/verdaechtig/fremd) faellt am Luftbild.", "",
             "## Uebersicht", "",
             "| Fall | Gebaeude | Survivors | off-Footprint | suspicious | davon score-relevant |",
             "| --- | --- | --- | --- | --- | --- |"]
    for r in results:
        s = r["summary"]
        lines.append(f"| {r['case_id']} | {r['building_id']} | {s['n_survivors']} | "
                     f"{s['n_off_footprint']} | {s['n_suspicious']} | {s['n_suspicious_score_relevant']} |")
    for r in results:
        s = r["summary"]
        if not s["n_off_footprint"]:
            continue
        lines += ["", f"## {r['case_id']} (gba:{r['building_id']}, run {r['run_id'][:8]})", "",
                  "| Punkt | Track | Rolle | Assignment | v | d_fp | dot_range | h_impl | h_plaus | dH_Anker | Flags | Vorsortierung |",
                  "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |"]
        for p in r["points"]:
            if p["d_fp_m"] <= OFF_FOOTPRINT_EPS_M:
                continue
            lines.append(
                f"| {p['code']} | t{p['track']} | {p['role']} | {p['assignment']} | "
                f"{p['velocity'] if p['velocity'] is not None else '-'} | {p['d_fp_m']} m | "
                f"{p['range_dot'] if p['range_dot'] is not None else '-'} | "
                f"{p['implied_reflector_height_m']} m | "
                f"{p['plausible_height_m'] if p['plausible_height_m'] is not None else '-'} m | "
                f"{p['height_delta_vs_anchor_m'] if p['height_delta_vs_anchor_m'] is not None else '-'} m | "
                f"{', '.join(p['flags']) or '-'} | {p['verdict_pre']} |")
    return "\n".join(lines) + "\n"


def main() -> None:
    p = argparse.ArgumentParser(description="Phase-7 Survivors-Scan")
    p.add_argument("--run")
    p.add_argument("--building")
    p.add_argument("--cases", help="phase7_visual_audit_cases.json: scannt alle audit_s6_*-Kandidaten-Runs")
    p.add_argument("--out-json")
    p.add_argument("--out-md")
    p.add_argument("--stand", default="2026-06-12")
    args = p.parse_args()

    if args.cases:
        data = json.loads(Path(args.cases).read_text(encoding="utf-8"))
        cases = [{"case_id": c["case_id"], "run_id": c["run_id_candidate"],
                  "building_id": c["building_id"]}
                 for c in data["cases"] if c["case_id"].startswith("audit_s6_")]
    elif args.run and args.building:
        cases = [{"case_id": f"adhoc_{args.building}", "run_id": args.run,
                  "building_id": args.building}]
    else:
        p.error("entweder --cases ODER --run + --building angeben")

    results = asyncio.run(scan_cases(cases))
    payload = {"stand": args.stand, "ticket": "Survivors-Pass (Lessons Learned 96959851)",
               "cases": results}
    if args.out_json:
        Path(args.out_json).write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
                                       encoding="utf-8")
    if args.out_md:
        Path(args.out_md).write_text(to_markdown(results, args.stand), encoding="utf-8")
    print(json.dumps({"cases": len(results),
                      "suspicious_total": sum(r["summary"]["n_suspicious"] for r in results)}))


if __name__ == "__main__":
    main()
