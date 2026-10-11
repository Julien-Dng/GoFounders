"""Appel à Claude pour l'assistant contextuel."""

import json
import logging

import anthropic

from .models import ACTIONS, ChatResponse, ChatTurn, UserContext
from .prompt import INSTRUCTIONS, build_user_context

logger = logging.getLogger(__name__)

# Réponse structurée : le texte de l'assistant et les actions rapides à afficher.
RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "reply": {"type": "string"},
        "actions": {"type": "array", "items": {"type": "string", "enum": list(ACTIONS)}},
    },
    "required": ["reply", "actions"],
    "additionalProperties": False,
}

REFUSAL_REPLY = (
    "Je ne peux pas répondre à cette demande. "
    "Posez-moi une question sur votre profil, vos contacts ou votre utilisation de GoFounders."
)
FALLBACK_REPLY = "Je n'ai pas pu formuler de réponse. Pouvez-vous reformuler votre question ?"

# Actions qui n'ont pas de sens selon le rôle (routes réservées).
ROLE_FORBIDDEN_ACTIONS = {
    "entrepreneur": {"deposer_annonce"},
    "talent": {"deposer_annonce"},
    "buyer": {"voir_recherche", "deposer_annonce"},
    "seller": {"voir_recherche"},
}


class AssistantUnavailable(Exception):
    """Erreur côté API Claude, à présenter comme une indisponibilité temporaire."""


class Assistant:
    def __init__(self, client: anthropic.AsyncAnthropic, model: str, effort: str) -> None:
        self._client = client
        self._model = model
        self._effort = effort

    async def reply(self, context: UserContext, history: list[ChatTurn]) -> ChatResponse:
        try:
            response = await self._client.beta.messages.create(
                model=self._model,
                max_tokens=16000,
                # Instructions fixes d'abord (préfixe stable), contexte utilisateur ensuite.
                system=[
                    {"type": "text", "text": INSTRUCTIONS},
                    {"type": "text", "text": build_user_context(context)},
                ],
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
            return ChatResponse(reply=REFUSAL_REPLY)

        text = next((block.text for block in response.content if block.type == "text"), None)
        if text is None:
            return ChatResponse(reply=FALLBACK_REPLY)

        try:
            parsed = ChatResponse.model_validate(json.loads(text))
        except (json.JSONDecodeError, ValueError):
            # Sortie tronquée (max_tokens) ou invalide.
            logger.warning("Réponse Claude non exploitable (stop_reason=%s)", response.stop_reason)
            return ChatResponse(reply=FALLBACK_REPLY)

        forbidden = ROLE_FORBIDDEN_ACTIONS[context.role]
        actions = list(dict.fromkeys(action for action in parsed.actions if action not in forbidden))[:3]
        return ChatResponse(reply=parsed.reply, actions=actions)
