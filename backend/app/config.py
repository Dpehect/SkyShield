from pydantic import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "SkyShield"
    DEBUG: bool = False
    DATABASE_URL: str | None = None
    ENABLE_RF: bool = False
    CONFIRM_LEGAL: bool = False

    class Config:
        env_file = ".env"

settings = Settings()
