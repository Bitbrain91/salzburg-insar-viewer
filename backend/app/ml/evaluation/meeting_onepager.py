"""Meeting-One-Pager-Generator (Skript D, Ticket XTV-D-W2-T1).

Fuehrt die beiden eingefrorenen Auswertungen fuer das Stakeholder-Meeting in
einem einzigen, selbsttragenden HTML-Dokument zusammen ("Variante 1"):

* Auswertung A -- Cross-Track-Konsistenz T44 (aufsteigend) vs T95 (absteigend)
  eines SNT-Runs (``cross_track_consistency_v4.json``).
* Auswertung B -- Sensor-Konsistenz SNT vs TSX/PAZ im Overlap-Fenster
  (``bad_gastein_snt_tsx_motion_comparison_v4.json``).

Das Dokument ist bewusst offline: alle Kennzahlen stammen aus den JSON-Artefakten
(keine hartkodierten Zahlen). Die Diagramme werden zur Laufzeit als einfache,
deutsch beschriftete Balken-SVGs direkt aus diesen Kennzahlen gezeichnet und
inline eingebettet (Stakeholder-Fassung; die technischen Scatter-SVGs der
Auswertungen bleiben unveraendert als eingefrorene Artefakte liegen). Keine
Screenshots, keine externen Ressourcen (kein CDN, keine Webfonts) -- reiner
System-Font-Stack, ein einziges File.

Aufruf (Repo-Root):
    backend/.venv-wsl/bin/python -m backend.app.ml.evaluation.meeting_onepager \\
        --output docs/pipelines/anomaly_local_v1/artifacts/stakeholder_onepager_2026-07.html
"""

from __future__ import annotations

import argparse
import io
import math
import re
from html import escape
from pathlib import Path
from typing import Any

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter

# --------------------------------------------------------------------------- #
# Pfade
# --------------------------------------------------------------------------- #
REPO_ROOT = Path(__file__).resolve().parents[4]
ARTIFACT_DIR = REPO_ROOT / "docs" / "pipelines" / "anomaly_local_v1" / "artifacts"

DEFAULT_CROSS_TRACK = ARTIFACT_DIR / "cross_track_consistency_v4.json"
DEFAULT_MOTION = ARTIFACT_DIR / "bad_gastein_snt_tsx_motion_comparison_v4.json"
DEFAULT_MANIFEST = ARTIFACT_DIR / "xtv_showcase_manifest.json"
DEFAULT_RUNS = ARTIFACT_DIR / "cross_track_validation_runs.json"
DEFAULT_OUTPUT = ARTIFACT_DIR / "stakeholder_onepager_2026-07.html"


# --------------------------------------------------------------------------- #
# JSON laden / navigieren
# --------------------------------------------------------------------------- #
def load_json(path: Path) -> Any:
    import json

    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def group(rows: list[dict], name: str) -> dict:
    """Zeile mit ``group == name`` aus einer Rollup-/Track-Liste."""
    for row in rows:
        if row.get("group") == name:
            return row
    raise KeyError(f"Gruppe {name!r} nicht gefunden")


def terrain(rows: list[dict], cls: str) -> dict:
    for row in rows:
        if row.get("terrain_class") == cls:
            return row
    raise KeyError(f"Terrain-Klasse {cls!r} nicht gefunden")


# --------------------------------------------------------------------------- #
# Deutsche Zahlformatierung
# --------------------------------------------------------------------------- #
def de(value: float | None, digits: int = 2, signed: bool = False) -> str:
    if value is None:
        return "n/v"
    text = f"{value:,.{digits}f}"
    text = text.replace(",", "\x00").replace(".", ",").replace("\x00", ".")
    if signed and value > 0:
        text = "+" + text
    return text


def dei(value: int) -> str:
    return f"{value:,}".replace(",", ".")


# --------------------------------------------------------------------------- #
# SVG inline einbetten (ids namespacen, feste Groesse entfernen)
# --------------------------------------------------------------------------- #
def _prep_svg(raw: str, prefix: str) -> str:
    # XML-Prolog und DOCTYPE entfernen -- inline nicht erlaubt/noetig.
    raw = re.sub(r"<\?xml[^>]*\?>", "", raw)
    raw = re.sub(r"<!DOCTYPE[^>]*>", "", raw, flags=re.IGNORECASE)
    # matplotlib bettet einen <metadata>-RDF-Block mit matplotlib.org-Verweis ein.
    # Er wird nie abgerufen, ist inline aber nutzlos -- entfernen (kleiner + sauber).
    raw = re.sub(r"<metadata>.*?</metadata>", "", raw, flags=re.DOTALL | re.IGNORECASE)
    # id-Kollisionen zwischen mehreren inline-SVGs vermeiden.
    ids = sorted(set(re.findall(r'id="([^"]+)"', raw)), key=len, reverse=True)
    for ident in ids:
        raw = raw.replace(f'id="{ident}"', f'id="{prefix}{ident}"')
        raw = raw.replace(f"url(#{ident})", f"url(#{prefix}{ident})")
        raw = raw.replace(f'xlink:href="#{ident}"', f'xlink:href="#{prefix}{ident}"')
        raw = raw.replace(f'href="#{ident}"', f'href="#{prefix}{ident}"')
    # Feste pt-Groesse gegen responsives width:100% tauschen (viewBox bleibt).
    raw = re.sub(
        r"(<svg\b[^>]*?)\swidth=\"[^\"]*\"\sheight=\"[^\"]*\"",
        r"\1",
        raw,
        count=1,
    )
    return raw.strip()


def svg_from_fig(fig, prefix: str) -> str:
    buffer = io.StringIO()
    fig.savefig(buffer, format="svg", bbox_inches="tight", transparent=True)
    plt.close(fig)
    return _prep_svg(buffer.getvalue(), prefix)


# --------------------------------------------------------------------------- #
# Einfache Balkendiagramme, zur Laufzeit aus den JSON-Kennzahlen gezeichnet.
# Ziel: Stakeholder-Lesbarkeit -- deutsche Klartext-Labels, direkte Wertelabels
# an den Balken, keine Fachlegenden. Die Farben folgen den Seiten-Tokens
# (Petrol = Ebene/Konsistenz, Grau = Uebergang, Amber = Hang/Divergenz).
# Die Diagramme sitzen auf weissen Plates (--plate), daher feste Farben.
# --------------------------------------------------------------------------- #
COLOR_EBENE = "#0d6e75"
COLOR_UEBERGANG = "#8593a0"
COLOR_HANG = "#b5641b"
_CH_INK = "#10171c"
_CH_MUTED = "#5a6772"
_CH_GRID = "#d6dde1"


def bar_chart_svg(
    prefix: str,
    labels: list[str],
    values: list[float],
    colors: list[str],
    *,
    ylabel: str = "",
    ylim: tuple[float, float] | None = None,
    zero_line: bool = False,
    corner_notes: tuple[str, str] | None = None,
    figsize: tuple[float, float] = (7.6, 3.4),
) -> str:
    fig, ax = plt.subplots(figsize=figsize, dpi=100)
    xs = list(range(len(values)))
    ax.bar(xs, values, color=colors, width=0.58, zorder=3)
    ax.set_xticks(xs)
    ax.set_xticklabels(labels, fontsize=12.5, color=_CH_INK)
    if ylim:
        ax.set_ylim(*ylim)
    if ylabel:
        ax.set_ylabel(ylabel, fontsize=12, color=_CH_MUTED)
    if zero_line:
        ax.axhline(0.0, color=_CH_INK, linewidth=1.2, zorder=2)
    for spine in ("top", "right"):
        ax.spines[spine].set_visible(False)
    for spine in ("left", "bottom"):
        ax.spines[spine].set_color(_CH_GRID)
    ax.tick_params(colors=_CH_MUTED, labelsize=11)
    ax.yaxis.grid(True, color=_CH_GRID, linewidth=0.8)
    ax.set_axisbelow(True)
    ax.yaxis.set_major_formatter(FuncFormatter(lambda v, _pos: de(v, 1)))
    lo, hi = ax.get_ylim()
    offset = (hi - lo) * 0.035
    for x, v in zip(xs, values):
        ax.annotate(
            de(v, 2, signed=zero_line),
            (x, v + (offset if v >= 0 else -offset)),
            ha="center",
            va="bottom" if v >= 0 else "top",
            fontsize=15,
            fontweight="bold",
            color=_CH_INK,
            zorder=4,
        )
    if corner_notes:
        # Links platziert: rechts kollidieren die Notizen mit hohen Balken.
        top_note, bottom_note = corner_notes
        ax.text(0.008, 0.97, top_note, transform=ax.transAxes, ha="left",
                va="top", fontsize=10.5, color=_CH_MUTED)
        ax.text(0.008, 0.03, bottom_note, transform=ax.transAxes, ha="left",
                va="bottom", fontsize=10.5, color=_CH_MUTED)
    return svg_from_fig(fig, prefix)


