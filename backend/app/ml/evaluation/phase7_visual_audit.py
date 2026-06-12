"""Visual-Audit-Annotation (P7-D-W1-T3, erweitert 2026-06-12 um Survivors-Pass-Standards).

Formalisiert den in Schritt 1/2 etablierten Workflow als Werkzeug:
Deep-Link-Screenshot (Nadir, pitch=0, bearing=0) + DB-Punktrollen ->
PIL-Annotation in Web-Mercator-Projektion (MapLibre, 512er-Kacheln).

Farbcode (identisch zu den Schritt-1-Audits):
  core=rot, noise=gelb, excluded/demoted=grau, weak_support=orange,
  insufficient_support=blassblau; weisser Aussenring = assignment nearest.

Seit 2026-06-12 (Lessons Learned Fall 96959851, unkartiertes Nebengebaeude):
  --codes      Punkt-Codes beschriften (Pflicht fuer Survivors-Pass)
  --footprints alle GBA-Footprints im Ausschnitt zeichnen (cyan; Ziel dick) -
               macht sichtbar, WO kein kartiertes Objekt liegt
  --crop       auto | cx,cy,w,h  gezoomter Beleg-Ausschnitt (auto = Ziel-
               Footprint + Rand), --crop-scale (default 2.0)

Aufruf:
  python -m backend.app.ml.evaluation.phase7_visual_audit \
    --run <run_id> --building <gba_id> --screenshot in.png \
    --center 13.028509,47.792373 --zoom 19.5 --out out_annotated.png \
    [--codes] [--footprints] [--crop auto]
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

FOOTPRINT_COLOR = (0, 210, 255)

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

FOOTPRINTS_QUERY = """
SELECT gba_id, ST_AsGeoJSON(geom) AS gj
FROM gba_buildings
WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
"""


def mercator_px(lon: float, lat: float, zoom: float) -> tuple[float, float]:
    world = 512.0 * (2.0 ** zoom)
    x = world * (lon / 360.0 + 0.5)
    siny = math.sin(math.radians(lat))
    y = world * (0.5 - math.log((1 + siny) / (1 - siny)) / (4 * math.pi))
    return x, y


def mercator_inv(x: float, y: float, zoom: float) -> tuple[float, float]:
    world = 512.0 * (2.0 ** zoom)
    lon = (x / world - 0.5) * 360.0
    lat = math.degrees(math.atan(math.sinh(math.pi * (1.0 - 2.0 * y / world))))
    return lon, lat


def _rings(geojson: str) -> list[list[tuple[float, float]]]:
    geom = json.loads(geojson)
    if geom["type"] == "Polygon":
        return [geom["coordinates"][0]]
    if geom["type"] == "MultiPolygon":
        return [poly[0] for poly in geom["coordinates"]]
    return []


async def annotate(run_id: str, building_id: str, screenshot: Path,
                   center: tuple[float, float], zoom: float, out: Path,
                   codes: bool = False, footprints: bool = False,
                   crop: str | None = None, crop_scale: float = 2.0) -> dict:
    conn = await asyncpg.connect(settings.db_dsn)
    try:
        rows = await conn.fetch(POINTS_QUERY, run_id, building_id)
        fp_rows = []
        if footprints or crop == "auto":
            img_probe = Image.open(screenshot)
            width, height = img_probe.size
            cx, cy = mercator_px(center[0], center[1], zoom)
            lon_min, lat_max = mercator_inv(cx - width / 2.0, cy - height / 2.0, zoom)
            lon_max, lat_min = mercator_inv(cx + width / 2.0, cy + height / 2.0, zoom)
            fp_rows = await conn.fetch(FOOTPRINTS_QUERY, lon_min, lat_min, lon_max, lat_max)
    finally:
        await conn.close()

    img = Image.open(screenshot).convert("RGB")
    width, height = img.size
    orig_width, orig_height = img.size
    cx, cy = mercator_px(center[0], center[1], zoom)

    def screen_xy(lon: float, lat: float) -> tuple[float, float]:
        px, py = mercator_px(lon, lat, zoom)
        return px - cx + orig_width / 2.0, py - cy + orig_height / 2.0

    # Crop-Fenster bestimmen (vor dem Zeichnen, damit Texte scharf bleiben)
    crop_box = None
    if crop == "auto":
        target = [r for r in fp_rows if str(r["gba_id"]) == str(building_id)]
        xs: list[float] = []
        ys: list[float] = []
        for r in target:
            for ring in _rings(r["gj"]):
                for lon, lat in ring:
                    sx, sy = screen_xy(lon, lat)
                    xs.append(sx)
                    ys.append(sy)
        if xs:
            margin = 140.0
            crop_box = (max(0, min(xs) - margin), max(0, min(ys) - margin),
                        min(width, max(xs) + margin), min(height, max(ys) + margin))
    elif crop:
        ccx, ccy, cw, ch = (float(v) for v in crop.split(","))
        crop_box = (max(0, ccx - cw / 2.0), max(0, ccy - ch / 2.0),
                    min(width, ccx + cw / 2.0), min(height, ccy + ch / 2.0))

    scale = 1.0
    off_x, off_y = 0.0, 0.0
    if crop_box:
        img = img.crop(tuple(int(v) for v in crop_box))
        scale = float(crop_scale)
        img = img.resize((int(img.width * scale), int(img.height * scale)), Image.LANCZOS)
        off_x, off_y = crop_box[0], crop_box[1]
        width, height = img.size

    def tx(sx: float, sy: float) -> tuple[float, float]:
        return (sx - off_x) * scale, (sy - off_y) * scale

    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 13)
    except OSError:
        font = ImageFont.load_default()

    # Footprints zuerst (unter den Punkten); Ziel-Gebaeude dicker.
    fp_drawn = 0
    if footprints:
        for r in fp_rows:
            is_target = str(r["gba_id"]) == str(building_id)
            for ring in _rings(r["gj"]):
                pts = [tx(*screen_xy(lon, lat)) for lon, lat in ring]
                if not any(0 <= x <= width and 0 <= y <= height for x, y in pts):
                    continue
                draw.line(pts + [pts[0]], fill=FOOTPRINT_COLOR, width=5 if is_target else 2)
                fp_drawn += 1

    drawn, off_screen = 0, 0
    for r in rows:
        sx, sy = tx(*screen_xy(float(r["lon"]), float(r["lat"])))
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
        label_text = f"{r['code']} t{r['track']}" if codes else f"t{r['track']}"
        draw.text((sx + radius + 6, sy - 8), label_text, fill=(10, 10, 10), font=font,
                  stroke_width=2, stroke_fill=(255, 255, 255))
        drawn += 1

    # Legende
    legend = [("core", ROLE_COLORS["core"]), ("noise", ROLE_COLORS["noise"]),
              ("excluded/demoted", ROLE_COLORS["excluded"]),
              ("weak_support", ROLE_COLORS["weak_support"]),
              ("weisser Ring = nearest", (255, 255, 255))]
    if footprints:
        legend.append(("GBA-Footprint (Ziel dick)", FOOTPRINT_COLOR))
    y0 = 14
    draw.rectangle([10, 8, 330, 8 + 24 * len(legend) + 30], fill=(255, 255, 255, 220), outline=(0, 0, 0))
    draw.text((18, y0), f"run {run_id[:8]} / gba:{building_id}", fill=(0, 0, 0), font=font)
    for i, (name, color) in enumerate(legend):
        yy = y0 + 24 * (i + 1)
        draw.ellipse([20, yy, 36, yy + 16], fill=color if name != "weisser Ring = nearest" else (255, 255, 255),
                     outline=(0, 0, 0), width=2)
        draw.text((44, yy), name, fill=(0, 0, 0), font=font)

    img.save(out)
    return {"points_total": len(rows), "drawn": drawn, "off_screen": off_screen,
            "footprints_drawn": fp_drawn, "cropped": bool(crop_box), "out": str(out)}


def main() -> None:
    p = argparse.ArgumentParser(description="Phase-7 Visual-Audit-Annotation")
    p.add_argument("--run", required=True)
    p.add_argument("--building", required=True)
    p.add_argument("--screenshot", required=True)
    p.add_argument("--center", required=True, help="lon,lat (Deep-Link-Hash-Zentrum)")
    p.add_argument("--zoom", type=float, required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--codes", action="store_true", help="Punkt-Codes beschriften (Survivors-Pass-Standard)")
    p.add_argument("--footprints", action="store_true", help="GBA-Footprints im Ausschnitt zeichnen")
    p.add_argument("--crop", default=None, help="auto | cx,cy,w,h (Pixel im Original-Screenshot)")
    p.add_argument("--crop-scale", type=float, default=2.0)
    args = p.parse_args()
    lon, lat = (float(v) for v in args.center.split(","))
    result = asyncio.run(annotate(args.run, args.building, Path(args.screenshot), (lon, lat),
                                  args.zoom, Path(args.out), codes=args.codes,
                                  footprints=args.footprints, crop=args.crop,
                                  crop_scale=args.crop_scale))
    print(json.dumps(result))


if __name__ == "__main__":
    main()
