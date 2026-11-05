"""API GoFounders : assistant IA contextuel (/coaching-ia), avec OpenAI ou Claude.

Lancement local : uvicorn app.main:app --reload --port 8000
"""

import asyncio
import json
import logging
import time
from collections import defaultdict, deque
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

import anthropic
import httpx
import openai
from fastapi import Depends, FastAPI, Header, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .assistant import Assistant, AssistantUnavailable, LlmBackend
from .config import Settings, get_settings
from .emails import ResendClient, send_pending
from .llm_anthropic import AnthropicBackend
from .llm_openai import OpenAIBackend
from .ma_ai import DraftRequest, ListingAnalysis, ListingDraft, MaAi, MaAiUnusable
from .models import ChatRequest, ChatResponse, ContextItem, ContextResponse, UserContext
from .payments import OFFERS, PRO_TRIAL_DAYS, PRO_TRIAL_PRODUCTS, email_fingerprint, StripeClient, StripeError, WebhookSignatureError, checkout_params, verify_webhook
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


async def email_loop(store: SupabaseClient, sender: ResendClient, settings: Settings) -> None:
    """Vide la file d'e-mails toutes les minutes (RESEND_API_KEY configurée)."""
    while True:
        try:
            sent = await send_pending(store, sender, settings.site_url)
            if sent:
                logger.info("%s e-mail(s) envoyé(s)", sent)
        except Exception as error:  # noqa: BLE001 - la boucle ne doit jamais s'arrêter sur une erreur passagère
            logger.warning("File d'e-mails indisponible : %s", error)
        await asyncio.sleep(max(settings.email_poll_seconds, 15))


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=10.0) as http:
        app.state.supabase = SupabaseClient(settings.supabase_url, settings.supabase_service_role_key, http)
        backend = build_backend(settings)
        app.state.assistant = Assistant(backend)
        app.state.ma_ai = MaAi(backend)
        app.state.request_log = defaultdict(deque)
        app.state.stripe = StripeClient(settings.stripe_secret_key, http) if settings.stripe_secret_key else None
        email_task = None
        if settings.resend_api_key:
            sender = ResendClient(settings.resend_api_key, settings.resend_from, http)
            email_task = asyncio.create_task(email_loop(app.state.supabase, sender, settings))
        yield
        if email_task:
            email_task.cancel()


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
# Analyses de dossier par mois pour un repreneur (dossiers débloqués uniquement) ; illimitées avec l'ancien accès Plus.
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
    """Repreneur dont la mise en relation est débloquée (demande acceptée et payée) : analyse du dossier."""
    try:
        role = await supabase.get_role(user_id)
        unlocked = role == "buyer" and await supabase.has_approved_listing_access(str(listing_id), user_id)
    except SupabaseError as error:
        logger.error("Accès M&A illisible : %s", error)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Données du profil indisponibles") from error
    if role != "buyer":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "L'analyse de dossier est réservée aux comptes repreneur")
    if not unlocked:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Débloquez d'abord la mise en relation avec le cédant pour analyser ce dossier")

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
            f"Vous avez utilisé vos {FREE_ANALYSES_PER_MONTH} analyses du mois. Elles seront de nouveau disponibles le mois prochain.",
        )

    try:
        return await ma_ai.analyse_listing(listing)
    except MaAiUnusable as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Je n'ai pas pu analyser ce dossier. Réessayez plus tard.") from error
    except AssistantUnavailable as error:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Service IA momentanément indisponible") from error


# --- Paiements Stripe (refonte « reprise ») ----------------------------------------------------------

CHECKOUT_REQUESTS_PER_HOUR = 20


class CheckoutRequest(BaseModel):
    product: str
    listing_id: UUID | None = None
    evidence: str | None = Field(default=None, max_length=3000)


class RedirectResponse(BaseModel):
    url: str


def get_stripe(request: Request) -> StripeClient:
    stripe = request.app.state.stripe
    if stripe is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Le paiement en ligne n'est pas encore configuré")
    return stripe


async def ensure_customer(supabase: SupabaseClient, stripe: StripeClient, user_id: str, profile: dict) -> str:
    customer_id = profile.get("stripe_customer_id")
    if isinstance(customer_id, str) and customer_id:
        return customer_id
    customer_id = await stripe.create_customer(user_id, profile.get("email"))
    await supabase.set_stripe_customer(user_id, customer_id)
    return customer_id


