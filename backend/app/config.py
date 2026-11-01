from functools import lru_cache
from typing import Literal

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # backend/.env puis ../.env (racine du projet) ; les variables d'environnement priment.
    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")

    supabase_url: str
    supabase_service_role_key: str
    allowed_origins: str = "http://localhost:4200"

    # Fournisseur d'IA : OpenAI si une clé OpenAI est présente, sinon Claude (Anthropic).
    openai_api_key: str | None = Field(default=None, validation_alias=AliasChoices("OPENAI_API_KEY", "openAIkey"))
    openai_model: str = "gpt-6.1-sol"
    anthropic_api_key: str | None = None
    claude_model: str = "claude-opus-5-5"
    claude_effort: Literal["low", "medium", "high", "xhigh", "max"] = "medium"

    # Garde-fou de coût par utilisateur (fenêtre glissante d'une heure).
    max_requests_per_hour: int = 30

    # Paiements Stripe (facultatif : sans clé, les routes de paiement répondent 503).
    stripe_secret_key: str | None = None
    stripe_webhook_secret: str | None = None
    # E-mails métier (facultatif : sans clé, la file email_outbox reste en attente, rien n'est envoyé).
    resend_api_key: str | None = None
    resend_from: str = "GoFounders <notifications@example.com>"
    email_poll_seconds: int = 60

    # Adresse publique du site Angular, pour les retours de Stripe Checkout et du portail.
    site_url: str = "http://localhost:4200"

    @property
    def origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @property
    def ai_provider(self) -> Literal["openai", "anthropic"]:
        if self.openai_api_key:
            return "openai"
        if self.anthropic_api_key:
            return "anthropic"
        raise ValueError("Aucune clé d'IA : renseignez openAIkey (ou OPENAI_API_KEY) ou ANTHROPIC_API_KEY dans .env")


@lru_cache
def get_settings() -> Settings:
    return Settings()
