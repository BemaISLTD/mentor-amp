from fastapi import FastAPI
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings
from app.db.session import engine

app = FastAPI(
    title="Mentor AMP API",
    version="0.1.0",
)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "app": settings.app_name,
        "version": "0.1.0",
    }


@app.get("/system/status")
def system_status():
    database_status = "not_connected"

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
            database_status = "connected"
    except SQLAlchemyError:
        database_status = "not_connected"

    return {
        "api": {
            "status": "ok",
            "version": "0.1.0",
        },
        "app": {
            "name": settings.app_name,
            "environment": settings.app_env,
        },
        "database": {
            "status": database_status,
        },
    }