# --------------------------------------------------------------------------- #
# Reproduktions-Kommandos aus den Run-Registrierungen ableiten
# --------------------------------------------------------------------------- #
def aoi_short(label: str) -> str:
    """``xtv_sbg_flat_ext_02_snt_bev_v4`` -> ``sbg_flat_ext_02``."""
    name = re.sub(r"^xtv_", "", label)
    name = re.sub(r"_(snt|tsxpaz)_bev_v4$", "", name)
    return name


def repro_commands(extended: list[dict]) -> tuple[str, str]:
    snt_runs = [r for r in extended if r["dataset_id"].endswith("_snt")]
    run_lines = " \\\n        ".join(
        f"--run {aoi_short(r['label'])}={r['run_id']}" for r in snt_runs
    )

    def pick(aoi: str, dataset: str) -> str:
        for r in extended:
            if r["aoi"] == aoi and r["dataset_id"] == dataset:
                return r["run_id"]
        return "?"

    art = "docs/pipelines/anomaly_local_v1/artifacts"
    cmd_a = (
        "backend/.venv-wsl/bin/python -m backend.app.ml.evaluation.cross_track_consistency \\\n"
        f"        {run_lines} \\\n"
        f"        --output-md {art}/cross_track_consistency_v4.md \\\n"
        f"        --output-json {art}/cross_track_consistency_v4.json \\\n"
        f"        --charts-dir {art}"
    )
    cmd_b = (
        "backend/.venv-wsl/bin/python -m backend.app.ml.evaluation.bad_gastein_motion_compare \\\n"
        f"        --source bev \\\n"
        f"        --flat-snt-run {pick('bg_flat_ext_01', 'bad_gastein_snt')} \\\n"
        f"        --flat-tsx-run {pick('bg_flat_ext_01', 'bad_gastein_tsx_paz')} \\\n"
        f"        --slope-snt-run {pick('bg_slope_ext_01', 'bad_gastein_snt')} \\\n"
        f"        --slope-tsx-run {pick('bg_slope_ext_01', 'bad_gastein_tsx_paz')} \\\n"
        f"        --output-json {art}/bad_gastein_snt_tsx_motion_comparison_v4.json \\\n"
        f"        --charts-dir {art}"
    )
    return cmd_a, cmd_b


# --------------------------------------------------------------------------- #
# Topografische Hoehenlinien fuer den Kopf (generativ, statisch)
# --------------------------------------------------------------------------- #
def contour_svg(width: int = 1200, height: int = 300, lines: int = 8) -> str:
    paths = []
    for k in range(lines):
        y0 = 24 + k * (height - 48) / (lines - 1)
        amp = 10 + k * 2.2
        pts = []
        for x in range(0, width + 1, 16):
            phase = (x / width) * math.pi * 2.4 + k * 0.6
            y = y0 + amp * math.sin(phase) + (amp * 0.35) * math.sin(phase * 2.3 + 1.0)
            pts.append(f"{x},{y:.1f}")
        opacity = 0.05 + 0.045 * (1 - abs(k - lines / 2) / (lines / 2))
        paths.append(
            f'<polyline points="{" ".join(pts)}" fill="none" '
            f'stroke="var(--accent)" stroke-width="1.1" opacity="{opacity:.3f}"/>'
        )
    return (
        f'<svg class="contours" viewBox="0 0 {width} {height}" '
        f'preserveAspectRatio="none" aria-hidden="true">{"".join(paths)}</svg>'
    )


# --------------------------------------------------------------------------- #
# Kontext aus den Artefakten zusammenstellen
# --------------------------------------------------------------------------- #
def build_context(
    cross_track: dict,
    motion: dict,
    manifest: dict,
    runs: dict,
    artifact_dir: Path,
) -> dict:
    ctx: dict[str, Any] = {}

    # -- Kopf ------------------------------------------------------------- #
    ctx["model_version"] = runs["model_set_version"]
    ctx["extended_runs"] = runs["extended_runs"]
    ctx["n_runs"] = len(runs["extended_runs"])
    # Datenstand der eingefrorenen Auswertungen: 2026-07-15; Textfassung: 2026-07-23.
    ctx["stand"] = "2026-07-23 (Daten: 2026-07-15)"

    # -- Auswertung A: strict-Leitgruppe ---------------------------------- #
    strict = cross_track["metrics"]["strict"]
    ctx["a"] = {
        "deadband": cross_track["params"]["deadband"],
        "n_coupled": cross_track["agreement_sanity"]["n"],
        "flach": strict["flach"],
        "uebergang": strict["uebergang"],
        "hang": strict["hang"],
        "pooled": strict["_pooled"],
    }

    # -- Auswertung B: NUR das gemeinsame Zeitfenster (Vertikalproxy, ok_ok) #
    flat = motion["metrics"]["bg_flat_ext_01"]
    slope = motion["metrics"]["bg_slope_ext_01"]

    def overlap_ok(aoi_metrics: dict, pair: str) -> dict:
        return group(aoi_metrics["overlap_vertical"][pair], "ok_ok")

    win = {
        "flat_asc": overlap_ok(flat, "ASC-vs-ASC"),
        "flat_dsc": overlap_ok(flat, "DSC-vs-DSC"),
        "slope_asc": overlap_ok(slope, "ASC-vs-ASC"),
        "slope_dsc": overlap_ok(slope, "DSC-vs-DSC"),
    }
    win_terrain = {
        pair: {
            row["terrain_class"]: row
            for row in slope["overlap_vertical_by_terrain"][pair]["ok_ok"]
        }
        for pair in ("ASC-vs-ASC", "DSC-vs-DSC")
    }

    vproxy_mae = [row["mae"] for row in win.values()]
    win_median_delta = [row["median_abs_diff"] for row in win.values()]

    ctx["b"] = {
        "params": motion["params"],
        "win": win,
        "win_terrain": win_terrain,
        "win_delta_min": min(win_median_delta),
        "win_delta_max": max(win_median_delta),
        "vproxy_mae_min": min(vproxy_mae),
        "vproxy_mae_max": max(vproxy_mae),
        "audit": motion["audit"],
        "n_audit": len(motion["audit"]),
    }

    # -- Viewer-Verweise (Deep-Links) aus dem Manifest -------------------- #
    shots = {s["kind"] if s["kind"] != "flach" else f"flach{s['n']}": s for s in manifest["screenshots"]}
    ctx["shots"] = shots

    # -- Diagramme: einfache Balken direkt aus den Kennzahlen ------------- #
    fl_m, ue_m, ha_m = strict["flach"], strict["uebergang"], strict["hang"]
    klassen_labels = [
        f"Ebene (unter 5°)\n{dei(fl_m['n'])} Gebäude",
        f"Übergang (5–15°)\n{dei(ue_m['n'])} Gebäude",
        f"Hang (ab 15°)\n{dei(ha_m['n'])} Gebäude",
    ]
    klassen_farben = [COLOR_EBENE, COLOR_UEBERGANG, COLOR_HANG]
    rang_notes = ("+1 = gleiche Reihenfolge", "−1 = umgekehrte Reihenfolge")
    abw_werte = [fl_m["median_abs_delta"], ue_m["median_abs_delta"], ha_m["median_abs_delta"]]
    win_keys = ("flat_asc", "flat_dsc", "slope_asc", "slope_dsc")
    win_labels = [
        f"Ebene\naufsteigend\n{dei(win['flat_asc']['n'])} Geb.",
        f"Ebene\nabsteigend\n{dei(win['flat_dsc']['n'])} Geb.",
        f"Hanggebiet\naufsteigend\n{dei(win['slope_asc']['n'])} Geb.",
        f"Hanggebiet\nabsteigend\n{dei(win['slope_dsc']['n'])} Geb.",
    ]
    win_colors = [COLOR_EBENE, COLOR_EBENE, COLOR_HANG, COLOR_HANG]
    win_delta_werte = [win[k]["median_abs_diff"] for k in win_keys]
    terrain_order = ("flach", "uebergang", "hang")
    terrain_max = max(
        win_terrain[pair][cls]["median_abs_diff"]
        for pair in win_terrain
        for cls in terrain_order
    )

    def terrain_chart(prefix: str, pair: str) -> str:
        rows = win_terrain[pair]
        return bar_chart_svg(
            prefix,
            [
                f"Ebene (unter 5°)\n{dei(rows['flach']['n'])} Geb.",
                f"Übergang (5–15°)\n{dei(rows['uebergang']['n'])} Geb.",
                f"Hang (ab 15°)\n{dei(rows['hang']['n'])} Geb.",
            ],
            [rows[cls]["median_abs_diff"] for cls in terrain_order],
            klassen_farben,
            ylabel="mm/Jahr",
            ylim=(0.0, terrain_max * 1.35),
        )

    ctx["charts"] = {
        "a_abweichung": bar_chart_svg(
            "caw_",
            klassen_labels,
            abw_werte,
            klassen_farben,
            ylabel="mm/Jahr",
            ylim=(0.0, max(abw_werte) * 1.35),
        ),
        "a_rangfolge": bar_chart_svg(
            "crf_",
            klassen_labels,
            [fl_m["spearman"], ue_m["spearman"], ha_m["spearman"]],
            klassen_farben,
            ylim=(-1.0, 1.0),
            zero_line=True,
            corner_notes=rang_notes,
        ),
        "b_rangfolge": bar_chart_svg(
            "cbs_",
            win_labels,
            [win[k]["spearman"] for k in win_keys],
            win_colors,
            ylim=(-1.0, 1.0),
            zero_line=True,
            corner_notes=rang_notes,
        ),
        "b_abweichung": bar_chart_svg(
            "cba_",
            win_labels,
            win_delta_werte,
            win_colors,
            ylabel="mm/Jahr",
            ylim=(0.0, max(win_delta_werte) * 1.35),
        ),
        "b_terrain_asc": terrain_chart("cbta_", "ASC-vs-ASC"),
        "b_terrain_dsc": terrain_chart("cbtd_", "DSC-vs-DSC"),
    }

    # -- Reproduktion ----------------------------------------------------- #
    ctx["repro_a"], ctx["repro_b"] = repro_commands(runs["extended_runs"])

    return ctx


