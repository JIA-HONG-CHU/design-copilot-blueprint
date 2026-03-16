"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # --- API ---
    app_name: str = "Design Copilot Backend"
    debug: bool = False
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:8080", "http://localhost:8081"]

    # --- Supabase ---
    supabase_url: str = ""
    supabase_service_key: str = ""  # service-role key (server-side only)
    jwt_secret: str = ""  # Supabase JWT secret (Settings > API > JWT Secret)

    # --- LLM ---
    anthropic_api_key: str = ""
    default_model: str = "claude-sonnet-4-6"
    fast_model: str = "claude-haiku-4-5"

    # --- Web Search (optional — enables evidence grounding) ---
    tavily_api_key: str = ""  # set to enable web search for evidence grounding

    # --- TRIZ Knowledge Base ---
    triz_kb_path: str = "../rd_assistant_design_system/triz_knowledge_base"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
