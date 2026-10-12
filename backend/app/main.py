"""API GoFounders : assistant IA contextuel (/coaching-ia), avec OpenAI ou Claude.

Lancement local : uvicorn app.main:app --reload --port 8000
"""

import time
from collections import defaultdict, deque
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Annotated

import anthropic
import httpx
import openai
from fastapi import Depends, FastAPI, Header, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware

from .assistant import Assistant, AssistantUnavailable, LlmBackend
from .config import Settings, get_settings
from .llm_anthropic import AnthropicBackend
from .llm_openai import OpenAIBackend
from .models import ChatRequest, ChatResponse, ContextItem, ContextResponse, UserContext
from .supabase import SupabaseClient, SupabaseError

PAID_PLANS = {"PRO", "PREMIUM"}
HISTORY_LIMIT = 20


def build_backend(settings: Settings) -> LlmBackend:
    if settings.ai_provider == "openai":
        return OpenAIBackend(openai.AsyncOpenAI(api_key=settings.openai_api_key), settings.openai_model)
    return AnthropicBackend(
        anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key), settings.claude_model, settings.claude_effort
    )


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=10.0) as http:
        app.state.supabase = SupabaseClient(settings.supabase_url, settings.supabase_service_role_key, http)
        app.state.assistant = Assistant(build_backend(settings))
        app.state.request_log = defaultdict(deque)
        yield


app = FastAPI(title="GoFounders API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


def get_supabase(request: Request) -> SupabaseClient:
    return request.app.state.supabase


def get_assistant(request: Request) -> Assistant:
    return request.app.state.assistant


async def get_current_context(
    supabase: Annotated[SupabaseClient, Depends(get_supabase)],
    authorization: Annotated[str | None, Header()] = None,
) -> tuple[str, UserContext]:
    """Utilisateur Supabase connecté, abonné PRO ou PREMIUM (vérifié ici, pas seulement côté Angular)."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Connexion requise")

    user_id = await supabase.get_user_id(authorization[7:])
    if user_id is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session invalide ou expirée")

    try:
        context = await supabase.load_user_context(user_id)
    except SupabaseError as error:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Données du profil indisponibles") from error

    if context is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Profil introuvable")
    if context.plan not in PAID_PLANS:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "L'assistant IA est réservé aux plans PRO et PREMIUM")
    return user_id, context


CurrentContext = Annotated[tuple[str, UserContext], Depends(get_current_context)]


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/coaching-ia/contexte", response_model=ContextResponse)
async def coaching_context(current: CurrentContext) -> ContextResponse:
    """Ce que l'assistant sait de l'utilisateur, affiché dans le panneau de gauche."""
    _, context = current
    profile = [
        ContextItem(label="Rôle", value=context.role_label),
        ContextItem(label="Plan", value=context.plan),
        ContextItem(label="Localisation", value=context.location or "Non renseignée"),
        ContextItem(label="Profil complété", value=f"{context.profile_complete} %"),
    ]
    pool_label = {
        "entrepreneur": "Talents inscrits",
        "talent": "Projets actifs",
        "buyer": "Annonces M&A actives",
        "seller": "Annonces M&A actives",
    }[context.role]
    activity = [
        ContextItem(label="Conversations", value=str(context.conversation_count)),
        ContextItem(label="Nouvelles cette semaine", value=str(context.new_conversations_this_week)),
        ContextItem(label=pool_label, value=str(context.marketplace_pool)),
    ]
    if context.role == "seller":
        activity.append(ContextItem(label="Mes annonces", value=str(context.own_listings)))

    questions = ["Que dois-je compléter en priorité dans mon profil ?"]
    if context.role in ("entrepreneur", "talent"):
        questions += [
            "Comment rédiger un premier message qui obtient une réponse ?",
            "Quels profils devrais-je contacter en priorité ?",
        ]
    elif context.role == "buyer":
        questions += ["Comment évaluer une annonce M&A avant de contacter le vendeur ?"]
    else:
        questions += ["Comment rendre mon annonce de cession plus attractive ?"]
    return ContextResponse(profile=profile, activity=activity, suggested_questions=questions)


@app.post("/api/coaching-ia/messages", response_model=ChatResponse)
async def coaching_message(
    payload: ChatRequest,
    current: CurrentContext,
    request: Request,
    assistant: Annotated[Assistant, Depends(get_assistant)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> ChatResponse:
    user_id, context = current

    # Fenêtre glissante d'une heure, en mémoire (un seul processus) : limite le coût par utilisateur.
    now = time.monotonic()
    log: deque[float] = request.app.state.request_log[user_id]
    while log and now - log[0] > 3600:
        log.popleft()
    if len(log) >= settings.max_requests_per_hour:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Trop de questions en peu de temps, réessayez plus tard")
    log.append(now)

    history = payload.messages[-HISTORY_LIMIT:]
    if history[0].role != "user":
        history = history[1:]

    try:
        return await assistant.reply(context, history)
    except AssistantUnavailable as error:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Assistant momentanément indisponible") from error