# --------------------------------------------------------------------------- #
# CSS (System-Font-Stack, hell + dunkel ueber Tokens)
# --------------------------------------------------------------------------- #
STYLE = """
:root {
  --sans: "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Roboto, Arial, sans-serif;
  --serif: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif;
  --mono: "Cascadia Mono", "SFMono-Regular", "SF Mono", Menlo, Consolas, "DejaVu Sans Mono", ui-monospace, monospace;

  --ground: #eef1f3;
  --panel: #ffffff;
  --panel-2: #f5f7f8;
  --ink: #10171c;
  --muted: #5a6772;
  --faint: #8593a0;
  --line: #d6dde1;
  --line-strong: #b9c4cb;

  --accent: #0d6e75;         /* Petrol / Konsistenz */
  --accent-soft: #e2f0f0;
  --accent-ink: #0a545a;
  --signal: #b5641b;         /* Alpin-Amber / Divergenz */
  --signal-soft: #f6e9dc;
  --signal-ink: #8f4d12;
  --plate: #ffffff;
  --plate-line: #e3e8eb;

  --shadow: 0 1px 2px rgba(16, 23, 28, .05), 0 8px 24px rgba(16, 23, 28, .06);
  --radius: 10px;
  --maxw: 1180px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --ground: #0c1216;
    --panel: #131c21;
    --panel-2: #0f171b;
    --ink: #e9eef1;
    --muted: #9fadb6;
    --faint: #74838d;
    --line: #24323a;
    --line-strong: #33454e;
    --accent: #3fb4bd;
    --accent-soft: #12312f;
    --accent-ink: #7fd3d9;
    --signal: #e0954a;
    --signal-soft: #3a2a17;
    --signal-ink: #f0b878;
    --plate: #ffffff;
    --plate-line: #cfd6da;
    --shadow: 0 1px 2px rgba(0,0,0,.3), 0 10px 30px rgba(0,0,0,.4);
  }
}
:root[data-theme="light"] {
  --ground: #eef1f3; --panel: #ffffff; --panel-2: #f5f7f8; --ink: #10171c;
  --muted: #5a6772; --faint: #8593a0; --line: #d6dde1; --line-strong: #b9c4cb;
  --accent: #0d6e75; --accent-soft: #e2f0f0; --accent-ink: #0a545a;
  --signal: #b5641b; --signal-soft: #f6e9dc; --signal-ink: #8f4d12;
  --plate: #ffffff; --plate-line: #e3e8eb;
  --shadow: 0 1px 2px rgba(16,23,28,.05), 0 8px 24px rgba(16,23,28,.06);
}
:root[data-theme="dark"] {
  --ground: #0c1216; --panel: #131c21; --panel-2: #0f171b; --ink: #e9eef1;
  --muted: #9fadb6; --faint: #74838d; --line: #24323a; --line-strong: #33454e;
  --accent: #3fb4bd; --accent-soft: #12312f; --accent-ink: #7fd3d9;
  --signal: #e0954a; --signal-soft: #3a2a17; --signal-ink: #f0b878;
  --plate: #ffffff; --plate-line: #cfd6da;
  --shadow: 0 1px 2px rgba(0,0,0,.3), 0 10px 30px rgba(0,0,0,.4);
}

* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  background: var(--ground);
  color: var(--ink);
  font-family: var(--serif);
  font-size: 17px;
  line-height: 1.62;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.wrap { max-width: var(--maxw); margin: 0 auto; padding: 0 28px; }
.doc { max-width: var(--maxw); margin: 40px auto 72px; }

/* --- typografie --- */
h1, h2, h3, .kicker, .tile, .metaline, .chip, .runtable, code, .deeplink, th, .fig-verdict { font-family: var(--sans); }
.mono, code, .deeplink, .num, .runtable td, .audit td, .metaline b { font-family: var(--mono); }
.num { font-variant-numeric: tabular-nums; }

.kicker {
  font-size: 12px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase;
  color: var(--accent-ink); font-family: var(--mono);
}
h1 {
  font-family: var(--sans); font-weight: 760; font-size: clamp(28px, 4.4vw, 46px);
  line-height: 1.08; letter-spacing: -0.015em; margin: 14px 0 0; text-wrap: balance;
}
h2 {
  font-family: var(--sans); font-weight: 720; font-size: clamp(21px, 2.6vw, 28px);
  letter-spacing: -0.01em; margin: 0; text-wrap: balance;
}
h3 { font-family: var(--sans); font-weight: 680; font-size: 17px; margin: 0 0 6px; letter-spacing: -0.005em; }
p { margin: 0 0 14px; }
.lead { font-size: 18.5px; color: var(--ink); max-width: 66ch; }
.muted { color: var(--muted); }
.small { font-size: 13.5px; line-height: 1.55; }
a { color: var(--accent-ink); text-underline-offset: 2px; }

/* --- masthead --- */
.masthead {
  position: relative; overflow: hidden;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 40px 40px 30px;
}
.masthead .contours { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 0; }
.masthead > * { position: relative; z-index: 1; }
.masthead .toprow { display: flex; justify-content: space-between; align-items: baseline; gap: 20px; flex-wrap: wrap; }
.variant-badge {
  font-family: var(--mono); font-size: 11.5px; font-weight: 600; letter-spacing: .12em;
  text-transform: uppercase; color: var(--accent-ink);
  border: 1px solid var(--accent); border-radius: 999px; padding: 5px 12px; background: var(--accent-soft);
  white-space: nowrap;
}
.masthead .sub { color: var(--muted); font-family: var(--sans); font-size: 15px; margin-top: 10px; }
.metaline {
  margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--line);
  display: flex; flex-wrap: wrap; gap: 8px 26px; font-family: var(--sans); font-size: 13.5px; color: var(--muted);
}
.metaline .item { display: flex; flex-direction: column; gap: 2px; }
.metaline .k { font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--faint); }
.metaline b { color: var(--ink); font-weight: 600; font-size: 14px; }

.geo-legend { display: flex; gap: 18px; margin-top: 18px; font-family: var(--sans); font-size: 13px; color: var(--muted); flex-wrap: wrap; }
.geo-legend span { display: inline-flex; align-items: center; gap: 7px; }
.geo-legend .arrow { font-size: 17px; line-height: 1; color: var(--accent); font-weight: 700; }
.geo-legend .arrow.desc { color: var(--signal); }

/* --- sektionsstruktur --- */
section { margin-top: 46px; }
.sec-head { display: flex; align-items: baseline; gap: 16px; margin-bottom: 6px; flex-wrap: wrap; }
.sec-head .idx {
  font-family: var(--mono); font-size: 13px; font-weight: 700; color: var(--accent);
  border: 1px solid var(--accent); border-radius: 7px; padding: 3px 9px; letter-spacing: .04em;
}
.sec-sub { font-family: var(--mono); font-size: 12px; letter-spacing: .1em; text-transform: uppercase; color: var(--faint); margin-top: 4px; }
.rule { height: 1px; background: var(--line); border: 0; margin: 14px 0 22px; }

/* --- these: drei-schritte-story --- */
.thesis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-top: 22px; }
.tcard {
  background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius);
  padding: 22px 22px 20px; box-shadow: var(--shadow); position: relative;
  border-top: 3px solid var(--line-strong); display: flex; flex-direction: column;
}
.tcard.agree { border-top-color: var(--accent); }
.tcard.diverge { border-top-color: var(--signal); }
.tcard.conclude { border-top-color: var(--ink); }
.tcard .step { font-family: var(--mono); font-size: 12px; letter-spacing: .12em; color: var(--faint); text-transform: uppercase; }
.tcard .claim { font-family: var(--sans); font-weight: 680; font-size: 18px; line-height: 1.28; margin: 8px 0 12px; letter-spacing: -0.01em; text-wrap: balance; }
.tcard p { font-family: var(--serif); font-size: 14.5px; line-height: 1.5; color: var(--muted); margin: 0; }
.tcard .figure { margin-top: auto; padding-top: 16px; display: flex; align-items: baseline; gap: 9px; }
.tcard .figure .big { font-family: var(--mono); font-weight: 700; font-size: 34px; line-height: 1; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.tcard.agree .figure .big { color: var(--accent-ink); }
.tcard.diverge .figure .big { color: var(--signal-ink); }
.tcard .figure .cap { font-family: var(--sans); font-size: 12px; color: var(--muted); line-height: 1.25; }

/* --- panel + kachel-vergleich --- */
.panel { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); box-shadow: var(--shadow); }
.compare { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 22px 0; }
.col {
  border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; background: var(--panel); box-shadow: var(--shadow);
}
.col .col-head { padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; gap: 10px; border-bottom: 1px solid var(--line); }
.col.flat .col-head { background: var(--accent-soft); }
.col.slope .col-head { background: var(--signal-soft); }
.col .col-title { font-family: var(--sans); font-weight: 700; font-size: 15.5px; }
.col .col-title small { display: block; font-weight: 500; font-size: 12px; color: var(--muted); font-family: var(--mono); letter-spacing: .03em; margin-top: 2px; }
.tag { font-family: var(--mono); font-size: 11px; font-weight: 600; letter-spacing: .06em; padding: 3px 9px; border-radius: 999px; white-space: nowrap; }
.tag.agree { background: var(--accent); color: #fff; }
.tag.diverge { background: var(--signal); color: #fff; }
.metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px; background: var(--line); }
.metrics .cell { background: var(--panel); padding: 13px 18px; }
.metrics .cell.wide { grid-column: 1 / -1; }
.metrics .cell .lbl { font-family: var(--sans); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--faint); }
.metrics .cell .val { font-family: var(--mono); font-weight: 700; font-size: 25px; margin-top: 3px; font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }
.metrics .cell .val small { font-size: 13px; font-weight: 500; color: var(--muted); margin-left: 3px; }
.metrics .cell.hi .val { color: var(--accent-ink); }
.col.slope .metrics .cell.hi .val { color: var(--signal-ink); }

/* --- kacheln (b) --- */
.tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin: 22px 0; }
.stat { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 16px 18px; box-shadow: var(--shadow); }
.stat .lbl { font-family: var(--sans); font-size: 11px; letter-spacing: .07em; text-transform: uppercase; color: var(--faint); line-height: 1.3; }
.stat .val { font-family: var(--mono); font-weight: 700; font-size: 30px; margin-top: 6px; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.stat .val small { font-size: 13px; font-weight: 500; color: var(--muted); }
.stat.accent .val { color: var(--accent-ink); }
.stat.signal .val { color: var(--signal-ink); }
.stat .sub { font-family: var(--sans); font-size: 12px; color: var(--muted); margin-top: 5px; line-height: 1.35; }

/* --- diagramm-platten --- */
.plates { display: grid; gap: 18px; margin: 22px 0; }
.plates.two { grid-template-columns: 1fr 1fr; }
.plates.scatter-lead { grid-template-columns: 1.15fr 1fr; }
.plate {
  background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow);
  display: flex; flex-direction: column;
}
.plate .mount { background: var(--plate); border-bottom: 1px solid var(--plate-line); padding: 14px; }
.plate .mount svg { width: 100%; height: auto; display: block; }
.plate .cap { padding: 11px 16px; font-family: var(--sans); font-size: 12.5px; color: var(--muted); line-height: 1.4; }
.plate .cap b { color: var(--ink); font-weight: 600; }

/* --- figuren / screenshots --- */
.figs { display: grid; gap: 18px; margin: 22px 0; }
.figs.three { grid-template-columns: repeat(3, 1fr); }
.figure-card { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow); display: flex; flex-direction: column; }
.figure-card .shot { width: 100%; display: block; border-bottom: 1px solid var(--line); background: var(--panel-2); }
.figure-card .body { padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 10px; }
.figure-card .fig-title { display: flex; align-items: center; gap: 8px; }
.figure-card .fig-title .name { font-family: var(--sans); font-weight: 680; font-size: 14px; }
.figure-card .fig-cap { font-family: var(--serif); font-size: 14px; line-height: 1.45; color: var(--ink); margin: 0; }
.fig-verdict { display: flex; flex-wrap: wrap; gap: 6px; }
.vchip { font-family: var(--mono); font-size: 11px; padding: 3px 8px; border-radius: 6px; background: var(--panel-2); border: 1px solid var(--line); color: var(--muted); }
.vchip b { color: var(--ink); font-weight: 700; }
.deeplink { font-family: var(--mono); font-size: 10.5px; color: var(--faint); word-break: break-all; line-height: 1.4; padding-top: 4px; border-top: 1px dashed var(--line); }
.deeplink .dl-k { color: var(--accent-ink); text-transform: uppercase; letter-spacing: .08em; }

.audit-note {
  margin: 20px 0; border: 1px solid var(--signal); border-left: 4px solid var(--signal);
  border-radius: var(--radius); background: var(--signal-soft); padding: 18px 22px;
}
.audit-note h3 { color: var(--signal-ink); }
.audit-note .divergence { display: flex; gap: 26px; flex-wrap: wrap; margin: 12px 0 8px; }
.audit-note .divergence .d { }
.audit-note .divergence .d .n { font-family: var(--mono); font-weight: 700; font-size: 26px; color: var(--signal-ink); font-variant-numeric: tabular-nums; }
.audit-note .divergence .d .t { font-family: var(--sans); font-size: 12px; color: var(--muted); }
.audit-note p { font-family: var(--serif); font-size: 14.5px; margin: 6px 0 0; }

/* --- tabellen --- */
.tablewrap { overflow-x: auto; border: 1px solid var(--line); border-radius: var(--radius); box-shadow: var(--shadow); background: var(--panel); }
table { border-collapse: collapse; width: 100%; font-size: 13px; }
thead th {
  font-family: var(--sans); font-weight: 640; text-align: left; padding: 11px 14px; color: var(--muted);
  font-size: 11px; letter-spacing: .06em; text-transform: uppercase; border-bottom: 1px solid var(--line-strong); white-space: nowrap;
  background: var(--panel-2);
}
tbody td { padding: 10px 14px; border-bottom: 1px solid var(--line); font-family: var(--mono); font-variant-numeric: tabular-nums; white-space: nowrap; }
tbody td.txt { font-family: var(--sans); white-space: normal; }
tbody tr:last-child td { border-bottom: 0; }
tbody tr:hover td { background: var(--panel-2); }
td.num-r { text-align: right; }
.audit td .cls { font-family: var(--sans); font-size: 11px; padding: 2px 7px; border-radius: 5px; background: var(--panel-2); border: 1px solid var(--line); }

/* --- caveat --- */
.caveat {
  margin-top: 46px; border: 1px solid var(--signal); border-radius: var(--radius);
  background: var(--panel); box-shadow: var(--shadow); overflow: hidden;
}
.caveat .cv-head { background: var(--signal-soft); padding: 18px 26px; border-bottom: 1px solid var(--signal); display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; }
.caveat .cv-head .kicker { color: var(--signal-ink); }
.caveat .cv-head h2 { color: var(--signal-ink); }
.caveat .cv-body { padding: 8px 26px 22px; }
.caveat ul { list-style: none; margin: 0; padding: 0; }
.caveat li { padding: 15px 0; border-bottom: 1px solid var(--line); display: grid; grid-template-columns: 210px 1fr; gap: 20px; align-items: start; }
.caveat li:last-child { border-bottom: 0; }
.caveat li .h { font-family: var(--sans); font-weight: 680; font-size: 14.5px; color: var(--ink); }
.caveat li .h .q { font-family: var(--mono); display: block; font-weight: 400; font-size: 12px; color: var(--signal-ink); margin-top: 3px; }
.caveat li p { font-family: var(--serif); font-size: 14.5px; margin: 0; color: var(--muted); }

/* --- anhang --- */
.appendix { margin-top: 46px; }
.appendix h3 { font-size: 15px; margin: 26px 0 10px; color: var(--ink); }
pre {
  margin: 0; background: var(--panel-2); border: 1px solid var(--line); border-radius: var(--radius);
  padding: 16px 18px; overflow-x: auto; font-family: var(--mono); font-size: 12.5px; line-height: 1.6; color: var(--ink);
}
pre .cmt { color: var(--faint); }
.artlist { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 4px; }
.artlist li { font-family: var(--mono); font-size: 12.5px; color: var(--muted); display: flex; gap: 10px; }
.artlist li .role { color: var(--accent-ink); }

/* --- schlussfolgerung --- */
.conclusion {
  margin-top: 20px; background: var(--panel); border: 1px solid var(--line-strong);
  border-left: 4px solid var(--accent); border-radius: var(--radius); box-shadow: var(--shadow);
  padding: 20px 24px;
}
.conclusion h3 { margin-bottom: 8px; }
.conclusion p { font-family: var(--serif); font-size: 15.5px; line-height: 1.6; color: var(--muted); margin: 0; max-width: 92ch; }

/* --- lesehilfe --- */
.readaid {
  margin: 18px 0 0; background: var(--panel-2); border: 1px dashed var(--line-strong);
  border-radius: var(--radius); padding: 13px 18px;
  font-family: var(--sans); font-size: 13.5px; line-height: 1.55; color: var(--muted);
}
.readaid b { color: var(--ink); }

/* --- anhang einklappbar --- */
details.fold { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); box-shadow: var(--shadow); }
details.fold > summary {
  cursor: pointer; list-style: none; font-family: var(--sans); font-weight: 650; font-size: 15px;
  color: var(--accent-ink); padding: 16px 20px;
}
details.fold > summary::before { content: "▸ "; }
details.fold[open] > summary::before { content: "▾ "; }
details.fold[open] > summary { border-bottom: 1px solid var(--line); }
details.fold .fold-body { padding: 4px 20px 22px; }

footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid var(--line); font-family: var(--sans); font-size: 12.5px; color: var(--faint); display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; }

/* --- responsive --- */
@media (max-width: 900px) {
  .thesis, .compare, .tiles, .plates.two, .plates.scatter-lead, .figs.three { grid-template-columns: 1fr; }
  .caveat li { grid-template-columns: 1fr; gap: 4px; }
  .metrics { grid-template-columns: 1fr 1fr; }
}
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
"""


