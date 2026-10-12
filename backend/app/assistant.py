"""Assistant contextuel : construit le prompt, appelle le fournisseur d'IA et nettoie la réponse."""

import json
import logging
from typing import Protocol

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
    """Erreur côté fournisseur d'IA, à présenter comme une indisponibilité temporaire."""


class AssistantRefused(Exception):
    """Le modèle a refusé de répondre (filtres de sécurité du fournisseur)."""


class LlmBackend(Protocol):
    async def complete(self, instructions: str, user_context: str, history: list[ChatTurn]) -> str | None:
        """Renvoie le JSON conforme à RESPONSE_SCHEMA, None si la sortie est inexploitable."""
        ...


class Assistant:
    def __init__(self, backend: LlmBackend) -> None:
        self._backend = backend

    async def reply(self, context: UserContext, history: list[ChatTurn]) -> ChatResponse:
        try:
            text = await self._backend.complete(INSTRUCTIONS, build_user_context(context), history)
        except AssistantRefused:
            return ChatResponse(reply=REFUSAL_REPLY)

        if text is None:
            return ChatResponse(reply=FALLBACK_REPLY)

        try:
            parsed = ChatResponse.model_validate(json.loads(text))
        except (json.JSONDecodeError, ValueError):
            logger.warning("Réponse du modèle non exploitable")
            return ChatResponse(reply=FALLBACK_REPLY)

        forbidden = ROLE_FORBIDDEN_ACTIONS[context.role]
        actions = list(dict.fromkeys(action for action in parsed.actions if action not in forbidden))[:3]
        return ChatResponse(reply=parsed.reply, actions=actions)
