from pathlib import Path

from pydantic import ConfigDict
from pydantic_settings import BaseSettings

ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    database_url: str
    model_config = ConfigDict(env_file=ROOT_ENV, extra="ignore")


class MigrationSettings(BaseSettings):
    migration_database_url: str
    model_config = ConfigDict(env_file=ROOT_ENV, extra="ignore")


class TestSettings(BaseSettings):
    test_database_url: str
    app_user_password: str
    model_config = ConfigDict(env_file=ROOT_ENV, extra="ignore")