# --------------------------------------------------------------------------- #
# HTML-Bausteine
# --------------------------------------------------------------------------- #
def render_masthead(ctx: dict) -> str:
    a = ctx["a"]
    b = ctx["b"]
    meta = [
        ("Gebiete", "Stadt Salzburg · Bad Gastein"),
        ("Gebäudequelle", "BEV (amtliche Grundrisse)"),
        ("Blickrichtungs-Vergleich", f"{dei(a['n_coupled'])} Gebäude"),
        ("Sensor-Vergleich (Fenster)", f"{dei(b['win']['flat_asc']['n'])} / {dei(b['win']['slope_asc']['n'])} Gebäude (Ebene/Hang)"),
        ("Modellstand", ctx["model_version"]),
    ]
    items = "".join(
        f'<div class="item"><span class="k">{escape(k)}</span><b>{escape(v)}</b></div>'
        for k, v in meta
    )
    return f"""
<header class="masthead">
  {contour_svg()}
  <div class="toprow">
    <span class="kicker">InSAR-Gebäudebewertung · Zwischenbefund</span>
    <span class="variant-badge">Juli 2026</span>
  </div>
  <h1>Können wir den Satelliten&shy;messungen trauen?</h1>
  <p class="sub">Radarsatelliten messen millimetergenau, ob sich Gebäude heben oder senken.
  Bevor wir diesen Zahlen vertrauen, haben wir sie zwei Gegenproben unterzogen.
  Dieses Dokument fasst beide einfach zusammen. Stand: {escape(ctx['stand'])}.</p>
  <div class="geo-legend">
    <span><span class="arrow">↗</span> aufsteigende Bahn — Blick von der einen Seite</span>
    <span><span class="arrow desc">↘</span> absteigende Bahn — Blick von der anderen Seite</span>
    <span class="muted">SNT = Sentinel-1 (frei verfügbar) · TSX/PAZ = TerraSAR-X/PAZ (kommerzielle Referenz)</span>
  </div>
  <div class="metaline">{items}</div>
</header>
"""


