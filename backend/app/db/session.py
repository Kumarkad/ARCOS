import asyncio
from typing import AsyncGenerator

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.config import get_settings
from app.core.logging import logger
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


def _run_alembic_sync(tables_created: bool) -> None:
    """Run alembic upgrade or stamp head synchronously."""
    import os
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    ini_path = os.path.join(base_dir, "alembic.ini")
    if not os.path.exists(ini_path):
        logger.warning(f"alembic.ini not found at {ini_path}, skipping Alembic sync.")
        return
    alembic_cfg = Config(ini_path)
    alembic_cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

    try:
        if tables_created:
            logger.info("Tables were created via Base.metadata.create_all; stamping Alembic head...")
            command.stamp(alembic_cfg, "head")
        else:
            logger.info("Checking and running pending Alembic migrations...")
            command.upgrade(alembic_cfg, "head")
    except Exception as e:
        logger.warning(f"Alembic sync encountered an issue: {e}. Attempting stamp head as fallback...")
        try:
            command.stamp(alembic_cfg, "head")
        except Exception as stamp_err:
            logger.error(f"Failed to stamp Alembic head: {stamp_err}")


async def init_db() -> None:
    """Ensure all database tables exist and Alembic state is up to date."""
    tables_created = False
    async with engine.begin() as conn:
        def check_and_create(sync_conn):
            inspector = inspect(sync_conn)
            table_names = inspector.get_table_names()
            if "users" not in table_names:
                logger.warning("'users' table missing. Creating all database tables via Base.metadata.create_all...")
                Base.metadata.create_all(sync_conn)
                return True
            return False

        tables_created = await conn.run_sync(check_and_create)

    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _run_alembic_sync, tables_created)
