"""Paiements Stripe : catalogue des offres, appels à l'API Stripe et vérification des webhooks.

Pas de dépendance au SDK Stripe : l'API REST est appelée avec httpx (formulaire encodé), et la signature
des webhooks est vérifiée selon le schéma documenté par Stripe (HMAC SHA-256 de « horodatage.corps »).
Les montants doivent rester alignés sur src/app/core/config/offers.ts (page /tarifs).
"""

import hashlib
import hmac
import time
from dataclasses import dataclass
from typing import Any, Literal

import httpx

STRIPE_API = "https://api.stripe.com/v1"
WEBHOOK_TOLERANCE_SECONDS = 300
# Stripe limite chaque valeur de métadonnée à 500 caractères.
METADATA_MAX = 500


@dataclass(frozen=True)
class Offer:
    label: str
    amount_cents: int
    mode: Literal["payment", "subscription"]
    roles: frozenset[str] | None = None  # None : tous les rôles
    needs_listing: bool = False
    # Offre liée à l'annonce d'un autre membre (mise en relation) plutôt qu'à une annonce du payeur.
    buyer_side: bool = False


OFFERS: dict[str, Offer] = {
    "PRO": Offer("GoFounders PRO", 2900, "subscription", frozenset({"entrepreneur", "talent"})),
    # Mise en relation : dossier complet et contact d'un cédant qui a accepté la demande (novembre 2026).
    "INTRO": Offer("Mise en relation avec le cédant", 5000, "payment", frozenset({"buyer"}), True, True),
    # Anciennes offres repreneur (avant la mise en relation à l'unité) : plus proposées sur le site.
    "MA_ACCESS": Offer("Accès repreneur (12 mois)", 14900, "payment", frozenset({"buyer"})),
    "MA_PLUS": Offer("Accès repreneur Plus (12 mois)", 39000, "payment", frozenset({"buyer"})),
    "PRO_DIRECTORY": Offer("Annuaire des professionnels", 1900, "subscription", frozenset({"pro"})),
    "PRO_ACCOUNT": Offer("Compte pro", 19900, "subscription", frozenset({"pro"})),
    "FEATURE_7D": Offer("Mise en avant de l'annonce (7 jours)", 1400, "payment", frozenset({"seller", "pro"}), True),
    "FEATURE_30D": Offer("Mise en avant de l'annonce (30 jours)", 4900, "payment", frozenset({"seller", "pro"}), True),
    "VERIFICATION": Offer("Dossier vérifié", 19900, "payment", frozenset({"seller", "pro"}), True),
}


def email_fingerprint(email: str | None) -> str | None:
    """Empreinte d'une adresse e-mail (anti-abus de l'essai), jamais l'adresse en clair."""
    cleaned = (email or "").strip().lower()
    return hashlib.sha256(cleaned.encode()).hexdigest() if cleaned else None


# Offres professionnelles : un mois d'essai gratuit, une seule fois par personne (compte, adresse e-mail et carte).
PRO_TRIAL_PRODUCTS = frozenset({"PRO_DIRECTORY", "PRO_ACCOUNT"})
PRO_TRIAL_DAYS = 30


class StripeError(Exception):
    pass


class WebhookSignatureError(Exception):
    pass


def encode_form(data: dict[str, Any], prefix: str = "") -> list[tuple[str, str]]:
    """Encode un dictionnaire imbriqué au format attendu par l'API Stripe (a[b][0][c]=…)."""
    pairs: list[tuple[str, str]] = []
    for key, value in data.items():
        name = f"{prefix}[{key}]" if prefix else str(key)
        if value is None:
            continue
        if isinstance(value, dict):
            pairs.extend(encode_form(value, name))
        elif isinstance(value, list):
            for index, item in enumerate(value):
                item_name = f"{name}[{index}]"
                if isinstance(item, dict):
                    pairs.extend(encode_form(item, item_name))
                else:
                    pairs.append((item_name, str(item)))
        elif isinstance(value, bool):
            pairs.append((name, "true" if value else "false"))
        else:
            pairs.append((name, str(value)))
    return pairs


def verify_webhook(payload: bytes, signature_header: str | None, secret: str, now: float | None = None) -> None:
    """Lève WebhookSignatureError si l'en-tête Stripe-Signature ne correspond pas au corps reçu."""
    if not signature_header:
        raise WebhookSignatureError("En-tête Stripe-Signature absent")

    parts: dict[str, list[str]] = {}
    for item in signature_header.split(","):
        key, _, value = item.strip().partition("=")
        parts.setdefault(key, []).append(value)

    timestamps = parts.get("t") or []
    signatures = parts.get("v1") or []
    if not timestamps or not signatures:
        raise WebhookSignatureError("En-tête Stripe-Signature incomplet")

    try:
        timestamp = int(timestamps[0])
    except ValueError as error:
        raise WebhookSignatureError("Horodatage invalide") from error

    if abs((now if now is not None else time.time()) - timestamp) > WEBHOOK_TOLERANCE_SECONDS:
        raise WebhookSignatureError("Événement trop ancien")

    signed = f"{timestamp}.".encode() + payload
    expected = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    if not any(hmac.compare_digest(expected, signature) for signature in signatures):
        raise WebhookSignatureError("Signature invalide")


