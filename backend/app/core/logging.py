import logging
import os
import sys
import time
from logging.handlers import RotatingFileHandler
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

# Default logger name for ARCOS
LOGGER_NAME = "arcos"

class ColoredConsoleFormatter(logging.Formatter):
    """Clean console formatter with ANSI colors for terminal visibility."""

    COLORS = {
        logging.DEBUG: "\033[36m",     # Cyan
        logging.INFO: "\033[32m",      # Green
        logging.WARNING: "\033[33m",   # Yellow
        logging.ERROR: "\033[31m",     # Red
        logging.CRITICAL: "\033[1;31m",# Bold Red
    }
    RESET = "\033[0m"

    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelno, self.RESET)
        record.levelname_colored = f"{color}{record.levelname:<8}{self.RESET}"
        return super().format(record)


def setup_logging(
    log_level: str = "INFO",
    log_file: str | None = "logs/arcos.log",
    max_bytes: int = 10 * 1024 * 1024,  # 10 MB
    backup_count: int = 5,
) -> logging.Logger:
    """
    Configures and returns the central logger for ARCOS backend.
    Logs to both standard output and a rotating log file.
    """
    level = getattr(logging, log_level.upper(), logging.INFO)
    logger = logging.getLogger(LOGGER_NAME)
    logger.setLevel(level)

    # Avoid duplicate handlers on reloads
    if logger.handlers:
        return logger

    # 1. Console Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_format = "%(asctime)s | %(levelname_colored)s | %(name)s:%(lineno)d - %(message)s"
    console_formatter = ColoredConsoleFormatter(console_format, datefmt="%Y-%m-%d %H:%M:%S")
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)

    # 2. Rotating File Handler
    if log_file:
        try:
            log_dir = os.path.dirname(log_file)
            if log_dir:
                os.makedirs(log_dir, exist_ok=True)

            file_handler = RotatingFileHandler(
                log_file,
                maxBytes=max_bytes,
                backupCount=backup_count,
                encoding="utf-8",
            )
            file_handler.setLevel(level)
            file_format = "%(asctime)s | %(levelname)-8s | %(name)s:%(lineno)d - %(message)s"
            file_formatter = logging.Formatter(file_format, datefmt="%Y-%m-%d %H:%M:%S")
            file_handler.setFormatter(file_formatter)
            logger.addHandler(file_handler)
        except Exception as e:
            logger.warning(f"Could not initialize file logging to {log_file}: {e}")

    # Set external libraries to appropriate log levels to prevent noise
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

    return logger


def get_logger(name: str | None = None) -> logging.Logger:
    """Returns a logger namespaced under 'arcos'."""
    if name:
        return logging.getLogger(f"{LOGGER_NAME}.{name}")
    return logging.getLogger(LOGGER_NAME)


logger = get_logger()


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that logs every incoming HTTP request and its processing time.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.perf_counter()
        client_ip = request.client.host if request.client else "unknown"
        method = request.method
        path = request.url.path

        try:
            response = await call_next(request)
            duration_ms = (time.perf_counter() - start_time) * 1000
            status_code = response.status_code

            # Log level based on status code
            log_msg = f"{client_ip} - \"{method} {path}\" {status_code} ({duration_ms:.1f}ms)"
            if status_code >= 500:
                logger.error(log_msg)
            elif status_code >= 400:
                logger.warning(log_msg)
            else:
                logger.info(log_msg)

            return response
        except Exception as exc:
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.exception(f"{client_ip} - \"{method} {path}\" FAILED after {duration_ms:.1f}ms: {exc}")
            raise exc
