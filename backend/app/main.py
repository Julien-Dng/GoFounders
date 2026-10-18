"""API GoFounders : assistant IA contextuel (/coaching-ia), avec OpenAI ou Claude.

Lancement local : uvicorn app.main:app --reload --port 8000
"""

import logging
import time
from collections import defaultdict, deque
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Annotated
from uuid import UUID

import anthropic
import httpx
import openai
from fastapi import Depends, FastAPI, Header, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware

from .assistant import Assistant, AssistantUnavailable, LlmBackend
from .config import Settings, get_settings
from .llm_anthropic import AnthropicBackend
from .llm_openai import OpenAIBackend
from .ma_ai import DraftRequest, ListingAnalysis, ListingDraft, MaAi, MaAiUnusable
from .models import ChatRequest, ChatResponse, ContextItem, ContextResponse, UserContext
from .supabase import SupabaseClient, SupabaseError

logger = logging.getLogger(__name__)

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
        backend = build_backend(settings)
        app.state.assistant = Assistant(backend)
        app.state.ma_ai = MaAi(backend)
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


def get_ma_ai(request: Request) -> MaAi:
    return request.app.state.ma_ai


async def get_user_id(
    supabase: Annotated[SupabaseClient, Depends(get_supabase)],
    authorization: Annotated[str | None, Header()] = None,
) -> str:
    """Utilisateur Supabase connecté (sans condition de plan)."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Connexion requise")

    user_id = await supabase.get_user_id(authorization[7:])
    if user_id is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session invalide ou expirée")
    return user_id


def enforce_rate_limit(request: Request, key: str, limit: int) -> None:
    """Fenêtre glissante d'une heure, en mémoire (un seul processus) : limite le coût par utilisateur."""
    now = time.monotonic()
    log: deque[float] = request.app.state.request_log[key]
    while log and now - log[0] > 3600:
        log.popleft()
    if len(log) >= limit:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Trop de demandes en peu de temps, réessayez plus tard")
    log.append(now)


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
        logger.error("Contexte utilisateur illisible : %s", error)
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

    enforce_rate_limit(request, user_id, settings.max_requests_per_hour)

    history = payload.messages[-HISTORY_LIMIT:]
    if history[0].role != "user":
        history = history[1:]

    try:
        return await assistant.reply(context, history)
    except AssistantUnavailable as error:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Assistant momentanément indisponible") from error


# --- Outils IA de la marketplace M&A (refonte « reprise ») -------------------------------------------

MA_AI_REQUESTS_PER_HOUR = 10
# Analyses de dossier par mois avec l'accès repreneur 149 € ; illimitées avec l'accès Plus.
FREE_ANALYSES_PER_MONTH = 3


@app.post("/api/ma/brouillon-annonce", response_model=ListingDraft)
async def ma_listing_draft(
    payload: DraftRequest,
    request: Request,
    user_id: Annotated[str, Depends(get_user_id)],
    supabase: Annotated[SupabaseClient, Depends(get_supabase)],
    ma_ai: Annotated[MaAi, Depends(get_ma_ai)],
) -> ListingDraft:
    """Vendeur : teaser, description anonymisée, champs du formulaire et détails identifiants."""
    try:
        role = await supabase.get_role(user_id)
    except SupabaseError as error:
        logger.error("Rôle illisible : %s", error)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Données du profil indisponibles") from error
    if role != "seller":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "La préparation d'annonce est réservée aux comptes vendeur")

    enforce_rate_limit(request, f"ma-draft:{user_id}", MA_AI_REQUESTS_PER_HOUR)
    try:
        return await ma_ai.draft_listing(payload.description)
    except MaAiUnusable as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Je n'ai pas pu préparer l'annonce. Reformulez votre description.") from error
    except AssistantUnavailable as error:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Service IA momentanément indisponible") from error


@app.post("/api/ma/annonces/{listing_id}/analyse", response_model=ListingAnalysis)
async def ma_listing_analysis(
    listing_id: UUID,
    request: Request,
    user_id: Annotated[str, Depends(get_user_id)],
    supabase: Annotated[SupabaseClient, Depends(get_supabase)],
    ma_ai: Annotated[MaAi, Depends(get_ma_ai)],
) -> ListingAnalysis:
    """Acheteur avec un accès repreneur en cours : analyse du dossier d'une annonce active."""
    try:
        role = await supabase.get_role(user_id)
        has_access = role == "buyer" and await supabase.has_active_ma_access(user_id)
    except SupabaseError as error:
        logger.error("Accès M&A illisible : %s", error)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Données du profil indisponibles") from error
    if not has_access:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "L'analyse de dossier est réservée aux repreneurs avec un accès en cours")

    try:
        listing = await supabase.load_listing_for_analysis(str(listing_id))
    except SupabaseError as error:
        logger.error("Annonce illisible : %s", error)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Annonce indisponible") from error
    if listing is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Annonce introuvable")

    enforce_rate_limit(request, f"ma-analysis:{user_id}", MA_AI_REQUESTS_PER_HOUR)
    try:
        allowed = await supabase.consume_ai_analysis(user_id, FREE_ANALYSES_PER_MONTH)
    except SupabaseError as error:
        logger.error("Quota d'analyses illisible : %s", error)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Données du profil indisponibles") from error
    if not allowed:
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            f"Vous avez utilisé vos {FREE_ANALYSES_PER_MONTH} analyses du mois. Passez à l'accès Plus pour des analyses illimitées.",
        )

    try:
        return await ma_ai.analyse_listing(listing)
    except MaAiUnusable as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Je n'ai pas pu analyser ce dossier. Réessayez plus tard.") from error
    except AssistantUnavailable as error:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Service IA momentanément indisponible") from error
