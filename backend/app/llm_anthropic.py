"""Fournisseur Anthropic (Claude), utilisé si ANTHROPIC_API_KEY est renseignée à la place d'OpenAI."""

import logging

import anthropic

from .assistant import RESPONSE_SCHEMA, AssistantRefused, AssistantUnavailable
from .models import ChatTurn

logger = logging.getLogger(__name__)


class AnthropicBackend:
    def __init__(self, client: anthropic.AsyncAnthropic, model: str, effort: str) -> None:
        self._client = client
        self._model = model
        self._effort = effort

    async def complete(self, instructions: str, user_context: str, history: list[ChatTurn]) -> str | None:
        try:
            response = await self._client.beta.messages.create(
                model=self._model,
                max_tokens=16000,
                # Instructions fixes d'abord (préfixe stable), contexte utilisateur ensuite.
                system=[{"type": "text", "text": instructions}, {"type": "text", "text": user_context}],
                messages=[{"role": turn.role, "content": turn.content} for turn in history],
                output_config={
                    "effort": self._effort,
                    "format": {"type": "json_schema", "schema": RESPONSE_SCHEMA},
                },
                cache_control={"type": "ephemeral"},
                # En cas de refus par les classifieurs de sécurité, Anthropic relance sur le modèle recommandé.
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
            )
        except anthropic.RateLimitError as error:
            logger.warning("Claude rate limit: %s", error.message)
            raise AssistantUnavailable("rate_limit") from error
        except anthropic.APIStatusError as error:
            logger.error("Claude API error %s: %s", error.status_code, error.message)
            raise AssistantUnavailable("api_error") from error
        except anthropic.APIConnectionError as error:
            logger.error("Claude connection error: %s", error)
            raise AssistantUnavailable("connection") from error

        if response.stop_reason == "refusal":
            raise AssistantRefused()

        return next((block.text for block in response.content if block.type == "text"), None)

    async def complete_json(self, instructions: str, content: str, schema: dict, name: str) -> str | None:
        """Requête unique (sans historique) dont la sortie respecte `schema`. Utilisé par les outils M&A."""
        try:
            response = await self._client.beta.messages.create(
                model=self._model,
                max_tokens=16000,
                system=[{"type": "text", "text": instructions}],
                messages=[{"role": "user", "content": content}],
                output_config={"effort": self._effort, "format": {"type": "json_schema", "schema": schema}},
                cache_control={"type": "ephemeral"},
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
            )
        except anthropic.RateLimitError as error:
            logger.warning("Claude rate limit: %s", error.message)
            raise AssistantUnavailable("rate_limit") from error
        except anthropic.APIStatusError as error:
            logger.error("Claude API error %s: %s", error.status_code, error.message)
            raise AssistantUnavailable("api_error") from error
        except anthropic.APIConnectionError as error:
            logger.error("Claude connection error: %s", error)
            raise AssistantUnavailable("connection") from error

        if response.stop_reason == "refusal":
            raise AssistantRefused()

        return next((block.text for block in response.content if block.type == "text"), None)
