from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = BASE_DIR / "backend"
load_dotenv(BACKEND_DIR / ".env")


def _is_wsl() -> bool:
    try:
        return "microsoft" in Path("/proc/version").read_text().lower()
    except Exception:
        return False


def _wsl_gateway_ip() -> str | None:
    try:
        for line in Path("/etc/resolv.conf").read_text().splitlines():
            if line.startswith("nameserver"):
                parts = line.split()
                if len(parts) >= 2:
                    return parts[1]
    except Exception:
        return None
    return None


def _default_docker_host() -> str:
    if _is_wsl():
        return _wsl_gateway_ip() or "host.docker.internal"
    return "host.docker.internal"


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

    db_host: str = _resolve_host(os.getenv("POSTGRES_HOST"), _default_docker_host())
    db_port: int = int(os.getenv("POSTGRES_PORT", "5432"))
    db_name: str = os.getenv("POSTGRES_DB", "insar")
    db_user: str = os.getenv("POSTGRES_USER", "insar")
    db_password: str = os.getenv("POSTGRES_PASSWORD", "insar")

    tiles_dir: Path = _resolve_dir(
        os.getenv("PMTILES_DIR"),
        BASE_DIR / "data" / "tiles_v2",
    )

    mlflow_tracking_uri: str = (
        os.getenv("MLFLOW_TRACKING_URI")
        if os.getenv("MLFLOW_TRACKING_URI")
        and os.getenv("MLFLOW_TRACKING_URI", "").strip().lower() != "auto"
        else f"http://{_default_docker_host()}:5001"
    )
    mlflow_experiment: str = os.getenv("MLFLOW_EXPERIMENT", "insar_assignment")

    @property
    def db_dsn(self) -> str:
        return (
            f"postgresql://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )


settings = Settings()
