from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    """Konfigurasi aplikasi dari environment variables."""

    # App
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    APP_DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/email_spam_db"

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173"

    # Model paths
    MODEL_DIR: str = "./saved_models"
    INDOBERT_MODEL: str = "indobenchmark/indobert-base-p1"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Singleton settings instance."""
    return Settings()