def checkout_params(
    offer_code: str,
    *,
    user_id: str,
    customer_id: str,
    site_url: str,
    listing_id: str | None,
    evidence: str | None,
    trial_days: int = 0,
) -> dict[str, Any]:
    """Paramètres d'une session Stripe Checkout, prix définis ici (pas de produit à créer dans Stripe)."""
    offer = OFFERS[offer_code]
    metadata = {
        "user_id": user_id,
        "product": offer_code,
        "listing_id": listing_id,
        "evidence": (evidence or "")[:METADATA_MAX] or None,
    }
    price_data: dict[str, Any] = {
        "currency": "eur",
        "unit_amount": offer.amount_cents,
        "product_data": {"name": offer.label},
    }
    if offer.mode == "subscription":
        price_data["recurring"] = {"interval": "month"}

    params: dict[str, Any] = {
        "mode": offer.mode,
        "customer": customer_id,
        "client_reference_id": user_id,
        "line_items": [{"quantity": 1, "price_data": price_data}],
        "metadata": metadata,
        "locale": "fr",
        "allow_promotion_codes": True,
        "success_url": (
            f"{site_url}/ma/annonce/{listing_id}?paiement=merci"
            if offer.buyer_side and listing_id
            else f"{site_url}/paiement/merci?session_id={{CHECKOUT_SESSION_ID}}"
        ),
        "cancel_url": f"{site_url}/ma/annonce/{listing_id}?paiement=annule" if offer.buyer_side and listing_id else f"{site_url}/tarifs?paiement=annule",
    }
    if offer.mode == "subscription":
        # Retrouvé dans les événements de renouvellement et de résiliation.
        params["subscription_data"] = {"metadata": {"user_id": user_id, "product": offer_code}}
        if trial_days > 0:
            # Essai gratuit : rien n'est prélevé avant la fin de l'essai ; la carte est demandée dès l'inscription.
            params["subscription_data"]["trial_period_days"] = trial_days
    else:
        params["invoice_creation"] = {"enabled": True}
    return params


class StripeClient:
    def __init__(self, secret_key: str, http: httpx.AsyncClient) -> None:
        self._key = secret_key
        self._http = http

    async def _post(self, path: str, data: dict[str, Any]) -> dict[str, Any]:
        response = await self._http.post(
            f"{STRIPE_API}/{path}",
            # Un dict : httpx traiterait une liste de paires comme un flux synchrone, refusé par AsyncClient.
            data=dict(encode_form(data)),
            headers={"Authorization": f"Bearer {self._key}"},
        )
        body = response.json() if response.content else {}
        if response.status_code >= 400:
            message = body.get("error", {}).get("message", response.text[:200]) if isinstance(body, dict) else response.text[:200]
            raise StripeError(f"Stripe {path} ({response.status_code}) : {message}")
        return body

    async def _get(self, path: str, params: dict[str, str]) -> dict[str, Any]:
        response = await self._http.get(f"{STRIPE_API}/{path}", params=params, headers={"Authorization": f"Bearer {self._key}"})
        body = response.json() if response.content else {}
        if response.status_code >= 400:
            message = body.get("error", {}).get("message", response.text[:200]) if isinstance(body, dict) else response.text[:200]
            raise StripeError(f"Stripe {path} ({response.status_code}) : {message}")
        return body

    async def trial_card_fingerprint(self, subscription_id: str) -> tuple[str | None, bool]:
        """Empreinte de la carte d'un abonnement et indication « en période d'essai »."""
        subscription = await self._get(f"subscriptions/{subscription_id}", {"expand[]": "default_payment_method"})
        method = subscription.get("default_payment_method") or {}
        card = method.get("card") if isinstance(method, dict) else None
        return ((card or {}).get("fingerprint"), subscription.get("status") == "trialing")

    async def end_trial_now(self, subscription_id: str) -> None:
        """Supprime l'essai gratuit : le premier mois est facturé tout de suite."""
        await self._post(f"subscriptions/{subscription_id}", {"trial_end": "now", "proration_behavior": "none"})

    async def create_customer(self, user_id: str, email: str | None) -> str:
        customer = await self._post("customers", {"email": email, "metadata": {"user_id": user_id}})
        return str(customer["id"])

    async def create_checkout_session(self, params: dict[str, Any]) -> str:
        session = await self._post("checkout/sessions", params)
        return str(session["url"])

    async def create_portal_session(self, customer_id: str, return_url: str) -> str:
        session = await self._post("billing_portal/sessions", {"customer": customer_id, "return_url": return_url})
        return str(session["url"])