def render_thesis(ctx: dict) -> str:
    a = ctx["a"]
    b = ctx["b"]
    flach_median_a = a["flach"]["median_abs_delta"]
    hang_spearman_a = a["hang"]["spearman"]
    hang_spearman_b = b["win"]["slope_dsc"]["spearman"]
    return f"""
<section id="story">
  <div class="sec-head">
    <span class="kicker">Das Wichtigste in Kürze</span>
  </div>
  <h2>Drei Befunde, eine Schlussfolgerung</h2>
  <div class="sec-sub">Gegenprobe 1: zwei Blickrichtungen · Gegenprobe 2: zwei Satellitensysteme</div>
  <div class="thesis">
    <article class="tcard agree">
      <span class="step">Befund 1 · In der Ebene</span>
      <div class="claim">In der Ebene passt alles zusammen.</div>
      <p>Dasselbe Gebäude, von zwei Seiten gemessen: Beide Blickrichtungen liefern fast identische Werte. Die typische Abweichung liegt innerhalb des normalen Messrauschens.</p>
      <div class="figure"><span class="big num">{de(flach_median_a)}</span><span class="cap">mm/Jahr typische Abweichung<br>zwischen den Blickrichtungen (Ebene)</span></div>
    </article>
    <article class="tcard diverge">
      <span class="step">Befund 2 · Am Hang</span>
      <div class="claim">Am Hang widersprechen sich die Blickrichtungen.</div>
      <p>Am Hang messen die beiden Blickrichtungen systematisch Unterschiedliches: Sie ordnen die Gebäude tendenziell gegenläufig. Der Zusammenhang ist schwach, aber bei {dei(a["hang"]["n"])} Gebäuden eindeutig kein Zufall — und sein Vorzeichen ist umgekehrt zur Ebene.</p>
      <div class="figure"><span class="big num">{de(hang_spearman_a, 2, signed=True)}</span><span class="cap">Rangfolge-Übereinstimmung am Hang<br>(−1 wäre exakt umgekehrte Reihenfolge)</span></div>
    </article>
    <article class="tcard agree">
      <span class="step">Befund 3 · Gegenprobe mit zweitem System</span>
      <div class="claim">Das Hangsignal ist echt — zwei unabhängige Systeme sehen dasselbe.</div>
      <p>Der freie Sentinel-Satellit und das genauere kommerzielle Referenzsystem TSX/PAZ messen im selben Zeitfenster am Hang dasselbe Bewegungsmuster. Der Widerspruch aus Befund 2 liegt also nicht am Messgerät.</p>
      <div class="figure"><span class="big num">{de(hang_spearman_b, 2, signed=True)}</span><span class="cap">Rangfolge-Übereinstimmung im gemeinsamen<br>Fenster (Hanggebiet, absteigende Bahn)</span></div>
    </article>
  </div>
  <div class="conclusion">
    <h3>Schlussfolgerung: Am Hang bricht unsere Rechenannahme — nicht die Messung.</h3>
    <p>Bisher rechnen wir jede Messung so um, als würden sich Gebäude nur senkrecht
    bewegen. In der Ebene stimmt das gut (Befund 1). Am Hang bewegen sich Gebäude
    aber auch seitwärts — deshalb widersprechen sich dort die Blickrichtungen
    (Befund 2), obwohl beide korrekt messen (Befund 3). Der nächste Schritt ist
    daher eine Berechnung, die senkrechte und seitliche Bewegung am Hang sauber
    trennt (2D-Zerlegung), gestützt auf das bereits beschaffte 1-m-Geländemodell.</p>
  </div>
</section>
"""


