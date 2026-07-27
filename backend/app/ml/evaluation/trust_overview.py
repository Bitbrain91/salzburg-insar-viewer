"""Vertrauens- und Ergebnis-Uebersicht (interaktiver One-Pager).

Extrahiert je Gebaeude Status, Zuverlaessigkeitsband und Bewegungswerte aus den
fuenf eingefrorenen SNT-Extended-Runs der Cross-Track-Validierung
(``cross_track_validation_runs.json``) und baut daraus ein selbsttragendes,
interaktives HTML: Filter (Gebiet, Hanglage, Status, Zuverlaessigkeit,
Blickrichtung) plus einfache, direkt beschriftete Balken. Kein CDN, kein
externes Skript -- die Gebaeudedaten sind als JSON eingebettet, die Diagramme
werden client-seitig als schlichte DIV-Balken gerendert.

Die extrahierten Rohdaten werden zusaetzlich als JSON-Artefakt eingefroren,
damit die Zahlen der Seite reproduzierbar belegt sind.

Farbsemantik: Die Bewegungsklassen verwenden exakt die Viewer-Legendenfarben
(frontend/src/components/layout/MapLegend.tsx), damit Meeting-Publikum und
Viewer dieselbe Sprache sprechen. Da diese geordnete Skala strenge
Kategorien-Palettenpruefungen nicht voll besteht, traegt jeder Balken
verpflichtend Klartext-Label und Zahl (Farbe ist nie der einzige Traeger),
und eine Tabellenansicht liegt bei.

Aufruf (Repo-Root):
    backend/.venv-wsl/bin/python -m backend.app.ml.evaluation.trust_overview
"""

from __future__ import annotations

import argparse
import asyncio
import json
from html import escape
from pathlib import Path
from statistics import mean
from typing import Any

import asyncpg

from ...config import settings
from .terrain_classes import classify_slope

REPO_ROOT = Path(__file__).resolve().parents[4]
ARTIFACT_DIR = REPO_ROOT / "docs" / "pipelines" / "anomaly_local_v1" / "artifacts"
DEFAULT_RUNS = ARTIFACT_DIR / "cross_track_validation_runs.json"
DEFAULT_JSON = ARTIFACT_DIR / "trust_overview_2026-07.json"
DEFAULT_HTML = ARTIFACT_DIR / "trust_onepager_2026-07.html"

STAND = "2026-07-23"

# Blickrichtungen je Track (vgl. backend/app/ml/track_geometry.py):
# T44/T93 aufsteigend, T22/T95/T70 absteigend.
ASC_TRACKS = {44, 93}

# Anzeige-Reihenfolgen (Klartext zuerst, interne Tokens nur als Sekundaer-Tag).
STATUS_ORDER = [
    "ok",
    "single_track_only",
    "small_n",
    "noise_dominated",
    "insufficient_support",
]
BAND_ORDER = ["high", "medium", "low"]
CLS_ORDER = ["flach", "uebergang", "hang", "unbekannt"]

AOI_META = {
    "sbg_flat_ext_01": ("Salzburg · Ebene, Gebiet 1", "salzburg"),
    "sbg_flat_ext_02": ("Salzburg · Ebene, Gebiet 2", "salzburg"),
    "sbg_hang_ext_01": ("Salzburg · Hanglagen", "salzburg"),
    "bg_flat_ext_01": ("Bad Gastein · Talboden", "bad_gastein"),
    "bg_slope_ext_01": ("Bad Gastein · Hanggebiet", "bad_gastein"),
}


