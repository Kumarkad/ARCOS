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
from app.db.session import init_db
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

app.add_exception_handler(AppException, app_exception_handler)

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



@app.get("/health")
async def health_check():
    return {"status": "healthy"}