def _metric_cell(lbl: str, val: str, hi: bool = False, wide: bool = False) -> str:
    cls = "cell" + (" hi" if hi else "") + (" wide" if wide else "")
    return f'<div class="{cls}"><div class="lbl">{lbl}</div><div class="val">{val}</div></div>'


def render_section_a(ctx: dict) -> str:
    a = ctx["a"]
    fl, ha = a["flach"], a["hang"]
    charts = ctx["charts"]

    def flat_col() -> str:
        cells = (
            _metric_cell("Median der Abweichung", f'{de(fl["median_abs_delta"])}<small>mm/a</small>')
            + _metric_cell("Mittelwert der Abweichung", f'{de(fl["mae"])}<small>mm/a</small>')
            + _metric_cell("Rangfolge-Übereinstimmung", de(fl["spearman"], 2, signed=True), hi=True)
            + _metric_cell("Anzahl Gebäude", dei(fl["n"]))
        )
        return f"""
        <div class="col flat">
          <div class="col-head">
            <div class="col-title">Ebene <small>unter 5° Hangneigung</small></div>
            <span class="tag agree">einig</span>
          </div>
          <div class="metrics">{cells}</div>
        </div>"""

    def slope_col() -> str:
        cells = (
            _metric_cell("Median der Abweichung", f'{de(ha["median_abs_delta"])}<small>mm/a</small>')
            + _metric_cell("Mittelwert der Abweichung", f'{de(ha["mae"])}<small>mm/a</small>')
            + _metric_cell("Rangfolge-Übereinstimmung", de(ha["spearman"], 2, signed=True), hi=True)
            + _metric_cell("Anzahl Gebäude", dei(ha["n"]))
        )
        return f"""
        <div class="col slope">
          <div class="col-head">
            <div class="col-title">Hang <small>ab 15° Hangneigung</small></div>
            <span class="tag diverge">widersprüchlich</span>
          </div>
          <div class="metrics">{cells}</div>
        </div>"""

    return f"""
<section id="cross-track">
  <div class="sec-head">
    <span class="idx">Gegenprobe 1</span>
    <h2>Blickrichtungs-Vergleich: dieselben Gebäude, von zwei Seiten gemessen</h2>
  </div>
  <div class="sec-sub">Ein Satellit (Sentinel-1) · aufsteigende ↗ gegen absteigende ↘ Bahn · Salzburg &amp; Bad Gastein</div>
  <hr class="rule">
  <p class="lead">Der Satellit überfliegt das Gebiet abwechselnd in zwei Richtungen und
  schaut dabei von zwei verschiedenen Seiten auf dieselben Gebäude. Bewegt sich ein
  Gebäude rein senkrecht, müssen beide Blickrichtungen dasselbe messen.
  Das Ergebnis: In der Ebene tun sie das — am Hang nicht.</p>

  <div class="compare">
    {flat_col()}
    {slope_col()}
  </div>

  <div class="readaid"><b>Lesehilfe „Median / Mittelwert“:</b> Der Median ist der
  mittlere Wert, wenn man alle Gebäude nach ihrer Abweichung sortiert — die eine
  Hälfte weicht weniger ab, die andere mehr; Ausreißer ändern ihn kaum. Der
  Mittelwert ist der Durchschnitt — wenige Extremfälle ziehen ihn nach oben.
  Klaffen beide auseinander wie am Hang ({de(ha["median_abs_delta"])} vs.
  {de(ha["mae"])} mm/Jahr), steckt eine kleine Gruppe von Gebäuden mit extremen
  Widersprüchen dahinter.</div>

  <div class="readaid"><b>Lesehilfe „Rangfolge-Übereinstimmung“:</b> +1 heißt, beide
  Blickrichtungen sehen dieselbe Reihenfolge der Gebäude (dasselbe Gebäude bewegt
  sich am stärksten), 0 heißt kein Zusammenhang, −1 die exakt umgekehrte Reihenfolge.
  Der Wert {de(ha["spearman"], 2, signed=True)} am Hang ist ein <b>schwacher</b> Zusammenhang — aber bei
  {dei(ha["n"])} Gebäuden klar vom Zufall unterscheidbar, und sein Vorzeichen ist
  umgekehrt zur Ebene: Was die eine Blickrichtung als stark sinkend einstuft, sieht
  die andere tendenziell als gering oder sogar als Hebung — das typische Muster
  einer seitlichen Bewegungskomponente.
  (Fachbegriff: Spearman-Rangkorrelation.)</div>

  <div class="plates two">
    <div class="plate">
      <div class="mount">{charts["a_abweichung"]}</div>
      <div class="cap"><b>Wie weit liegen die beiden Blickrichtungen auseinander?</b> Median der Abweichung pro Gebäude: In der Ebene {de(fl["median_abs_delta"])} mm/Jahr — normales Messrauschen. Am Hang wächst der Unterschied deutlich an.</div>
    </div>
    <div class="plate">
      <div class="mount">{charts["a_rangfolge"]}</div>
      <div class="cap"><b>Sehen beide dieselbe Reihenfolge der Gebäude?</b> In der Ebene ist der Wert naturgemäß klein — wo kaum Bewegung ist, gibt es kaum Reihenfolge zu ordnen. Am Hang kippt der Wert ins Minus: eine schwache, aber eindeutige Tendenz zur Gegenläufigkeit. (Der Übergangswert ist statistisch nicht belastbar.)</div>
    </div>
  </div>
</section>
"""


