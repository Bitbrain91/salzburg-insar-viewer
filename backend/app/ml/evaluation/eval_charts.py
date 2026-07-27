"""Matplotlib-Chart-Helfer fuer die Evaluationsskripte (PNG + SVG).

Erzeugt konsistente, farbfehlsichtsichere Diagramme fuer
`cross_track_consistency.py` und `bad_gastein_motion_compare.py`. Jede Funktion
schreibt `<stem>.png` (150 dpi) und `<stem>.svg` und gibt die Liste der
geschriebenen Pfade zurueck.

Designvorgaben (dataviz-Skill): feste Kategorienreihenfolge und -farben, duenne
Marken, zurueckhaltendes Gitter/Achsen, Legende bei >=2 Serien, deutsche
Achsen-/Legendenbeschriftung, direkte Wertelabels statt Titel-Clutter.

Die Terrain-Klassenfarben stammen aus der validierten dataviz-Kategorien-Palette
(Light-Surface `#fcfcfb`) und wurden mit `scripts/validate_palette.js` geprueft:
schlechtestes benachbartes CVD-Delta-E 37.7 (Light), 25.0 (Dark) - weit ueber der
Zielschwelle 12. Gelb ("uebergang") liegt unter 3:1 Kontrast, wird aber durch die
direkten Wertelabels bzw. die Legende (Relief-Regel) abgesichert. "unbekannt"
nutzt bewusst ein neutrales Grau (Restklasse, kein echtes Kategoriensignal).
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from pathlib import Path

import matplotlib

matplotlib.use("Agg")  # headless, deterministische Datei-Ausgabe; VOR pyplot-Import

import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

from .terrain_classes import (  # noqa: E402
    SLOPE_FLAT_MAX_DEG,
    SLOPE_TRANSITION_MAX_DEG,
    TERRAIN_CLASS_ORDER,
)

# Feste Klassen-Farbzuordnung (validierte dataviz-Kategorien-Palette, Light).
TERRAIN_CLASS_COLORS: dict[str, str] = {
    "flach": "#2a78d6",      # blau
    "uebergang": "#eda100",  # gelb
    "hang": "#e34948",       # rot
    "unbekannt": "#898781",  # neutrales Grau (Restklasse)
}

# Deutsche Legenden-/Achsenbeschriftung inkl. Schwellen (Schwellen einzige Quelle:
# terrain_classes.py). Klartextnamen statt Code-Kuerzel.
_CLASS_LABELS: dict[str, str] = {
    "flach": f"Flach (<{SLOPE_FLAT_MAX_DEG:g}°)",
    "uebergang": f"Übergang ({SLOPE_FLAT_MAX_DEG:g}–{SLOPE_TRANSITION_MAX_DEG:g}°)",
    "hang": f"Hang (≥{SLOPE_TRANSITION_MAX_DEG:g}°)",
    "unbekannt": "Unbekannt",
}

# Chart-Chrome/Ink aus der dataviz-Referenzpalette (Light).
_DPI = 150
_SURFACE = "#fcfcfb"
_INK_PRIMARY = "#0b0b0b"
_INK_SECONDARY = "#52514e"
_INK_MUTED = "#898781"
_GRID = "#e1e0d9"
_AXIS = "#c3c2b7"
_BAND_FILL = "#898781"

plt.rcParams.update({
    "font.family": "sans-serif",
    "font.sans-serif": ["DejaVu Sans", "Segoe UI", "Arial", "sans-serif"],
    "svg.fonttype": "none",
    "figure.facecolor": _SURFACE,
    "axes.facecolor": _SURFACE,
    "savefig.facecolor": _SURFACE,
    "text.color": _INK_PRIMARY,
    "axes.labelcolor": _INK_SECONDARY,
    "axes.edgecolor": _AXIS,
    "xtick.color": _INK_MUTED,
    "ytick.color": _INK_MUTED,
    "xtick.labelcolor": _INK_SECONDARY,
    "ytick.labelcolor": _INK_SECONDARY,
    "grid.color": _GRID,
    "grid.linewidth": 0.6,
})


def _style_axes(ax: plt.Axes) -> None:
    """Zurueckhaltende Achsen: keine Deckel-Spines, Gitter hinter den Marken."""
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    for side in ("left", "bottom"):
        ax.spines[side].set_linewidth(0.8)
    ax.set_axisbelow(True)
    ax.tick_params(length=0)


def _class_color(cls: str) -> str:
    return TERRAIN_CLASS_COLORS.get(cls, _INK_MUTED)


def _class_label(cls: str) -> str:
    return _CLASS_LABELS.get(cls, cls)


def _ordered_present(present: Sequence[str]) -> list[str]:
    """Klassen in fester Reihenfolge; unbekannte Labels haengen hinten an."""
    seen = set(present)
    ordered = [c for c in TERRAIN_CLASS_ORDER if c in seen]
    extra = [c for c in dict.fromkeys(present) if c not in TERRAIN_CLASS_ORDER]
    return ordered + extra


def _save(fig: plt.Figure, stem: str | Path) -> list[Path]:
    """Schreibt <stem>.png und <stem>.svg, schliesst die Figur, liefert Pfade."""
    stem_path = Path(stem)
    stem_path.parent.mkdir(parents=True, exist_ok=True)
    fig.tight_layout()
    written: list[Path] = []
    for ext in ("png", "svg"):
        path = stem_path.parent / f"{stem_path.name}.{ext}"
        fig.savefig(path, dpi=_DPI)
        written.append(path)
    plt.close(fig)
    return written


def _label_bars(ax: plt.Axes, bars, values: Sequence[float], value_format: str) -> None:
    for rect, val in zip(bars, values):
        if val is None or not np.isfinite(val):
            continue
        va = "bottom" if val >= 0 else "top"
        dy = 3 if val >= 0 else -3
        ax.annotate(
            value_format.format(val),
            xy=(rect.get_x() + rect.get_width() / 2.0, rect.get_height()),
            xytext=(0, dy),
            textcoords="offset points",
            ha="center",
            va=va,
            fontsize=8,
            color=_INK_SECONDARY,
        )


def scatter_pair(
    x: Sequence[float],
    y: Sequence[float],
    classes: Sequence[str],
    *,
    xlabel: str,
    ylabel: str,
    deadband: float,
    stem: str | Path,
    tolerance_band: float | None = None,
) -> list[Path]:
    """Streudiagramm zweier Serien, Punkte nach Terrain-Klasse gefaerbt.

    Identitaetslinie gestrichelt; optional ein aeusseres Toleranzband und ein
    inneres Totband (jeweils +/- um die Identitaetslinie schattiert). Beide Achsen
    teilen sich symmetrische, quadratische Limits ueber beide Serien (aspect
    equal), sodass die Identitaetslinie die echte Diagonale ist.
    """
    x_arr = np.asarray(list(x), dtype=float)
    y_arr = np.asarray(list(y), dtype=float)
    class_list = list(classes)

    fig, ax = plt.subplots(figsize=(5.2, 5.2))
    _style_axes(ax)

    finite = np.concatenate([x_arr[np.isfinite(x_arr)], y_arr[np.isfinite(y_arr)]])
    if finite.size:
        lo, hi = float(finite.min()), float(finite.max())
    else:
        lo, hi = -1.0, 1.0
    if lo == hi:
        lo, hi = lo - 1.0, hi + 1.0
    pad = 0.05 * (hi - lo)
    lo, hi = lo - pad, hi + pad
    ax.set_xlim(lo, hi)
    ax.set_ylim(lo, hi)
    ax.set_aspect("equal", adjustable="box")

    diag = np.array([lo, hi])
    if tolerance_band:
        ax.fill_between(
            diag, diag - tolerance_band, diag + tolerance_band,
            color=_BAND_FILL, alpha=0.14, linewidth=0,
            label=f"Toleranz ±{tolerance_band:g}",
        )
    if deadband:
        ax.fill_between(
            diag, diag - deadband, diag + deadband,
            color=_BAND_FILL, alpha=0.28, linewidth=0,
            label=f"Totband ±{deadband:g}",
        )
    ax.plot(diag, diag, linestyle="--", linewidth=1.2, color=_INK_MUTED, label="Identität")

    for cls in _ordered_present(class_list):
        idx = [i for i, c in enumerate(class_list) if c == cls]
        if not idx:
            continue
        ax.scatter(
            x_arr[idx], y_arr[idx],
            s=30, c=_class_color(cls),
            edgecolors=_SURFACE, linewidths=0.5,
            label=_class_label(cls), zorder=3,
        )

    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    ax.legend(frameon=False, fontsize=8, loc="best")
    return _save(fig, stem)


def bar_by_class(
    metric_by_class: Mapping[str, float] | Mapping[str, Mapping[str, float]],
    *,
    ylabel: str,
    stem: str | Path,
    value_format: str = "{:.0%}",
) -> list[Path]:
    """Balken je Terrain-Klasse in fester Reihenfolge, mit Wertelabels.

    `metric_by_class` ist entweder `{klasse: wert}` (einfache Balken) oder
    `{gruppe: {klasse: wert}}` (gruppierte Balken je Gruppe).
    """
    is_grouped = bool(metric_by_class) and all(
        isinstance(v, Mapping) for v in metric_by_class.values()
    )

    fig, ax = plt.subplots(figsize=(6.6, 4.2))
    _style_axes(ax)
    ax.grid(axis="y")
    ax.grid(axis="x", visible=False)

    if is_grouped:
        groups = list(metric_by_class.keys())
        present = [c for g in groups for c in metric_by_class[g]]
        classes = _ordered_present(present)
        total_width = 0.8
        bar_w = total_width / max(len(classes), 1)
        base = np.arange(len(groups), dtype=float)
        for j, cls in enumerate(classes):
            offsets = base - total_width / 2.0 + bar_w * (j + 0.5)
            vals = [float(metric_by_class[g].get(cls, np.nan)) for g in groups]
            bars = ax.bar(
                offsets, vals, width=bar_w * 0.88,
                color=_class_color(cls), label=_class_label(cls),
            )
            _label_bars(ax, bars, vals, value_format)
        ax.set_xticks(base)
        ax.set_xticklabels([str(g) for g in groups])
        ax.legend(frameon=False, fontsize=8)
    else:
        classes = _ordered_present(list(metric_by_class.keys()))
        vals = [float(metric_by_class[c]) for c in classes]
        colors = [_class_color(c) for c in classes]
        xs = np.arange(len(classes), dtype=float)
        bars = ax.bar(xs, vals, width=0.62, color=colors)
        _label_bars(ax, bars, vals, value_format)
        ax.set_xticks(xs)
        ax.set_xticklabels([_class_label(c) for c in classes])

    ax.axhline(0.0, color=_AXIS, linewidth=0.8)
    ax.set_ylabel(ylabel)
    return _save(fig, stem)


def box_by_class(
    values_by_class: Mapping[str, Sequence[float]],
    *,
    ylabel: str,
    stem: str | Path,
) -> list[Path]:
    """Boxplots je Terrain-Klasse in fester Reihenfolge und Farbe."""
    prepared: list[tuple[str, np.ndarray]] = []
    for cls in _ordered_present(list(values_by_class.keys())):
        arr = np.asarray(list(values_by_class[cls]), dtype=float)
        arr = arr[np.isfinite(arr)]
        if arr.size:
            prepared.append((cls, arr))

    fig, ax = plt.subplots(figsize=(6.6, 4.2))
    _style_axes(ax)
    ax.grid(axis="y")
    ax.grid(axis="x", visible=False)

    if prepared:
        classes = [c for c, _ in prepared]
        data = [a for _, a in prepared]
        positions = np.arange(len(classes), dtype=float)
        bp = ax.boxplot(
            data, positions=positions, widths=0.55, patch_artist=True,
            medianprops=dict(color=_INK_PRIMARY, linewidth=1.4),
            whiskerprops=dict(color=_AXIS, linewidth=1.0),
            capprops=dict(color=_AXIS, linewidth=1.0),
            flierprops=dict(
                marker="o", markersize=3, markerfacecolor=_INK_MUTED,
                markeredgecolor="none", alpha=0.5,
            ),
        )
        for patch, cls in zip(bp["boxes"], classes):
            patch.set_facecolor(_class_color(cls))
            patch.set_alpha(0.75)
            patch.set_edgecolor(_SURFACE)
            patch.set_linewidth(1.0)
        ax.set_xticks(positions)
        ax.set_xticklabels([_class_label(c) for c in classes])
    else:
        ax.set_xticks([])

    ax.set_ylabel(ylabel)
    return _save(fig, stem)