@app.post("/api/paiements/session", response_model=RedirectResponse)
async def create_checkout(
    payload: CheckoutRequest,
    request: Request,
    user_id: Annotated[str, Depends(get_user_id)],
    supabase: Annotated[SupabaseClient, Depends(get_supabase)],
    stripe: Annotated[StripeClient, Depends(get_stripe)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> RedirectResponse:
    """Crée la session Stripe Checkout d'une offre ; les droits sont accordés plus tard par le webhook."""
    offer = OFFERS.get(payload.product)
    if offer is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Offre inconnue ou sur devis")

    enforce_rate_limit(request, f"checkout:{user_id}", CHECKOUT_REQUESTS_PER_HOUR)
    try:
        profile = await supabase.get_billing_profile(user_id)
        if profile is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Profil introuvable")
        if offer.roles is not None and profile.get("role") not in offer.roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Cette offre n'est pas disponible pour votre type de compte")

        listing_id = str(payload.listing_id) if payload.listing_id else None
        if offer.needs_listing and offer.buyer_side:
            # Mise en relation : seulement une demande acceptée par le cédant et pas encore débloquée.
            if listing_id is None or not await supabase.can_unlock_listing(user_id, listing_id):
                raise HTTPException(status.HTTP_409_CONFLICT, "Aucune demande acceptée à débloquer pour cette annonce")
        elif offer.needs_listing:
            if listing_id is None or not await supabase.owns_listing(user_id, listing_id):
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Annonce introuvable ou qui ne vous appartient pas")
            if payload.product == "VERIFICATION" and len((payload.evidence or "").strip()) < 20:
                raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Décrivez vos justificatifs (au moins 20 caractères)")

        trial_days = 0
        if (
            payload.product in PRO_TRIAL_PRODUCTS
            and not await supabase.has_purchased(user_id, PRO_TRIAL_PRODUCTS)
            and not await supabase.trial_claimed(email_hash=email_fingerprint(profile.get("email")))
        ):
            trial_days = PRO_TRIAL_DAYS

        customer_id = await ensure_customer(supabase, stripe, user_id, profile)
        url = await stripe.create_checkout_session(
            checkout_params(
                payload.product,
                user_id=user_id,
                customer_id=customer_id,
                site_url=settings.site_url.rstrip("/"),
                listing_id=listing_id if offer.needs_listing else None,
                evidence=payload.evidence,
                trial_days=trial_days,
            )
        )
    except SupabaseError as error:
        logger.error("Profil illisible pour le paiement : %s", error)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Données du profil indisponibles") from error
    except StripeError as error:
        logger.error("Session Stripe impossible : %s", error)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Le paiement est momentanément indisponible") from error
    return RedirectResponse(url=url)


@app.post("/api/paiements/portail", response_model=RedirectResponse)
async def billing_portal(
    user_id: Annotated[str, Depends(get_user_id)],
    supabase: Annotated[SupabaseClient, Depends(get_supabase)],
    stripe: Annotated[StripeClient, Depends(get_stripe)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> RedirectResponse:
    """Portail Stripe : moyens de paiement, factures, résiliation des abonnements."""
    try:
        profile = await supabase.get_billing_profile(user_id)
        customer_id = profile.get("stripe_customer_id") if profile else None
        if not customer_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Aucun paiement enregistré pour ce compte")
        url = await stripe.create_portal_session(customer_id, f"{settings.site_url.rstrip('/')}/abonnement")
    except SupabaseError as error:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Données du profil indisponibles") from error
    except StripeError as error:
        logger.error("Portail Stripe impossible : %s", error)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Le portail de facturation est momentanément indisponible") from error
    return RedirectResponse(url=url)


def subscription_metadata(invoice: dict) -> dict:
    """Métadonnées de l'abonnement d'une facture (emplacement selon la version de l'API Stripe)."""
    parent = invoice.get("parent") or {}
    for details in (parent.get("subscription_details"), invoice.get("subscription_details")):
        if isinstance(details, dict) and isinstance(details.get("metadata"), dict) and details["metadata"]:
            return details["metadata"]
    lines = (invoice.get("lines") or {}).get("data") or []
    return lines[0].get("metadata") or {} if lines else {}


def iso(timestamp: int | None) -> str | None:
    return datetime.fromtimestamp(timestamp, UTC).isoformat() if timestamp else None


async def guard_pro_trial(request: Request, supabase: SupabaseClient, subscription_id: str, email: str | None) -> None:
    """Essai gratuit pro : déjà utilisé avec cette carte (autre compte, compte recréé) → facturé tout de suite.
    Sinon, l'essai est mémorisé (empreintes de l'e-mail et de la carte). Une erreur ici ne bloque pas le paiement."""
    stripe = request.app.state.stripe
    if stripe is None:
        return
    try:
        fingerprint, trialing = await stripe.trial_card_fingerprint(subscription_id)
        if not trialing:
            return
        if fingerprint and await supabase.trial_claimed(card_fingerprint=fingerprint):
            await stripe.end_trial_now(subscription_id)
            logger.info("Essai pro refusé (carte déjà utilisée) : %s", subscription_id)
            return
        await supabase.record_trial_claim(email_hash=email_fingerprint(email), card_fingerprint=fingerprint, subscription_id=subscription_id)
    except (StripeError, SupabaseError) as error:
        logger.error("Contrôle de l'essai pro impossible (%s) : %s", subscription_id, error)


@app.post("/api/stripe/webhook")
async def stripe_webhook(
    request: Request,
    supabase: Annotated[SupabaseClient, Depends(get_supabase)],
    settings: Annotated[Settings, Depends(get_settings)],
    stripe_signature: Annotated[str | None, Header()] = None,
) -> dict[str, bool]:
    """Événements Stripe : paiement confirmé, renouvellement, fin d'abonnement. Seule voie qui accorde des droits."""
    if not settings.stripe_webhook_secret:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Webhook Stripe non configuré")

    payload = await request.body()
    try:
        verify_webhook(payload, stripe_signature, settings.stripe_webhook_secret)
    except WebhookSignatureError as error:
        logger.warning("Webhook Stripe refusé : %s", error)
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Signature invalide") from error

    event = json.loads(payload)
    kind = event.get("type")
    obj = (event.get("data") or {}).get("object") or {}

    try:
        # Paiement immédiat (carte) : checkout.session.completed avec payment_status « paid ».
        # Paiement différé (prélèvement SEPA...) : completed arrive « unpaid », puis async_payment_succeeded.
        # apply_purchase est idempotent (référence = identifiant de session) : recevoir les deux ne double rien.
        paid_checkout = (
            kind == "checkout.session.completed" and obj.get("payment_status") in ("paid", "no_payment_required")
        ) or kind == "checkout.session.async_payment_succeeded"
        if paid_checkout:
            metadata = obj.get("metadata") or {}
            if metadata.get("user_id") and metadata.get("product"):
                await supabase.apply_purchase(
                    user_id=metadata["user_id"],
                    product=metadata["product"],
                    listing_id=metadata.get("listing_id") or None,
                    evidence=metadata.get("evidence") or None,
                    period_end=None,
                    reference=obj["id"],
                    amount_cents=obj.get("amount_total"),
                    subscription_id=obj.get("subscription"),
                )
                if metadata["product"] in PRO_TRIAL_PRODUCTS and obj.get("subscription"):
                    await guard_pro_trial(request, supabase, str(obj["subscription"]), (obj.get("customer_details") or {}).get("email"))
        elif kind == "invoice.paid" and obj.get("billing_reason") == "subscription_cycle":
            metadata = subscription_metadata(obj)
            lines = (obj.get("lines") or {}).get("data") or []
            period_end = iso((lines[0].get("period") or {}).get("end")) if lines else None
            if metadata.get("user_id") and metadata.get("product") and period_end:
                await supabase.extend_subscription(metadata["user_id"], metadata["product"], period_end)
        elif kind == "customer.subscription.deleted":
            metadata = obj.get("metadata") or {}
            if metadata.get("user_id") and metadata.get("product"):
                await supabase.end_subscription(metadata["user_id"], metadata["product"])
    except SupabaseError as error:
        # 500 : Stripe renverra l'événement plus tard.
        logger.error("Événement Stripe %s non appliqué : %s", kind, error)
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Événement non appliqué") from error

    return {"received": True}
