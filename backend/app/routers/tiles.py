from __future__ import annotations

import os
import sqlite3
from functools import lru_cache
from pathlib import Path
from typing import Optional, Tuple

from fastapi import APIRouter, HTTPException, Request, Response

from ..config import settings

router = APIRouter(tags=["tiles"])


def _parse_range(range_header: str, file_size: int) -> Optional[Tuple[int, int]]:
    if not range_header or "=" not in range_header:
        return None
    units, _, range_spec = range_header.partition("=")
    if units.strip().lower() != "bytes":
        return None

    start_str, _, end_str = range_spec.partition("-")
    try:
        if start_str:
            start = int(start_str)
            end = int(end_str) if end_str else file_size - 1
        else:
            # suffix length
            suffix_len = int(end_str)
            start = max(0, file_size - suffix_len)
            end = file_size - 1
    except ValueError:
        return None

    if start < 0 or end < start:
        return None
    end = min(end, file_size - 1)
    return start, end


@router.get("/pmtiles/{name}")
async def pmtiles_file(name: str, request: Request) -> Response:
    tiles_dir = settings.tiles_dir
    path = tiles_dir / name

    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="PMTiles not found")

    file_size = os.path.getsize(path)
    range_header = request.headers.get("range")
    byte_range = _parse_range(range_header, file_size)

    headers = {
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=86400",
    }

    if byte_range is None:
        data = path.read_bytes()
        return Response(content=data, media_type="application/octet-stream", headers=headers)

    start, end = byte_range
    length = end - start + 1
    with path.open("rb") as f:
        f.seek(start)
        data = f.read(length)

    headers.update({
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Content-Length": str(length),
    })

    return Response(
        content=data,
        status_code=206,
        media_type="application/octet-stream",
        headers=headers,
    )


@lru_cache(maxsize=8)
def _open_mbtiles(path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(path, check_same_thread=False)
    return conn


def _tms_y(z: int, y: int) -> int:
    return (1 << z) - 1 - y


@router.get("/mbtiles/{name}/{z}/{x}/{y}.pbf")
async def mbtiles_tile(name: str, z: int, x: int, y: int) -> Response:
    tiles_dir = settings.tiles_dir
    path = tiles_dir / f"{name}.mbtiles"

    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="MBTiles not found")

    conn = _open_mbtiles(str(path))
    tms_y = _tms_y(z, y)
    cur = conn.execute(
        "SELECT tile_data FROM tiles WHERE zoom_level=? AND tile_column=? AND tile_row=?",
        (z, x, tms_y),
    )
    row = cur.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Tile not found")

    data = row[0]
    headers = {
        "Content-Type": "application/x-protobuf",
        "Content-Encoding": "gzip",
        "Cache-Control": "public, max-age=86400",
    }
    return Response(content=data, headers=headers)
