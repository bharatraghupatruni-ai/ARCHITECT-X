import json
import logging
import sys
from typing import List, Union
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "ARCHITECT-X"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    # -------------------------------------------------------------------
    # Environment
    # -------------------------------------------------------------------
    ENVIRONMENT: str = "development"  # "development" | "staging" | "production"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    # -------------------------------------------------------------------
    # Database
    # -------------------------------------------------------------------
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/architect_x"

    # -------------------------------------------------------------------
    # CORS
    # -------------------------------------------------------------------
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["http://localhost:3000", "http://127.0.0.1:3000"]

    # -------------------------------------------------------------------
    # LLM & Requirement Engine
    # -------------------------------------------------------------------
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "gpt-4o-mini"
    LLM_BASE_URL: Union[str, None] = None
    LLM_MOCK_MODE: bool = True

    # -------------------------------------------------------------------
    # Observability
    # -------------------------------------------------------------------
    LOG_LEVEL: str = "INFO"   # DEBUG | INFO | WARNING | ERROR

    # -------------------------------------------------------------------
    # Production safety checks
    # -------------------------------------------------------------------
    @model_validator(mode="after")
    def warn_production_defaults(self) -> "Settings":
        if self.is_production:
            if self.LLM_MOCK_MODE:
                logging.getLogger("architect_x.config").warning(
                    "LLM_MOCK_MODE=True in production environment. "
                    "Set LLM_MOCK_MODE=False and configure LLM_API_KEY."
                )
            if not self.LLM_API_KEY:
                logging.getLogger("architect_x.config").warning(
                    "LLM_API_KEY is not set. Real AI analysis will not be available."
                )
            if self.DATABASE_URL.startswith("sqlite"):
                logging.getLogger("architect_x.config").warning(
                    "SQLite DATABASE_URL detected in production. "
                    "Use PostgreSQL for production deployments."
                )
        return self

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
