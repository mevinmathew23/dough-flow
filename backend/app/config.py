from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://doughflow:doughflow_dev@localhost:5432/doughflow"
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
