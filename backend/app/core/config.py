from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    CORS_ORIGINS: list[str]
    ENVIRONMENT: str = "development"
    APP_NAME: str = "ARCOS API"
    API_V1_PREFIX: str = "/api/v1"

    # Optional AI Providers (Groq / Gemini)
    GROQ_API_KEY: str | None = None
    GEMINI_API_KEY: str | None = None

    # Logging Configuration
    LOG_LEVEL: str = "INFO"
    LOG_FILE_PATH: str | None = "logs/arcos.log"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

@lru_cache
def get_settings() -> Settings:
    return Settings()
