from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import connect_db, disconnect_db
from .routers import api, tiles

logger = logging.getLogger(__name__)

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api.router)
app.include_router(tiles.router)


@app.on_event("startup")
async def on_startup() -> None:
    tiles_dir = settings.tiles_dir
    logger.warning("Tiles dir: %s", tiles_dir)
    for name in ("insar_t44", "insar_t95", "gba", "osm"):
        path = tiles_dir / f"{name}.mbtiles"
        logger.warning("Tiles file %s exists=%s", path, path.exists())
    await connect_db(app)


@app.on_event("shutdown")
async def on_shutdown() -> None:
    await disconnect_db(app)
