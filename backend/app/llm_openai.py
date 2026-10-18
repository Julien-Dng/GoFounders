"""Fournisseur OpenAI (Responses API, sortie JSON stricte)."""

import logging

import openai

from .assistant import RESPONSE_SCHEMA, AssistantRefused, AssistantUnavailable
from .models import ChatTurn

logger = logging.getLogger(__name__)


class OpenAIBackend:
    def __init__(self, client: openai.AsyncOpenAI, model: str) -> None:
        self._client = client
        self._model = model

    async def complete(self, instructions: str, user_context: str, history: list[ChatTurn]) -> str | None:
        try:
            response = await self._client.responses.create(
                model=self._model,
                instructions=f"{instructions}\n\n{user_context}",
                input=[{"role": turn.role, "content": turn.content} for turn in history],
                text={
                    "format": {
                        "type": "json_schema",
                        "name": "reponse_assistant",
                        "schema": RESPONSE_SCHEMA,
                        "strict": True,
                    }
                },
                max_output_tokens=4000,
                # Les échanges ne sont pas conservés côté OpenAI au-delà de la requête.
                store=False,
            )
        except openai.RateLimitError as error:
            logger.warning("OpenAI rate limit: %s", error.message)
            raise AssistantUnavailable("rate_limit") from error
        except openai.APIStatusError as error:
            logger.error("OpenAI API error %s: %s", error.status_code, error.message)
            raise AssistantUnavailable("api_error") from error
        except openai.APIConnectionError as error:
            logger.error("OpenAI connection error: %s", error)
            raise AssistantUnavailable("connection") from error

        for item in response.output:
            if item.type == "message" and any(part.type == "refusal" for part in item.content):
                raise AssistantRefused()

        if response.status != "completed":
            logger.warning("Réponse OpenAI incomplète : %s", response.incomplete_details)
            return None

        return response.output_text or None

    async def complete_json(self, instructions: str, content: str, schema: dict, name: str) -> str | None:
        """Requête unique (sans historique) dont la sortie respecte `schema`. Utilisé par les outils M&A."""
        try:
            response = await self._client.responses.create(
                model=self._model,
                instructions=instructions,
                input=[{"role": "user", "content": content}],
                text={"format": {"type": "json_schema", "name": name, "schema": schema, "strict": True}},
                max_output_tokens=6000,
                store=False,
            )
        except openai.RateLimitError as error:
            logger.warning("OpenAI rate limit: %s", error.message)
            raise AssistantUnavailable("rate_limit") from error
        except openai.APIStatusError as error:
            logger.error("OpenAI API error %s: %s", error.status_code, error.message)
            raise AssistantUnavailable("api_error") from error
        except openai.APIConnectionError as error:
            logger.error("OpenAI connection error: %s", error)
            raise AssistantUnavailable("connection") from error

        for item in response.output:
            if item.type == "message" and any(part.type == "refusal" for part in item.content):
                raise AssistantRefused()

        if response.status != "completed":
            logger.warning("Réponse OpenAI incomplète : %s", response.incomplete_details)
            return None

        return response.output_text or None
