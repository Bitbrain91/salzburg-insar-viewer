from __future__ import annotations

import hashlib
from typing import Dict, List, Set, Tuple

PALETTE_SIZE = 60
NEIGHBOR_DISTANCE_M = 5.0


def _hash_index(key: str, palette_size: int) -> int:
    digest = hashlib.sha1(key.encode("utf-8")).hexdigest()
    return int(digest[:8], 16) % palette_size


async def assign_building_colors(pool, run_id: str) -> int:
    async with pool.acquire() as conn:
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS ml_building_colors (
                run_id UUID NOT NULL,
                area_id TEXT NOT NULL,
                building_source TEXT NOT NULL,
                building_id TEXT NOT NULL,
                color_index INTEGER NOT NULL,
                PRIMARY KEY (run_id, area_id, building_source, building_id)
            )
            """
        )
        await conn.execute(
            """
            ALTER TABLE ml_building_colors
                ADD COLUMN IF NOT EXISTS area_id TEXT
            """
        )
        await conn.execute(
            """
            UPDATE ml_building_colors
            SET area_id = 'salzburg'
            WHERE area_id IS NULL
            """
        )
        await conn.execute(
            """
            ALTER TABLE ml_building_colors
                ALTER COLUMN area_id SET NOT NULL,
                ALTER COLUMN area_id DROP DEFAULT
            """
        )
        await conn.execute(
            """
            CREATE INDEX IF NOT EXISTS ml_building_colors_run_idx
            ON ml_building_colors (run_id)
            """
        )
        await conn.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS ml_building_colors_area_key
            ON ml_building_colors (run_id, area_id, building_source, building_id)
            """
        )

        buildings = await conn.fetch(
            """
            WITH assigned AS (
                SELECT DISTINCT area_id, building_source, building_id
                FROM ml_point_results
                WHERE run_id = $1 AND building_id IS NOT NULL
            ),
            gba AS (
                SELECT b.area_id, 'gba'::text AS building_source, b.gba_id::text AS building_id, b.geom
                FROM gba_buildings b
                JOIN assigned a
                  ON a.area_id = b.area_id
                 AND a.building_source = 'gba'
                 AND a.building_id = b.gba_id::text
            ),
            osm AS (
                SELECT b.area_id, 'osm'::text AS building_source, b.osm_id::text AS building_id, b.geom
                FROM osm_buildings b
                JOIN assigned a
                  ON a.area_id = b.area_id
                 AND a.building_source = 'osm'
                 AND a.building_id = b.osm_id::text
            ),
            all_buildings AS (
                SELECT * FROM gba
                UNION ALL
                SELECT * FROM osm
            )
            SELECT area_id, building_source, building_id
            FROM all_buildings
            """,
            run_id,
        )

        if not buildings:
            return 0

        neighbors = await conn.fetch(
            """
            WITH assigned AS (
                SELECT DISTINCT area_id, building_source, building_id
                FROM ml_point_results
                WHERE run_id = $1 AND building_id IS NOT NULL
            ),
            gba AS (
                SELECT b.area_id, 'gba'::text AS building_source, b.gba_id::text AS building_id, b.geom
                FROM gba_buildings b
                JOIN assigned a
                  ON a.area_id = b.area_id
                 AND a.building_source = 'gba'
                 AND a.building_id = b.gba_id::text
            ),
            osm AS (
                SELECT b.area_id, 'osm'::text AS building_source, b.osm_id::text AS building_id, b.geom
                FROM osm_buildings b
                JOIN assigned a
                  ON a.area_id = b.area_id
                 AND a.building_source = 'osm'
                 AND a.building_id = b.osm_id::text
            ),
            all_buildings AS (
                SELECT * FROM gba
                UNION ALL
                SELECT * FROM osm
            )
            SELECT a.building_source AS a_source,
                   a.building_id AS a_id,
                   a.area_id AS a_area_id,
                   b.building_source AS b_source,
                   b.building_id AS b_id,
                   b.area_id AS b_area_id
            FROM all_buildings a
            JOIN all_buildings b
              ON (a.area_id, a.building_source, a.building_id) < (b.area_id, b.building_source, b.building_id)
             AND ST_DWithin(a.geom::geography, b.geom::geography, $2)
            """,
            run_id,
            NEIGHBOR_DISTANCE_M,
        )

    keys: List[Tuple[str, str, str]] = [
        (row["area_id"], row["building_source"], row["building_id"]) for row in buildings
    ]

    adjacency: Dict[Tuple[str, str, str], Set[Tuple[str, str, str]]] = {
        key: set() for key in keys
    }
    for row in neighbors:
        a = (row["a_area_id"], row["a_source"], row["a_id"])
        b = (row["b_area_id"], row["b_source"], row["b_id"])
        adjacency.setdefault(a, set()).add(b)
        adjacency.setdefault(b, set()).add(a)

    keys.sort(key=lambda k: (len(adjacency.get(k, set())), k), reverse=True)

    colors: Dict[Tuple[str, str, str], int] = {}
    for key in keys:
        used = {colors[n] for n in adjacency.get(key, set()) if n in colors}
        start = _hash_index(f"{key[0]}:{key[1]}:{key[2]}", PALETTE_SIZE)
        chosen = None
        for offset in range(PALETTE_SIZE):
            c = (start + offset) % PALETTE_SIZE
            if c not in used:
                chosen = c
                break
        if chosen is None:
            chosen = start
        colors[key] = chosen

    records = [
        (run_id, area_id, source, building_id, colors[(area_id, source, building_id)])
        for area_id, source, building_id in keys
    ]

    async with pool.acquire() as conn:
        await conn.executemany(
            """
            INSERT INTO ml_building_colors (run_id, area_id, building_source, building_id, color_index)
            VALUES ($1,$2,$3,$4,$5)
            ON CONFLICT (run_id, area_id, building_source, building_id)
            DO UPDATE SET color_index = EXCLUDED.color_index
            """,
            records,
        )

    return len(records)
