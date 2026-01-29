from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = BASE_DIR / "backend"
load_dotenv(BACKEND_DIR / ".env")


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

    db_host: str = os.getenv("POSTGRES_HOST", "localhost")
    db_port: int = int(os.getenv("POSTGRES_PORT", "5432"))
    db_name: str = os.getenv("POSTGRES_DB", "insar")
    db_user: str = os.getenv("POSTGRES_USER", "insar")
    db_password: str = os.getenv("POSTGRES_PASSWORD", "insar")

    tiles_dir: Path = _resolve_dir(
        os.getenv("PMTILES_DIR"),
        BASE_DIR / "data" / "tiles_v2",
    )

    mlflow_tracking_uri: str = os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5001")
    mlflow_experiment: str = os.getenv("MLFLOW_EXPERIMENT", "insar_assignment")

    @property
    def db_dsn(self) -> str:
        return (
            f"postgresql://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )


settings = Settings()
