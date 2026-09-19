import logging
import logging.config
import uuid
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.api.api import api_router
from app.core.config import settings
from app.core.errors import setup_exception_handlers


# ---------------------------------------------------------------------------
# Logging setup — configure before app creation so all loggers inherit it
# ---------------------------------------------------------------------------

def _configure_logging() -> None:
    """Configure structured logging for the application."""
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    logging.config.dictConfig({
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "standard": {
                "format": "[%(asctime)s] %(levelname)-8s %(name)s — %(message)s",
                "datefmt": "%Y-%m-%dT%H:%M:%S",
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout",
                "formatter": "standard",
            },
        },
        "root": {
            "level": log_level,
            "handlers": ["console"],
        },
        "loggers": {
            "architect_x": {
                "level": log_level,
                "handlers": ["console"],
                "propagate": False,
            },
            "uvicorn": {"level": "INFO"},
            "uvicorn.error": {"level": "INFO"},
            "uvicorn.access": {"level": "WARNING"},  # Reduce access log noise
        },
    })


_configure_logging()

logger = logging.getLogger("architect_x")

# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description=(
        "Evidence-Grounded Multi-Agent Software Architecture Review API. "
        "Analyzes system requirements through specialized AI agents, detects architectural conflicts, "
        "retrieves technical literature evidence, and synthesizes MADR-compliant Architecture Decision Records."
    ),
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# ---------------------------------------------------------------------------
# CORS middleware — restrict origins in production
# ---------------------------------------------------------------------------

_cors_origins = (
    settings.CORS_ORIGINS
    if isinstance(settings.CORS_ORIGINS, list)
    else [settings.CORS_ORIGINS]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Request ID middleware — attach a unique request ID for tracing
# ---------------------------------------------------------------------------

@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """Inject a unique X-Request-ID into every request for correlation."""
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response

# ---------------------------------------------------------------------------
# Exception handlers
# ---------------------------------------------------------------------------

setup_exception_handlers(app)

# ---------------------------------------------------------------------------
# API router
# ---------------------------------------------------------------------------

app.include_router(api_router, prefix=settings.API_V1_STR)

# ---------------------------------------------------------------------------
# Startup / shutdown events
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def on_startup() -> None:
    """Log startup banner with configuration summary."""
    logger.info(
        f"Starting {settings.PROJECT_NAME} v{settings.PROJECT_VERSION} | "
        f"env={settings.ENVIRONMENT} | "
        f"mock_mode={settings.LLM_MOCK_MODE} | "
        f"log_level={settings.LOG_LEVEL}"
    )
    if settings.is_production and settings.LLM_MOCK_MODE:
        logger.warning("Running in production with LLM_MOCK_MODE=True — AI outputs are mocked.")


@app.on_event("shutdown")
async def on_shutdown() -> None:
    logger.info(f"Shutting down {settings.PROJECT_NAME}.")

# ---------------------------------------------------------------------------
# Root redirect
# ---------------------------------------------------------------------------

@app.get("/", include_in_schema=False)
def root_redirect():
    """Root status summary pointing to API documentation."""
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
        "environment": settings.ENVIRONMENT,
        "status": "online",
        "docs_url": f"{settings.API_V1_STR}/docs",
        "health_url": f"{settings.API_V1_STR}/health",
    }
