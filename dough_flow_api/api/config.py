from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://doughflow:doughflow_dev@localhost:5432/doughflow"
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # LLM category classification (Ollama or any OpenAI-compatible endpoint)
    llm_enabled: bool = False
    llm_base_url: str = "http://ollama:11434/v1"
    llm_model: str = "qwen3.5:0.8b"
    llm_api_key: str = "ollama"  # Ollama ignores this but openai client requires a non-empty value

    model_config = SettingsConfigDict(env_file=str(ENV_FILE), extra="ignore")


settings = Settings()
