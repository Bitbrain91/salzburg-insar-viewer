"""Visual-Audit-Annotation (P7-D-W1-T3).

Formalisiert den in Schritt 1/2 etablierten Workflow als Werkzeug:
Deep-Link-Screenshot (Nadir, pitch=0, bearing=0) + DB-Punktrollen ->
PIL-Annotation in Web-Mercator-Projektion (MapLibre, 512er-Kacheln).

Farbcode (identisch zu den Schritt-1-Audits):
  core=rot, noise=gelb, excluded/demoted=grau, weak_support=orange,
  insufficient_support=blassblau; weisser Aussenring = assignment nearest.

Aufruf:
  python -m backend.app.ml.evaluation.phase7_visual_audit \
    --run <run_id> --building <gba_id> --screenshot in.png \
    --center 13.028509,47.792373 --zoom 19.5 --out out_annotated.png
"""

from __future__ import annotations

import argparse
import asyncio
import json
import math
from pathlib import Path

import asyncpg
from PIL import Image, ImageDraw, ImageFont

from ...config import settings

ROLE_COLORS = {
    "core": (220, 40, 40),
    "noise": (240, 200, 30),
    "excluded": (140, 140, 140),
    "weak_support": (240, 130, 30),
    "insufficient_support": (120, 170, 230),
}

POINTS_QUERY = """
SELECT r.code, r.track, r.cluster_id, r.label,
       r.meta->'cluster'->>'cluster_role' AS role,
       COALESCE(r.meta->'building_context'->>'assignment_method',
                r.meta->'feature_flags'->>'assignment_method') AS assignment,
       (r.meta->'visual_context'->>'gate_excluded')::boolean AS gate_excluded,
       ST_X(p.geom) AS lon, ST_Y(p.geom) AS lat
FROM ml_point_results r
JOIN insar_points p
  ON p.area_id = r.area_id AND p.dataset_id = r.dataset_id
 AND p.code = r.code AND p.track = r.track
WHERE r.run_id = $1::uuid AND r.building_source = 'gba' AND r.building_id = $2
"""


def mercator_px(lon: float, lat: float, zoom: float) -> tuple[float, float]:
    world = 512.0 * (2.0 ** zoom)
    x = world * (lon / 360.0 + 0.5)
    siny = math.sin(math.radians(lat))
    y = world * (0.5 - math.log((1 + siny) / (1 - siny)) / (4 * math.pi))
    return x, y


async def annotate(run_id: str, building_id: str, screenshot: Path,
                   center: tuple[float, float], zoom: float, out: Path) -> dict:
    conn = await asyncpg.connect(settings.db_dsn)
    try:
        rows = await conn.fetch(POINTS_QUERY, run_id, building_id)
    finally:
        await conn.close()

    img = Image.open(screenshot).convert("RGB")
    draw = ImageDraw.Draw(img)
    width, height = img.size
    cx, cy = mercator_px(center[0], center[1], zoom)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 13)
    except OSError:
        font = ImageFont.load_default()

    drawn, off_screen = 0, 0
    for r in rows:
        px, py = mercator_px(float(r["lon"]), float(r["lat"]), zoom)
        sx = px - cx + width / 2.0
        sy = py - cy + height / 2.0
        if not (0 <= sx <= width and 0 <= sy <= height):
            off_screen += 1
            continue
        role = (r["role"] or "unknown").strip()
        color = ROLE_COLORS.get(role, (200, 60, 200))
        nearest = (r["assignment"] or "") == "nearest"
        radius = 9.0
        if nearest:
            draw.ellipse([sx - radius - 4, sy - radius - 4, sx + radius + 4, sy + radius + 4],
                         outline=(255, 255, 255), width=3)
        draw.ellipse([sx - radius, sy - radius, sx + radius, sy + radius],
                     fill=color, outline=(20, 20, 20), width=2)
        draw.text((sx + radius + 6, sy - 8), f"t{r['track']}", fill=(10, 10, 10), font=font,
                  stroke_width=2, stroke_fill=(255, 255, 255))
        drawn += 1

    # Legende
    legend = [("core", ROLE_COLORS["core"]), ("noise", ROLE_COLORS["noise"]),
              ("excluded/demoted", ROLE_COLORS["excluded"]),
              ("weak_support", ROLE_COLORS["weak_support"]),
              ("weisser Ring = nearest", (255, 255, 255))]
    y0 = 14
    draw.rectangle([10, 8, 330, 8 + 24 * len(legend) + 30], fill=(255, 255, 255, 220), outline=(0, 0, 0))
    draw.text((18, y0), f"run {run_id[:8]} / gba:{building_id}", fill=(0, 0, 0), font=font)
    for i, (name, color) in enumerate(legend):
        yy = y0 + 24 * (i + 1)
        draw.ellipse([20, yy, 36, yy + 16], fill=color if name != "weisser Ring = nearest" else (255, 255, 255),
                     outline=(0, 0, 0), width=2)
        draw.text((44, yy), name, fill=(0, 0, 0), font=font)

    img.save(out)
    return {"points_total": len(rows), "drawn": drawn, "off_screen": off_screen, "out": str(out)}


def main() -> None:
    p = argparse.ArgumentParser(description="Phase-7 Visual-Audit-Annotation")
    p.add_argument("--run", required=True)
    p.add_argument("--building", required=True)
    p.add_argument("--screenshot", required=True)
    p.add_argument("--center", required=True, help="lon,lat (Deep-Link-Hash-Zentrum)")
    p.add_argument("--zoom", type=float, required=True)
    p.add_argument("--out", required=True)
    args = p.parse_args()
    lon, lat = (float(v) for v in args.center.split(","))
    result = asyncio.run(annotate(args.run, args.building, Path(args.screenshot), (lon, lat), args.zoom, Path(args.out)))
    print(json.dumps(result))


if __name__ == "__main__":
    main()
