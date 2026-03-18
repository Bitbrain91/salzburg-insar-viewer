from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .db import connect_db, disconnect_db
from .ml.schema import ensure_ml_schema
from .ml.store import fail_incomplete_runs
from .routers import api, tiles, ml

logger = logging.getLogger(__name__)

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount(
    "/raster",
    StaticFiles(directory=settings.raster_tiles_dir, check_dir=False),
    name="raster",
)

app.include_router(api.router)
app.include_router(tiles.router)
app.include_router(ml.router)


@app.on_event("startup")
async def on_startup() -> None:
    tiles_dir = settings.tiles_dir
    raster_tiles_dir = settings.raster_tiles_dir
    logger.warning("Tiles dir: %s", tiles_dir)
    logger.warning("Raster tiles dir: %s", raster_tiles_dir)
    for name in ("insar_t44", "insar_t95", "gba", "osm"):
        path = tiles_dir / f"{name}.mbtiles"
        logger.warning("Tiles file %s exists=%s", path, path.exists())
    for name in ("relief_hillshade", "relief_slope"):
        path = raster_tiles_dir / name
        logger.warning("Raster tile directory %s exists=%s", path, path.exists())
    for route in app.router.routes:
        if hasattr(route, "path") and "ml" in route.path:
            logger.warning("ML route registered: %s", route.path)
    await connect_db(app)
    async with app.state.db_pool.acquire() as conn:
        await ensure_ml_schema(conn)
        stale_runs = await fail_incomplete_runs(conn)
    for run in stale_runs:
        logger.warning(
            "Marked stale ML run as failed on startup: run_id=%s pipeline=%s mlflow_run_id=%s",
            run["run_id"],
            run["pipeline"],
            run["mlflow_run_id"],
        )


@app.on_event("shutdown")
async def on_shutdown() -> None:
    await disconnect_db(app)
