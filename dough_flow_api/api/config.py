from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://doughflow:doughflow_dev@localhost:5432/doughflow"
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    model_config = SettingsConfigDict(env_file=str(ENV_FILE), extra="ignore")


settings = Settings()
