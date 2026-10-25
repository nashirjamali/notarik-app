from pathlib import Path

from pydantic import ConfigDict
from pydantic_settings import BaseSettings

ROOT_ENV = Path(__file__).resolve().parents[4] / ".env"


class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    jwt_audience: str = "authenticated"
    openrouter_api_key: str = ""
    openrouter_model: str = "google/gemini-2.5-flash"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    receipt_max_bytes: int = 5_000_000
    chat_requests_per_minute: int = 30
    daily_token_budget: int = 100_000
    model_config = ConfigDict(env_file=ROOT_ENV, extra="ignore")


class MigrationSettings(BaseSettings):
    migration_database_url: str
    model_config = ConfigDict(env_file=ROOT_ENV, extra="ignore")


class TestSettings(BaseSettings):
    test_database_url: str
    app_user_password: str
    model_config = ConfigDict(env_file=ROOT_ENV, extra="ignore")