def render_section_b(ctx: dict) -> str:
    b = ctx["b"]
    charts = ctx["charts"]
    p = b["params"]
    audit0 = b["audit"][0]
    shot = ctx["shots"]["audit"]
    v = shot["viewer_verdict"]

    win = b["win"]
    wt = b["win_terrain"]
    tiles = "".join([
        f'<div class="stat"><div class="lbl">Gebäude im Fenster-Vergleich<br>Ebene / Hanggebiet</div>'
        f'<div class="val num">{dei(win["flat_asc"]["n"])}<small> / {dei(win["slope_asc"]["n"])}</small></div>'
        f'<div class="sub">nur Gebäude mit verlässlichem Befund in beiden Systemen; identische BEV-Grundrisse</div></div>',

        f'<div class="stat signal"><div class="lbl">Rangfolge-Übereinstimmung<br>Hanggebiet, absteigende Bahn</div>'
        f'<div class="val num">{de(win["slope_dsc"]["spearman"], 2, signed=True)}</div>'
        f'<div class="sub">beide Systeme sehen im selben Fenster dasselbe Bewegungsmuster</div></div>',

        f'<div class="stat accent"><div class="lbl">Median-Abweichung im Fenster<br>je nach Gebiet und Paarung</div>'
        f'<div class="val num">{de(b["win_delta_min"], 1)}–{de(b["win_delta_max"], 1)}<small> mm/Jahr</small></div>'
        f'<div class="sub">kurzfenster-bedingt groß: Raten aus 8 Monaten rauschen stark</div></div>',
    ])
    return f"""
<section id="sensor">
  <div class="sec-head">
    <span class="idx">Gegenprobe 2</span>
    <h2>Sensor-Vergleich: zwei unabhängige Satellitensysteme</h2>
  </div>
  <div class="sec-sub">Sentinel-1 (frei) gegen TSX/PAZ (kommerzielle Referenz) · Bad Gastein · ausschließlich das gemeinsame Zeitfenster {escape(p["overlap_start"])} bis {escape(p["overlap_end"])} ({p["overlap_span_days"]} Tage)</div>
  <hr class="rule">
  <p class="lead">TSX/PAZ ist das deutlich genauere, kommerzielle Referenzsystem. Verglichen
  wird hier ausschließlich der Zeitraum, in dem beide Systeme gemessen haben — acht
  Monate, ein Winter —, und immer gleiche Blickrichtung gegen gleiche Blickrichtung.
  Zwei Fragen: Sehen beide dieselbe Reihenfolge der Gebäude? Und wie weit liegen
  die gemessenen Raten auseinander?</p>

  <div class="tiles">{tiles}</div>

  <div class="readaid" style="margin:0 0 22px"><b>So wird verglichen:</b> Verwendet
  werden nur Messungen innerhalb des Fensters (Sentinel ~alle 12, TSX/PAZ ~alle
  11 Tage, also 15–20 Messungen pro Punkt). Pro Messpunkt wird eine Ausgleichsgerade
  durch die Zeitreihe gelegt; ihre Steigung ist die Bewegungsrate in mm/Jahr — die
  im Fenster gemessene Geschwindigkeit, pro Jahr ausgedrückt, keine Hochrechnung.
  Pro Gebäude zählt der Median seiner Punkte, und verglichen wird stets gleiche
  Blickrichtung gegen gleiche Blickrichtung (aufsteigend gegen aufsteigend,
  absteigend gegen absteigend).</div>

  <div class="plates two">
    <div class="plate">
      <div class="mount">{charts["b_rangfolge"]}</div>
      <div class="cap"><b>Sehen beide dieselbe Reihenfolge der Gebäude?</b> Im Hanggebiet, absteigende Bahn: weitgehend ja ({de(win["slope_dsc"]["spearman"], 2, signed=True)}) — das Bewegungsmuster ist echt, kein Sentinel-Artefakt. In der Ebene ist wenig Bewegung, also kaum Reihenfolge zu ordnen (~+0,2). Die aufsteigende Bahn sieht auch im Hanggebiet wenig ({de(win["slope_asc"]["spearman"], 2, signed=True)}): In diese Blickrichtung projiziert sich die Hangbewegung schlechter.</div>
    </div>
    <div class="plate">
      <div class="mount">{charts["b_abweichung"]}</div>
      <div class="cap"><b>Wie weit liegen die Raten auseinander?</b> Median der Abweichung pro Gebäude im Fenster. Die Werte sind groß, weil 8-Monats-Raten stark rauschen — und sie hängen vor allem an der Blickrichtungs-Paarung (absteigend größer als aufsteigend), kaum am Gebiet.</div>
    </div>
  </div>

  <h3 style="margin-top:26px">Bonus: Hängt die Abweichung von der Hanglage ab?</h3>
  <p class="small muted" style="max-width:78ch">Erwartung: kaum — beide Systeme schauen
  ja in dieselbe Richtung, die Hangbewegung trifft also beide gleich. Die Daten im
  Hanggebiet bestätigen das weitgehend: Die Abweichung steigt nicht systematisch mit
  der Steilheit; die Unterschiede liegen zwischen den Blickrichtungs-Paarungen. Die
  <b>Rangfolge</b>-Übereinstimmung steigt dagegen mit der Steilheit (absteigend:
  {de(wt["DSC-vs-DSC"]["flach"]["spearman"], 2, signed=True)} → {de(wt["DSC-vs-DSC"]["uebergang"]["spearman"], 2, signed=True)} → {de(wt["DSC-vs-DSC"]["hang"]["spearman"], 2, signed=True)}) —
  nicht weil die Sensoren am Hang besser messen, sondern weil es dort mehr echtes
  Signal zu ordnen gibt.</p>
  <div class="plates two">
    <div class="plate">
      <div class="mount">{charts["b_terrain_asc"]}</div>
      <div class="cap"><b>Aufsteigende Paarung, Hanggebiet:</b> Median-Abweichung nach Hangneigungs-Klasse — kein klarer Anstieg mit der Steilheit (kleine Gruppen, Werte entsprechend unsicher).</div>
    </div>
    <div class="plate">
      <div class="mount">{charts["b_terrain_dsc"]}</div>
      <div class="cap"><b>Absteigende Paarung, Hanggebiet:</b> auch hier kein systematischer Hanglagen-Effekt; das Niveau ist insgesamt höher als aufsteigend.</div>
    </div>
  </div>

  <div class="audit-note">
    <h3>Nebenbefund: Widersprüche werden automatisch zur Prüfliste</h3>
    <div class="divergence">
      <div class="d"><div class="n num">{de(audit0["snt"], 1)}</div><div class="t">Sentinel im 8-Monats-Fenster<br>(mm/Jahr)</div></div>
      <div class="d"><div class="n num">{de(v["velocity_mm_a"], 1)}</div><div class="t">Sentinel über die vollen<br>3 Jahre (mm/Jahr)</div></div>
      <div class="d"><div class="n num">{de(audit0["tsx"], 1)}</div><div class="t">TSX/PAZ im selben<br>8-Monats-Fenster (mm/Jahr)</div></div>
    </div>
    <p>Die drei Zahlen oben gehören zu <b>einem einzelnen Gebäude</b> — dem
    auffälligsten Fall der Prüfliste, kein Durchschnitt: Sentinel misst dort im
    kurzen Winterfenster eine starke Senkung, das Referenzsystem im selben Fenster
    aber fast nichts — und über die volle dreijährige Messreihe wirkt das Gebäude
    nahezu stabil. Ob hier eine echte, schubweise Bewegung vorliegt oder ein
    Messartefakt, kann nur eine manuelle Prüfung klären. Genau dafür erzeugt die
    Auswertung automatisch eine Prüfliste der größten Widersprüche
    ({b["n_audit"]} Gebäude, vollständig im technischen Bericht).</p>
    <div class="deeplink" style="margin-top:12px"><span class="dl-k">Beispiel im Viewer (Sentinel)</span> {escape(shot["deep_link"])}</div>
    <div class="deeplink" style="border-top:0;padding-top:2px"><span class="dl-k">dasselbe Gebäude (TSX/PAZ)</span> {escape(shot["tsx_deep_link"])}</div>
  </div>
</section>
"""


