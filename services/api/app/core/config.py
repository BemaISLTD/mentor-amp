from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Mentor AMP"
    app_env: str = "development"
    database_url: str
    api_host: str = "127.0.0.1"
    api_port: int = 8000

    model_config = SettingsConfigDict(
        env_file="../../.env",
        env_file_encoding="utf-8",
    )


settings = Settings()
