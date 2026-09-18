from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.core.exceptions import AppException, app_exception_handler
from app.api.auth import router as auth_router
from app.api.categories import router as categories_router
from app.api.expenses import router as expenses_router
from app.api.income import router as income_router
from app.api.recurring import router as recurring_router
from app.api.budgets import router as budgets_router
from app.api.analytics import router as analytics_router
from app.api.chat import router as chat_router
from app.api.investments import router as investments_router
from app.api.bikes import router as bikes_router
from app.api.goals import router as goals_router
from app.api.export import router as export_router


settings = get_settings()

from contextlib import asynccontextmanager
from sqlalchemy import text
from app.db.session import init_db, engine
from app.core.logging import setup_logging, RequestLoggingMiddleware, logger

# Initialize central logger
setup_logging(log_level=settings.LOG_LEVEL, log_file=settings.LOG_FILE_PATH)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME} in [{settings.ENVIRONMENT}] mode...")
    await init_db()
    logger.info("Database initialized successfully.")
    yield
    logger.info(f"Shutting down {settings.APP_NAME}...")

app = FastAPI(
    title=settings.APP_NAME,
    description="ARCOS — Your Personal Financial Intelligence System",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi import Request

app.add_exception_handler(AppException, app_exception_handler)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        field = str(err["loc"][-1]) if err["loc"] else "field"
        msg = err["msg"]
        if "at least" in msg:
            msg = msg.replace("String should have at least", f"Password must have at least")
        errors.append(f"{field.capitalize()}: {msg}")
    error_msg = "; ".join(errors) if errors else "Validation failed"
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": error_msg,
                "details": exc.errors()
            }
        }
    )

app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(categories_router, prefix=settings.API_V1_PREFIX)
app.include_router(expenses_router, prefix=settings.API_V1_PREFIX)
app.include_router(income_router, prefix=settings.API_V1_PREFIX)
app.include_router(recurring_router, prefix=settings.API_V1_PREFIX)
app.include_router(budgets_router, prefix=settings.API_V1_PREFIX)
app.include_router(analytics_router, prefix=settings.API_V1_PREFIX)
app.include_router(chat_router, prefix=settings.API_V1_PREFIX)
app.include_router(investments_router, prefix=settings.API_V1_PREFIX)
app.include_router(bikes_router, prefix=settings.API_V1_PREFIX)
app.include_router(goals_router, prefix=settings.API_V1_PREFIX)
app.include_router(export_router, prefix=settings.API_V1_PREFIX)



@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "tagline": "Your Personal Financial Intelligence System",
        "status": "online",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/health/db")
async def db_health_check():
    tables = []
    error_detail = None
    try:
        async with engine.connect() as conn:
            try:
                res = await conn.execute(
                    text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;")
                )
                tables = [row[0] for row in res.fetchall()]
            except Exception:
                res = await conn.execute(
                    text("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
                )
                tables = [row[0] for row in res.fetchall()]
    except Exception as e:
        error_detail = str(e)

    return {
        "status": "connected" if error_detail is None else "error",
        "tables_count": len(tables),
        "tables": tables,
        "has_users_table": "users" in tables,
        "error": error_detail,
    }
