import logging
import os
from pathlib import Path

from fastapi import APIRouter
from sqlalchemy import text

from app.db.session import engine
from app.schemas.project import HealthResponse
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger("architect_x.health")


def _check_database() -> dict:
    """Attempt a lightweight DB connectivity check."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception as exc:
        logger.warning(f"Health check: database connectivity failed — {exc}")
        return {"status": "unavailable", "error": str(exc)[:200]}


def _check_vector_store() -> dict:
    """Check whether the ChromaDB persistence directory or in-memory index is accessible."""
    try:
        chroma_dir = os.getenv("CHROMA_PERSIST_DIRECTORY", "chroma_db")
        chroma_path = Path(chroma_dir)
        if chroma_path.exists():
            return {"status": "ok", "backend": "persistent", "path": str(chroma_path.resolve())}
        else:
            return {"status": "ok", "backend": "in-memory", "note": "Chroma directory not found; using in-memory fallback"}
    except Exception as exc:
        return {"status": "unavailable", "error": str(exc)[:200]}


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health Check",
    description=(
        "Check the operational status of the ARCHITECT-X API service, "
        "including database connectivity and vector store availability."
    ),
)
def health_check() -> HealthResponse:
    """Return detailed service health status including dependency checks."""
    db_check = _check_database()
    vector_check = _check_vector_store()

    overall_status = "ok"
    if db_check.get("status") != "ok":
        overall_status = "degraded"

    checks = {
        "api": {"status": "ok"},
        "database": db_check,
        "vector_store": vector_check,
        "llm_mock_mode": settings.LLM_MOCK_MODE,
    }

    logger.debug(f"Health check completed: status={overall_status}")

    return HealthResponse(
        status=overall_status,
        service="architect-x",
        version=settings.PROJECT_VERSION,
        environment=settings.ENVIRONMENT,
        checks=checks,
    )
