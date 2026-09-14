import asyncio
from typing import AsyncGenerator

from alembic import command
from alembic.config import Config
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.config import get_settings
from app.db.base import Base
import app.models  # noqa: F401 - Register all models with Base.metadata

settings = get_settings()

engine = create_async_engine(settings.DATABASE_URL, echo=False)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


def _run_alembic_upgrade() -> None:
    """Run alembic upgrade head synchronously (called from a thread pool)."""
    import os
    # Walk up from this file to find alembic.ini (sits at backend/)
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    alembic_cfg = Config(os.path.join(base_dir, "alembic.ini"))
    alembic_cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
    command.upgrade(alembic_cfg, "head")


async def init_db() -> None:
    """Run Alembic migrations to bring the DB to the latest schema."""
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _run_alembic_upgrade)
