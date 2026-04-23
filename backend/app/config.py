from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = BASE_DIR / "backend"
load_dotenv(BACKEND_DIR / ".env")


def _default_service_host() -> str:
    # Local development uses Docker-published ports on the host.
    return "127.0.0.1"


def _resolve_host(env_value: str | None, fallback: str) -> str:
    if not env_value or env_value.strip().lower() == "auto":
        return fallback
    return env_value


def _resolve_dir(value: str | None, default: Path) -> Path:
    if not value:
        return default.resolve()
    path = Path(value)
    if not path.is_absolute():
        path = (BACKEND_DIR / path).resolve()
    return path


@dataclass(frozen=True)
class Settings:
    app_name: str = "Salzburg InSAR Viewer API"
    env: str = os.getenv("APP_ENV", "dev")

    db_host: str = _resolve_host(os.getenv("POSTGRES_HOST"), _default_service_host())
    db_port: int = int(os.getenv("POSTGRES_PORT", "5432"))
    db_name: str = os.getenv("POSTGRES_DB", "insar")
    db_user: str = os.getenv("POSTGRES_USER", "insar")
    db_password: str = os.getenv("POSTGRES_PASSWORD", "insar")

    tiles_dir: Path = _resolve_dir(
        os.getenv("PMTILES_DIR"),
        BASE_DIR / "data" / "tiles_v2",
    )
    raster_tiles_dir: Path = _resolve_dir(
        os.getenv("RASTER_TILES_DIR"),
        BASE_DIR / "data" / "raster_tiles",
    )

    mlflow_tracking_uri: str = (
        os.getenv("MLFLOW_TRACKING_URI")
        if os.getenv("MLFLOW_TRACKING_URI")
        and os.getenv("MLFLOW_TRACKING_URI", "").strip().lower() != "auto"
        else f"http://{_default_service_host()}:5001"
    )
    mlflow_experiment: str = os.getenv("MLFLOW_EXPERIMENT", "insar_anomaly_local_v1")

    @property
    def db_dsn(self) -> str:
        return (
            f"postgresql://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )


settings = Settings()