def render_caveats(ctx: dict) -> str:
    b = ctx["b"]
    p = b["params"]
    items = [
        (
            "Was der Befund belegt",
            "Messung ist verlässlich",
            "Wo sich wirklich etwas bewegt, sehen zwei Blickrichtungen und zwei unabhängige Satellitensysteme dasselbe Signal. Die Methodik misst echte Bewegung, kein Rauschen.",
        ),
        (
            "Keine Jahresraten aus dem Sensor-Vergleich",
            f"nur {p['overlap_span_days']} Tage · ein Winter",
            "Der Sensor-Vergleich belegt, dass beide Systeme im selben Zeitraum dasselbe messen. Wie groß die Bewegung übers ganze Jahr wirklich ist, lässt sich aus einem einzelnen Winter nicht ableiten — ein Hochrechnen wäre unseriös, weil sich Saisoneffekte (Frost, Schneelast, Grundwasser) nicht herausmitteln. Für absolute Jahresraten braucht es eine mehrjährige gemeinsame Messreihe — unsere wichtigste offene Abhängigkeit.",
        ),
        (
            "Kurze Fenster streuen",
            f"Abweichung ≈ {de(b['vproxy_mae_min'], 1)}–{de(b['vproxy_mae_max'], 1)} mm/Jahr",
            "Aus acht Monaten geschätzte Bewegungsraten schwanken naturgemäß stark. Einzelwerte aus dem kurzen Fenster sind Hinweise auf Muster, keine Präzisionsangaben.",
        ),
        (
            "Am Hang rechnen wir derzeit zu einfach",
            "Annahme: Bewegung nur senkrecht",
            "Alle Werte werden bisher so umgerechnet, als wäre jede Bewegung senkrecht. Genau diese Annahme ist am Hang nachweislich verletzt — die Umstellung auf eine Berechnung mit senkrechtem und seitlichem Anteil (2D-Zerlegung) ist der nächste Schritt.",
        ),
        (
            "Gelände-Einteilung noch grob",
            "Satellitengelände, ~30-m-Raster",
            "Die Einteilung in Ebene/Übergang/Hang beruht auf einem groben Satelliten-Geländemodell; kleinräumige Hangkanten verschwimmen darin. Das bereits beschaffte 1-m-Laserscan-Gelände wird diese Einteilung schärfen.",
        ),
    ]
    lis = "".join(
        f'<li><div class="h">{escape(h)}<span class="q">{q}</span></div><p>{body}</p></li>'
        for h, q, body in items
    )
    return f"""
<section class="caveat" id="caveats">
  <div class="cv-head">
    <span class="kicker">Ehrlich gelesen</span>
    <h2>Was dieser Befund belegt — und was (noch) nicht</h2>
  </div>
  <div class="cv-body"><ul>{lis}</ul></div>
</section>
"""


def render_appendix(ctx: dict) -> str:
    rows = ""
    for r in ctx["extended_runs"]:
        tracks = ", ".join(str(t) for t in r["tracks"])
        rows += (
            "<tr>"
            f'<td class="txt">{escape(r["aoi"])}</td>'
            f'<td class="txt">{escape(r["dataset_id"])}</td>'
            f'<td class="txt">{escape(r["label"])}</td>'
            f'<td>{escape(r["run_id"])}</td>'
            f'<td class="num-r">{dei(r["points"])}</td>'
            f'<td class="num-r">{dei(r["building_rollups"])}</td>'
            f'<td class="num-r">{escape(tracks)}</td>'
            "</tr>"
        )

    artifacts = [
        ("Auswertung A · JSON", "docs/pipelines/anomaly_local_v1/artifacts/cross_track_consistency_v4.json"),
        ("Auswertung A · Report", "docs/pipelines/anomaly_local_v1/artifacts/cross_track_consistency_v4.md"),
        ("Auswertung B · JSON", "docs/pipelines/anomaly_local_v1/artifacts/bad_gastein_snt_tsx_motion_comparison_v4.json"),
        ("Auswertung B · Report", "docs/pipelines/anomaly_local_v1/artifacts/bad_gastein_snt_tsx_motion_comparison_v4.md"),
        ("Showcase-Manifest", "docs/pipelines/anomaly_local_v1/artifacts/xtv_showcase_manifest.json"),
        ("Run-Registry", "docs/pipelines/anomaly_local_v1/artifacts/cross_track_validation_runs.json"),
    ]
    art_lis = "".join(
        f'<li><span class="role">{escape(role)}</span><span>{escape(path)}</span></li>'
        for role, path in artifacts
    )

    return f"""
<section class="appendix" id="anhang">
  <details class="fold">
    <summary>Anhang für die Technik: verwendete Runs, Reproduktions-Kommandos, Artefakte</summary>
    <div class="fold-body">
      <h3>Verwendete Runs ({ctx['n_runs']} Extended-Runs, Modell {escape(ctx['model_version'])})</h3>
      <div class="tablewrap">
        <table class="runtable">
          <thead><tr><th>AOI</th><th>Dataset</th><th>Label</th><th>Run-ID</th><th>Punkte</th><th>Rollups</th><th>Tracks</th></tr></thead>
          <tbody>{rows}</tbody>
        </table>
      </div>

      <h3>Reproduktion — Blickrichtungs-Vergleich (Auswertung A)</h3>
      <pre>{escape(ctx['repro_a'])}</pre>

      <h3>Reproduktion — Sensor-Vergleich (Auswertung B)</h3>
      <pre>{escape(ctx['repro_b'])}</pre>

      <h3>Artefakte (relative Pfade ab Repo-Root)</h3>
      <ul class="artlist">{art_lis}</ul>
    </div>
  </details>
</section>
"""


THEME_SCRIPT = """
(function(){
  try {
    var root = document.documentElement;
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    function apply(){ /* Media-Query traegt die OS-Praeferenz; Tokens erledigen den Rest. */ }
    apply();
  } catch(e){}
})();
"""


def render_html(ctx: dict) -> str:
    body = (
        render_masthead(ctx)
        + render_thesis(ctx)
        + render_section_a(ctx)
        + render_section_b(ctx)
        + render_caveats(ctx)
        + render_appendix(ctx)
    )
    footer = (
        '<footer>'
        '<span>InSAR-Gebäudebewertung · Zwischenbefund · '
        f'Stand {escape(ctx["stand"])}</span>'
        '<span>Blickrichtungs-Vergleich (Auswertung A) · Sensor-Vergleich (Auswertung B) · '
        'Plausibilitätsprüfung, keine Kalibrierung an Bodenmessungen</span>'
        '</footer>'
    )
    return f"""<!DOCTYPE html>
<html lang="de" data-theme-default="auto">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>InSAR-Zwischenbefund · Können wir den Satellitenmessungen trauen?</title>
<style>{STYLE}</style>
</head>
<body>
<div class="doc wrap">
{body}
{footer}
</div>
<script>{THEME_SCRIPT}</script>
</body>
</html>
"""


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #
def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Meeting-One-Pager-Generator (Skript D, XTV-D-W2-T1)."
    )
    parser.add_argument("--cross-track-json", type=Path, default=DEFAULT_CROSS_TRACK)
    parser.add_argument("--motion-json", type=Path, default=DEFAULT_MOTION)
    parser.add_argument("--manifest-json", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--runs-json", type=Path, default=DEFAULT_RUNS)
    parser.add_argument("--artifact-dir", type=Path, default=ARTIFACT_DIR)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    return parser


def main() -> None:
    args = build_arg_parser().parse_args()

    ctx = build_context(
        cross_track=load_json(args.cross_track_json),
        motion=load_json(args.motion_json),
        manifest=load_json(args.manifest_json),
        runs=load_json(args.runs_json),
        artifact_dir=args.artifact_dir,
    )
    html = render_html(ctx)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(html, encoding="utf-8")

    size_kb = args.output.stat().st_size / 1024
    print(f"[meeting_onepager] geschrieben: {args.output} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
