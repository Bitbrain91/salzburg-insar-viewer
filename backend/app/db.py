from __future__ import annotations

import asyncpg
from fastapi import FastAPI

from .config import settings


async def connect_db(app: FastAPI) -> None:
    app.state.db_pool = await asyncpg.create_pool(dsn=settings.db_dsn, min_size=1, max_size=10)


async def disconnect_db(app: FastAPI) -> None:
    pool = getattr(app.state, "db_pool", None)
    if pool:
        await pool.close()


async def fetch_one(app: FastAPI, query: str, *args):
    async with app.state.db_pool.acquire() as conn:
        return await conn.fetchrow(query, *args)


async def fetch_all(app: FastAPI, query: str, *args):
    async with app.state.db_pool.acquire() as conn:
        return await conn.fetch(query, *args)


async def execute(app: FastAPI, query: str, *args) -> str:
    async with app.state.db_pool.acquire() as conn:
        return await conn.execute(query, *args)


async def executemany(app: FastAPI, query: str, args_list) -> None:
    async with app.state.db_pool.acquire() as conn:
        await conn.executemany(query, args_list)