def _round(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return round(float(value), 2)
    except (TypeError, ValueError):
        return None


async def _extract(runs_registry: dict) -> dict:
    snt_runs = [
        r for r in runs_registry["extended_runs"] if r["dataset_id"].endswith("_snt")
    ]
    pool = await asyncpg.create_pool(dsn=settings.db_dsn, min_size=1, max_size=3)
    records: list[list[Any]] = []
    run_infos: list[dict] = []
    try:
        async with pool.acquire() as conn:
            for aoi_index, run in enumerate(snt_runs):
                label, area_id = AOI_META[run["aoi"]]
                rows = await conn.fetch(
                    """
                    SELECT DISTINCT ON (building_id)
                           building_id, meta->'building_rollup' AS rollup
                    FROM ml_point_results
                    WHERE run_id = $1::uuid AND meta ? 'building_rollup'
                    ORDER BY building_id
                    """,
                    run["run_id"],
                )
                building_ids = [str(row["building_id"]) for row in rows]
                terrain_rows = await conn.fetch(
                    """
                    SELECT building_id, slope_mean_deg
                    FROM building_terrain_context
                    WHERE area_id = $1
                      AND building_source = 'bev'
                      AND building_id = ANY($2::text[])
                    """,
                    area_id,
                    building_ids,
                )
                slope_by_id = {
                    str(r["building_id"]): (
                        float(r["slope_mean_deg"])
                        if r["slope_mean_deg"] is not None
                        else None
                    )
                    for r in terrain_rows
                }
                for row in rows:
                    raw = row["rollup"]
                    rollup = json.loads(raw) if isinstance(raw, str) else raw
                    status = rollup.get("building_status")
                    if status not in STATUS_ORDER:
                        continue
                    band = rollup.get("building_reliability_band")
                    band_index = BAND_ORDER.index(band) if band in BAND_ORDER else -1
                    cls = classify_slope(slope_by_id.get(str(row["building_id"])))
                    tracks = rollup.get("track_motion_mm_a") or {}
                    asc_values = [
                        float(v)
                        for t, v in tracks.items()
                        if v is not None and int(t) in ASC_TRACKS
                    ]
                    dsc_values = [
                        float(v)
                        for t, v in tracks.items()
                        if v is not None and int(t) not in ASC_TRACKS
                    ]
                    records.append(
                        [
                            aoi_index,
                            CLS_ORDER.index(cls),
                            STATUS_ORDER.index(status),
                            band_index,
                            _round(rollup.get("building_motion_mm_a")),
                            _round(mean(asc_values)) if asc_values else None,
                            _round(mean(dsc_values)) if dsc_values else None,
                        ]
                    )
                run_infos.append(
                    {
                        "aoi": run["aoi"],
                        "label": label,
                        "area_id": area_id,
                        "run_id": run["run_id"],
                        "run_label": run["label"],
                        "buildings": len(
                            [r for r in records if r[0] == aoi_index]
                        ),
                    }
                )
    finally:
        await pool.close()

    return {
        "stand": STAND,
        "model_set_version": runs_registry["model_set_version"],
        "source": "bev",
        "status_order": STATUS_ORDER,
        "band_order": BAND_ORDER + ["none"],
        "cls_order": CLS_ORDER,
        "runs": run_infos,
        "record_fields": ["aoi", "cls", "status", "band", "v", "v_asc", "v_dsc"],
        "records": records,
    }


# --------------------------------------------------------------------------- #
# HTML
# --------------------------------------------------------------------------- #
EXTRA_STYLE = """
.filters {
  position: sticky; top: 0; z-index: 30;
  background: var(--ground);
  padding: 12px 0; margin: 26px 0 6px;
  display: flex; gap: 14px 18px; flex-wrap: wrap; align-items: flex-end;
  border-bottom: 1px solid var(--line);
}
.filters .f { display: flex; flex-direction: column; gap: 4px; }
.filters label { font-family: var(--sans); font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase; color: var(--faint); }
.filters select {
  font-family: var(--sans); font-size: 14px; color: var(--ink);
  background: var(--panel); border: 1px solid var(--line-strong); border-radius: 8px;
  padding: 7px 10px; min-width: 160px;
}
.filters .reset {
  font-family: var(--sans); font-size: 13px; color: var(--accent-ink);
  background: none; border: 1px solid var(--accent); border-radius: 8px;
  padding: 8px 14px; cursor: pointer;
}
.chartcard { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); box-shadow: var(--shadow); padding: 20px 22px 16px; }
.chartcard h3 { margin-bottom: 2px; }
.chartcard .csub { font-family: var(--sans); font-size: 13px; color: var(--muted); margin: 0 0 14px; }
.cgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin: 22px 0; }
.cgrid.one { grid-template-columns: 1fr; }
.brow { display: grid; grid-template-columns: 230px 1fr 130px; gap: 12px; align-items: center; padding: 5px 0; }
.brow .blabel { font-family: var(--sans); font-size: 13.5px; color: var(--ink); line-height: 1.25; }
.brow .blabel small { display: block; font-family: var(--mono); font-size: 10px; color: var(--faint); }
.brow .btrack { background: var(--panel-2); border-radius: 4px; height: 20px; position: relative; }
.brow .bfill { height: 100%; border-radius: 0 4px 4px 0; min-width: 0; }
.brow .bval { font-family: var(--mono); font-size: 13px; color: var(--ink); font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
.brow .bval small { color: var(--muted); }
.emptynote { font-family: var(--sans); font-size: 13px; color: var(--muted); padding: 8px 0; }
@media (max-width: 900px) {
  .cgrid { grid-template-columns: 1fr; }
  .brow { grid-template-columns: 130px 1fr 110px; }
}
"""


def build_html(data: dict) -> str:
    # Stil-Tokens des Zwischenbefunds wiederverwenden -- eine Optik, zwei Seiten.
    from .meeting_onepager import STYLE, contour_svg, dei

    total = len(data["records"])
    n_ok = sum(1 for r in data["records"] if r[2] == 0)
    n_ok_mh = sum(1 for r in data["records"] if r[2] == 0 and r[3] in (0, 1))
    runs_rows = "".join(
        "<tr>"
        f'<td class="txt">{escape(info["label"])}</td>'
        f'<td class="txt">{escape(info["aoi"])}</td>'
        f'<td>{escape(info["run_id"])}</td>'
        f'<td class="num-r">{dei(info["buildings"])}</td>'
        "</tr>"
        for info in data["runs"]
    )
    payload = json.dumps(
        {
            "aois": [info["label"] for info in data["runs"]],
            "records": data["records"],
        },
        ensure_ascii=False,
        separators=(",", ":"),
    )

    return f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>InSAR-Uebersicht · Vertrauen und Ergebnisse der Gebäudebewertung</title>
<style>{STYLE}{EXTRA_STYLE}</style>
</head>
<body>
<div class="doc wrap">

<header class="masthead">
  {contour_svg()}
  <div class="toprow">
    <span class="kicker">InSAR-Gebäudebewertung · Ergebnis-Übersicht</span>
    <span class="variant-badge">Juli 2026</span>
  </div>
  <h1>Wie viele Befunde sind belastbar — und was zeigen sie?</h1>
  <p class="sub">Alle Gebäude-Ergebnisse der fünf eingefrorenen Sentinel-Läufe
  (Salzburg &amp; Bad Gastein), aufgeschlüsselt nach Vertrauensstufe, Bewegung und
  Hanglage. Mit den Filtern unten lässt sich jede Sicht einstellen.
  Stand: {escape(data["stand"])}.</p>
  <div class="metaline">
    <div class="item"><span class="k">Gebäude-Bewertungen</span><b>{dei(total)}</b></div>
    <div class="item"><span class="k">davon Status verlässlich (ok)</span><b id="m-ok">{dei(n_ok)}</b></div>
    <div class="item"><span class="k">davon zusätzlich Zuverlässigkeit mittel/hoch</span><b>{dei(n_ok_mh)}</b></div>
    <div class="item"><span class="k">Gebäudequelle</span><b>BEV (amtliche Grundrisse)</b></div>
    <div class="item"><span class="k">Modellstand</span><b>{escape(data["model_set_version"])}</b></div>
  </div>
</header>

<section>
  <div class="sec-head"><span class="kicker">So funktioniert die Einstufung</span></div>
  <h2>Erst Status, dann Zuverlässigkeit</h2>
  <hr class="rule">
  <div class="readaid"><b>Status</b> beantwortet: Reicht die Datenlage für eine
  Aussage? Er gilt <b>pro Gebäude</b> (und Lauf); intern hat jede Blickrichtung
  ihr eigenes Teilergebnis, die Prüfung rechnet über deren Summe. Sie ist eine
  Kaskade — beim ersten Scheitern gibt es den jeweiligen Status: unter 3
  gewertete Messpunkte → „zu wenige Messpunkte"; über 50&nbsp;% Rauschen →
  „zu verrauscht"; unter 4 Punkte im Hauptsignal → „Hauptsignal zu dünn";
  Hauptsignal nur aus einer Blickrichtung → „nur eine Blickrichtung";
  sonst → <b>verlässlich (ok)</b>.</div>

  <div class="readaid" style="margin-top:14px"><b>Zuverlässigkeit</b>
  (gering / mittel / hoch) bewertet zusätzlich die Qualität eines Befunds.
  Vier Zutaten ergeben den Score:
  <b>Stützung</b> (35&nbsp;% — wie viele Punkte tragen das Hauptsignal, voll ab 6),
  <b>Signalqualität</b> (25&nbsp;% — wie stabil reflektieren die
  Hauptsignal-Punkte das Radar über die Jahre; Fachbegriff Kohärenz),
  <b>Zuordnungsqualität</b> (20&nbsp;% — wie sicher gehören die Punkte zu diesem
  Gebäude) und <b>Blickrichtungs-Übereinstimmung</b> (20&nbsp;%).
  Davon gehen Abzüge weg: nur eine Blickrichtung, dominierendes Rauschen,
  wenige Stützpunkte, schwache Übereinstimmung — und auch eine
  <b>signifikante innere Differenzbewegung</b> (der Verdacht selbst macht den
  Befund vorsichtiger). Zwei harte Deckel unabhängig vom Score: schwacher
  zweiter Track → höchstens „mittel"; sehr schlechte
  Blickrichtungs-Übereinstimmung → „gering".
  <br><br>Wichtig fürs Lesen: Am Hang ist die Zuverlässigkeit dadurch derzeit
  <b>systematisch gedrückt</b> — die Rechenannahme „Bewegung ist senkrecht"
  wertet den dort erwarteten Blickrichtungs-Widerspruch als Unsicherheit
  (siehe Zwischenbefund; Umbau mit der 2D-Zerlegung geplant).</div>
</section>

<section>
  <div class="sec-head"><span class="kicker">Interaktive Übersicht</span></div>
  <h2>Filter setzen — alle Diagramme folgen</h2>
  <hr class="rule">
  <div class="filters">
    <div class="f"><label for="f-aoi">Gebiet</label><select id="f-aoi"></select></div>
    <div class="f"><label for="f-cls">Hanglage</label><select id="f-cls"></select></div>
    <div class="f"><label for="f-status">Status</label><select id="f-status"></select></div>
    <div class="f"><label for="f-band">Zuverlässigkeit</label><select id="f-band"></select></div>
    <div class="f"><label for="f-src">Bewegungswert</label><select id="f-src"></select></div>
    <button class="reset" id="f-reset">Zurücksetzen</button>
  </div>
  <p class="small muted" style="margin-top:10px">Jedes Diagramm ignoriert den
  Filter seiner eigenen Größe (das Status-Diagramm den Status-Filter usw.) —
  sonst bliebe dort nur ein Balken übrig.</p>

  <div class="tiles" id="tiles"></div>

  <div class="cgrid">
    <div class="chartcard">
      <h3>Status: reicht die Datenlage?</h3>
      <p class="csub" id="sub-status"></p>
      <div id="c-status"></div>
    </div>
    <div class="chartcard">
      <h3>Zuverlässigkeit der Befunde</h3>
      <p class="csub" id="sub-band"></p>
      <div id="c-band"></div>
    </div>
  </div>

  <div class="cgrid one">
    <div class="chartcard">
      <h3>Gemessene Bewegung (mm/Jahr, Klassen wie im Viewer)</h3>
      <p class="csub" id="sub-velo"></p>
      <div id="c-velo"></div>
    </div>
  </div>

  <div class="cgrid">
    <div class="chartcard">
      <h3>Anteil „Status verlässlich" je Hanglage</h3>
      <p class="csub">Wie viel der Gebäude schaffen die Status-Kaskade?</p>
      <div id="c-cls-ok"></div>
    </div>
    <div class="chartcard">
      <h3>Anteil Zuverlässigkeit mittel/hoch je Hanglage</h3>
      <p class="csub">Bezogen auf die Status-ok-Gebäude der Klasse — am Hang
      drückt die bekannte Zirkularität den Wert.</p>
      <div id="c-cls-band"></div>
    </div>
  </div>

  <details class="fold" style="margin-top:6px">
    <summary>Zahlen der aktuellen Filterauswahl als Tabelle</summary>
    <div class="fold-body" id="tableview"></div>
  </details>
</section>

<section class="caveat">
  <div class="cv-head">
    <span class="kicker">Ehrlich gelesen</span>
    <h2>Drei Dinge beim Interpretieren</h2>
  </div>
  <div class="cv-body"><ul>
    <li><div class="h">Gebäudewert am Hang<span class="q">Mittel über beide Blickrichtungen</span></div>
    <p>Der Standard-Gebäudewert mittelt auf- und absteigende Blickrichtung. Am
    Hang können sich echte gegenläufige Anteile dabei wegmitteln — deshalb gibt
    es den Umschalter „Bewegungswert": nur aufsteigend bzw. nur absteigend
    zeigt die Richtungen getrennt.</p></li>
    <li><div class="h">Zuverlässigkeit am Hang<span class="q">derzeit zirkulär gedrückt</span></div>
    <p>Blickrichtungs-Widerspruch gilt der Pipeline als Unsicherheit. Am Hang
    ist er aber oft die geometrische Signatur echter, seitlicher Bewegung. Bis
    zur 2D-Zerlegung ist „gering" am Hang deshalb nicht automatisch „schlechte
    Messung".</p></li>
    <li><div class="h">Werte sind Vertikal-Annahmen<span class="q">mm/Jahr, volle Messreihe</span></div>
    <p>Alle Raten sind aus der vollen Messreihe des jeweiligen Laufs berechnet
    und wie im Viewer als senkrechte Bewegung interpretiert. Klassengrenzen
    identisch zur Viewer-Legende.</p></li>
  </ul></div>
</section>

<section class="appendix">
  <details class="fold">
    <summary>Anhang für die Technik: verwendete Läufe und Reproduktion</summary>
    <div class="fold-body">
      <h3>Läufe ({len(data["runs"])} Sentinel-Extended-Runs, Modell {escape(data["model_set_version"])})</h3>
      <div class="tablewrap">
        <table class="runtable">
          <thead><tr><th>Gebiet</th><th>AOI</th><th>Run-ID</th><th>Gebäude</th></tr></thead>
          <tbody>{runs_rows}</tbody>
        </table>
      </div>
      <h3>Reproduktion</h3>
      <pre>backend/.venv-wsl/bin/python -m backend.app.ml.evaluation.trust_overview</pre>
      <h3>Datenartefakt</h3>
      <ul class="artlist"><li><span class="role">Rohzahlen</span><span>docs/pipelines/anomaly_local_v1/artifacts/trust_overview_2026-07.json</span></li></ul>
    </div>
  </details>
</section>

<footer>
  <span>InSAR-Gebäudebewertung · Vertrauens- und Ergebnis-Übersicht · Stand {escape(data["stand"])}</span>
  <span>Fünf eingefrorene Sentinel-Läufe · Vertikal-Annahme · keine Kalibrierung an Bodenmessungen</span>
</footer>

</div>
<script>
const DATA = {payload};

// Anzeige-Definitionen (Reihenfolge fix; Farben folgen der Seitensemantik
// bzw. exakt der Viewer-Legende bei den Bewegungsklassen).
const STATUS = [
  {{ label: "verlässlich (ok)", tag: "ok", color: "#0d6e75" }},
  {{ label: "nur eine Blickrichtung", tag: "single_track_only", color: "#4f7f95" }},
  {{ label: "Hauptsignal zu dünn", tag: "small_n", color: "#8593a0" }},
  {{ label: "zu verrauscht", tag: "noise_dominated", color: "#b5641b" }},
  {{ label: "zu wenige Messpunkte", tag: "insufficient_support", color: "#c9d2d8" }},
];
const BAND = [
  {{ label: "hoch", color: "#0d6e75" }},
  {{ label: "mittel", color: "#8593a0" }},
  {{ label: "gering", color: "#b5641b" }},
];
const BAND_NONE = {{ label: "ohne Einstufung", color: "#c9d2d8" }};
const CLS = ["Ebene (unter 5°)", "Übergang (5–15°)", "Hang (ab 15°)", "unbekannt"];
const VELO = [
  {{ label: "Starke Senkung (unter −5)", color: "#8e0f2f" }},
  {{ label: "Moderate Senkung (−5 bis −2)", color: "#e67f1c" }},
  {{ label: "Leichte Senkung (−2 bis −1)", color: "#f2c14e" }},
  {{ label: "Stabil (−1 bis +1)", color: "#2c9f7a" }},
  {{ label: "Hebung (+1 bis +5)", color: "#4aa5d5" }},
  {{ label: "Starke Hebung (über +5)", color: "#1c2f4a" }},
];
const SRC = [
  {{ label: "Gebäudewert (Mittel beider Blickrichtungen)", field: 4 }},
  {{ label: "nur aufsteigende Blickrichtung", field: 5 }},
  {{ label: "nur absteigende Blickrichtung", field: 6 }},
];

const fmtN = (n) => n.toLocaleString("de-AT");
const fmtP = (n, d) => (d > 0 ? (100 * n / d) : 0).toLocaleString("de-AT", {{ maximumFractionDigits: 0 }}) + " %";

function veloClass(v) {{
  if (v < -5) return 0;
  if (v < -2) return 1;
  if (v < -1) return 2;
  if (v <= 1) return 3;
  if (v <= 5) return 4;
  return 5;
}}

function fillSelect(el, entries, allLabel) {{
  el.innerHTML = "";
  const opt = document.createElement("option");
  opt.value = "-1"; opt.textContent = allLabel;
  el.appendChild(opt);
  entries.forEach((label, i) => {{
    const o = document.createElement("option");
    o.value = String(i); o.textContent = label;
    el.appendChild(o);
  }});
}}

const els = {{
  aoi: document.getElementById("f-aoi"),
  cls: document.getElementById("f-cls"),
  status: document.getElementById("f-status"),
  band: document.getElementById("f-band"),
  src: document.getElementById("f-src"),
}};
fillSelect(els.aoi, DATA.aois, "Alle Gebiete");
fillSelect(els.cls, CLS.slice(0, 3), "Alle Hanglagen");
fillSelect(els.status, STATUS.map(s => s.label), "Alle Status");
fillSelect(els.band, BAND.map(b => b.label), "Alle Stufen");
els.src.innerHTML = "";
SRC.forEach((s, i) => {{
  const o = document.createElement("option");
  o.value = String(i); o.textContent = s.label;
  els.src.appendChild(o);
}});

function currentFilter() {{
  return {{
    aoi: parseInt(els.aoi.value, 10),
    cls: parseInt(els.cls.value, 10),
    status: parseInt(els.status.value, 10),
    band: parseInt(els.band.value, 10),
    src: parseInt(els.src.value, 10),
  }};
}}

function matches(r, f, ignore) {{
  if (f.aoi >= 0 && ignore !== "aoi" && r[0] !== f.aoi) return false;
  if (f.cls >= 0 && ignore !== "cls" && r[1] !== f.cls) return false;
  if (f.status >= 0 && ignore !== "status" && r[2] !== f.status) return false;
  if (f.band >= 0 && ignore !== "band" && r[3] !== f.band) return false;
  return true;
}}

function barRows(container, rows, denom) {{
  container.innerHTML = "";
  const max = Math.max(1, ...rows.map(r => r.value));
  rows.forEach(row => {{
    const div = document.createElement("div");
    div.className = "brow";
    div.title = row.label + ": " + fmtN(row.value) + " Gebäude (" + fmtP(row.value, denom) + ")";
    const sub = row.sub ? "<small>" + row.sub + "</small>" : "";
    div.innerHTML =
      '<div class="blabel">' + row.label + sub + "</div>" +
      '<div class="btrack"><div class="bfill" style="width:' + (100 * row.value / max) + "%;background:" + row.color + '"></div></div>' +
      '<div class="bval">' + fmtN(row.value) + ' <small>· ' + fmtP(row.value, denom) + "</small></div>";
    container.appendChild(div);
  }});
}}

function render() {{
  const f = currentFilter();
  const all = DATA.records;

  // Kacheln: aktuelle Auswahl (alle Filter außer Status/Band fuer die Quoten).
  const scoped = all.filter(r => matches(r, f, null));
  const scopedNoStatus = all.filter(r => matches(r, f, "status"));
  const scopedNoBand = all.filter(r => matches(r, f, "band"));
  const okCount = scopedNoStatus.filter(r => r[2] === 0).length;
  const okMh = scopedNoStatus.filter(r => r[2] === 0 && (r[3] === 0 || r[3] === 1)).length;

  document.getElementById("tiles").innerHTML =
    '<div class="stat"><div class="lbl">Gebäude in der Auswahl</div><div class="val num">' + fmtN(scoped.length) + '</div><div class="sub">nach allen aktiven Filtern</div></div>' +
    '<div class="stat accent"><div class="lbl">Status verlässlich (ok)</div><div class="val num">' + fmtP(okCount, scopedNoStatus.length) + '</div><div class="sub">' + fmtN(okCount) + " von " + fmtN(scopedNoStatus.length) + " (ohne Status-Filter)</div></div>" +
    '<div class="stat signal"><div class="lbl">davon mittel/hoch zuverlässig</div><div class="val num">' + fmtP(okMh, okCount) + '</div><div class="sub">' + fmtN(okMh) + " von " + fmtN(okCount) + " Status-ok-Gebäuden</div></div>";

  // Status-Diagramm (ignoriert Status-Filter).
  const sRows = STATUS.map((s, i) => ({{
    label: s.label, sub: s.tag, color: s.color,
    value: scopedNoStatus.filter(r => r[2] === i).length,
  }}));
  barRows(document.getElementById("c-status"), sRows, scopedNoStatus.length);
  document.getElementById("sub-status").textContent =
    "Basis: " + fmtN(scopedNoStatus.length) + " Gebäude (Status-Filter ausgenommen).";

  // Zuverlässigkeit (ignoriert Band-Filter).
  const bRows = BAND.map((b, i) => ({{
    label: b.label, color: b.color,
    value: scopedNoBand.filter(r => r[3] === i).length,
  }}));
  bRows.push({{ label: BAND_NONE.label, sub: "Status: zu wenige Messpunkte", color: BAND_NONE.color,
    value: scopedNoBand.filter(r => r[3] < 0).length }});
  barRows(document.getElementById("c-band"), bRows, scopedNoBand.length);
  document.getElementById("sub-band").textContent =
    "Basis: " + fmtN(scopedNoBand.length) + " Gebäude (Zuverlässigkeits-Filter ausgenommen).";

  // Bewegungsklassen (alle Filter aktiv; Quelle waehlbar).
  const field = SRC[f.src].field;
  const withValue = scoped.filter(r => r[field] !== null);
  const vRows = VELO.map((v, i) => ({{
    label: v.label, color: v.color,
    value: withValue.filter(r => veloClass(r[field]) === i).length,
  }}));
  barRows(document.getElementById("c-velo"), vRows, withValue.length);
  document.getElementById("sub-velo").textContent =
    "Basis: " + fmtN(withValue.length) + " Gebäude mit Wert („" + SRC[f.src].label + "“); " +
    fmtN(scoped.length - withValue.length) + " ohne Wert.";

  // Hanglagen-Quoten (ignorieren den Hanglagen-Filter; Prozent je Zeile
  // bezieht sich auf die eigene Klassenbasis).
  const clsBase = all.filter(r => matches(r, f, "cls"));
  const clsOkRows = [];
  const clsBandRows = [];
  const clsColors = ["#0d6e75", "#8593a0", "#b5641b", "#c9d2d8"];
  CLS.forEach((label, i) => {{
    const inCls = clsBase.filter(r => r[1] === i);
    if (!inCls.length) return;
    const ok = inCls.filter(r => r[2] === 0);
    const mh = ok.filter(r => r[3] === 0 || r[3] === 1);
    clsOkRows.push({{ label: label, color: clsColors[i], value: ok.length,
      denom: inCls.length, sub: "von " + fmtN(inCls.length) + " Gebäuden" }});
    clsBandRows.push({{ label: label, color: clsColors[i], value: mh.length,
      denom: ok.length, sub: "von " + fmtN(ok.length) + " Status-ok" }});
  }});
  renderShare(document.getElementById("c-cls-ok"), clsOkRows);
  renderShare(document.getElementById("c-cls-band"), clsBandRows);

  renderTable(scoped, f);
}}

function renderShare(container, rows) {{
  container.innerHTML = "";
  rows.forEach(row => {{
    const denom = row.denom || 0;
    const pct = denom > 0 ? 100 * row.value / denom : 0;
    const div = document.createElement("div");
    div.className = "brow";
    div.title = row.label + ": " + fmtN(row.value) + " (" + fmtP(row.value, denom) + ")";
    div.innerHTML =
      '<div class="blabel">' + row.label + "<small>" + row.sub + "</small></div>" +
      '<div class="btrack"><div class="bfill" style="width:' + pct + "%;background:" + row.color + '"></div></div>' +
      '<div class="bval">' + fmtP(row.value, denom) + ' <small>· ' + fmtN(row.value) + "</small></div>";
    container.appendChild(div);
  }});
  if (!rows.length) container.innerHTML = '<div class="emptynote">Keine Gebäude in dieser Auswahl.</div>';
}}

function renderTable(scoped, f) {{
  const field = SRC[f.src].field;
  let rows = "";
  STATUS.forEach((s, si) => {{
    const inStatus = scoped.filter(r => r[2] === si);
    if (!inStatus.length) return;
    const bands = [0, 1, 2, -1].map(bi => inStatus.filter(r => r[3] === bi).length);
    rows += "<tr><td class=\\"txt\\">" + s.label + "</td>" +
      "<td class=\\"num-r\\">" + fmtN(inStatus.length) + "</td>" +
      bands.map(n => "<td class=\\"num-r\\">" + fmtN(n) + "</td>").join("") + "</tr>";
  }});
  document.getElementById("tableview").innerHTML =
    '<div class="tablewrap"><table><thead><tr><th>Status</th><th>Gebäude</th><th>hoch</th><th>mittel</th><th>gering</th><th>ohne</th></tr></thead><tbody>' +
    rows + "</tbody></table></div>" +
    '<p class="small muted" style="margin-top:10px">Zeilen: aktuelle Filterauswahl (' + fmtN(scoped.length) + " Gebäude), aufgeschlüsselt nach Zuverlässigkeitsband.</p>";
}}

["f-aoi", "f-cls", "f-status", "f-band", "f-src"].forEach(id =>
  document.getElementById(id).addEventListener("change", render)
);
document.getElementById("f-reset").addEventListener("click", () => {{
  els.aoi.value = "-1"; els.cls.value = "-1"; els.status.value = "-1";
  els.band.value = "-1"; els.src.value = "0";
  render();
}});
render();
</script>
</body>
</html>
"""


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #
def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Vertrauens- und Ergebnis-Uebersicht (interaktiver One-Pager)."
    )
    parser.add_argument("--runs-json", type=Path, default=DEFAULT_RUNS)
    parser.add_argument("--output-json", type=Path, default=DEFAULT_JSON)
    parser.add_argument("--output-html", type=Path, default=DEFAULT_HTML)
    return parser


def main() -> None:
    args = build_arg_parser().parse_args()
    runs_registry = json.loads(args.runs_json.read_text(encoding="utf-8"))
    data = asyncio.run(_extract(runs_registry))

    args.output_json.parent.mkdir(parents=True, exist_ok=True)
    args.output_json.write_text(
        json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    html = build_html(data)
    args.output_html.write_text(html, encoding="utf-8")
    print(
        f"[trust_overview] {len(data['records'])} Gebaeude aus {len(data['runs'])} Runs -> "
        f"{args.output_html} ({args.output_html.stat().st_size / 1024:.1f} KB)"
    )


if __name__ == "__main__":
    main()
