"""E-mails métier : modèles et envoi par Resend de la file email_outbox (supabase/2026-10-28-lancement.sql).

Les événements (nouveau message, demande d'accès, décision du cédant, modération) sont mis en file par Supabase.
Ce module les envoie quand RESEND_API_KEY est configurée. Règle : aucun e-mail ne contient d'information
confidentielle (ni contenu de message, ni nom d'entreprise) ; seulement le secteur et la région de l'annonce,
déjà publics, et un lien vers le site.
"""

import html
import logging
from dataclasses import dataclass
from typing import Any, Protocol

import httpx

logger = logging.getLogger(__name__)

RESEND_API = "https://api.resend.com/emails"
MAX_ATTEMPTS = 5


@dataclass(frozen=True)
class RenderedEmail:
    subject: str
    text: str
    html: str


@dataclass(frozen=True)
class Template:
    subject: str
    paragraphs: tuple[str, ...]
    cta: str
    path: str


TEMPLATES: dict[str, Template] = {
    "new_message": Template(
        "Vous avez un nouveau message sur GoFounders",
        ("Vous avez reçu un nouveau message dans votre messagerie GoFounders.",
         "Pour préserver la confidentialité de vos échanges, son contenu n'est pas reproduit dans cet e-mail."),
        "Lire le message",
        "/messages",
    ),
    "access_request": Template(
        "Un repreneur demande l'accès à votre dossier",
        ("Un repreneur demande l'accès au dossier de votre annonce « {listing_label} ».",
         "Il s'est présenté et a accepté l'engagement de confidentialité. Consultez son profil, puis acceptez ou refusez sa demande."),
        "Voir la demande",
        "/ma/mes-annonces",
    ),
    "access_approved": Template(
        "Le cédant vous ouvre son dossier",
        ("Bonne nouvelle : le cédant de l'annonce « {listing_label} » a accepté votre demande.",
         "Vous pouvez lire son dossier complet et échanger avec lui dans la messagerie."),
        "Ouvrir le dossier",
        "/ma/annonce/{listing_id}",
    ),
    "access_refused": Template(
        "Votre demande d'accès n'a pas été retenue",
        ("Le cédant de l'annonce « {listing_label} » n'a pas donné suite à votre demande d'accès.",
         "D'autres entreprises sont à reprendre sur GoFounders."),
        "Voir les annonces",
        "/ma",
    ),
    "listing_published": Template(
        "Votre annonce est en ligne",
        ("Votre annonce « {listing_label} » a été relue par notre équipe : elle est maintenant visible des repreneurs.",
         "Vous serez prévenu à chaque demande d'accès à votre dossier."),
        "Voir mon annonce",
        "/ma/annonce/{listing_id}",
    ),
    "listing_rejected": Template(
        "Votre annonce doit être corrigée",
        ("Votre annonce « {listing_label} » n'a pas été publiée, pour la raison suivante :", "{reason}",
         "Contactez-nous depuis la page contact pour la corriger et la remettre en relecture."),
        "Mes annonces",
        "/ma/mes-annonces",
    ),
    "listing_withdrawn": Template(
        "Votre annonce a été retirée",
        ("Votre annonce « {listing_label} » a été retirée par la modération, pour la raison suivante :", "{reason}",
         "Contactez-nous depuis la page contact si vous souhaitez la remettre en ligne."),
        "Mes annonces",
        "/ma/mes-annonces",
    ),
    "listing_restored": Template(
        "Votre annonce est de nouveau en ligne",
        ("Votre annonce « {listing_label} » est de nouveau visible des repreneurs.",),
        "Voir mon annonce",
        "/ma/annonce/{listing_id}",
    ),
}


class _SafeDict(dict[str, str]):
    def __missing__(self, key: str) -> str:
        return ""


def render(template_name: str, payload: dict[str, Any], site_url: str, recipient_name: str | None = None) -> RenderedEmail:
    """Texte et HTML d'un e-mail. Lève KeyError pour un modèle inconnu."""
    template = TEMPLATES[template_name]
    values = _SafeDict({key: str(value) for key, value in (payload or {}).items() if value is not None})
    paragraphs = [paragraph.format_map(values) for paragraph in template.paragraphs]
    paragraphs = [paragraph for paragraph in paragraphs if paragraph.strip()]
    link = site_url.rstrip("/") + template.path.format_map(values)
    greeting = f"Bonjour {recipient_name}," if recipient_name else "Bonjour,"
    footer = "GoFounders · Vous recevez cet e-mail car vous avez un compte sur GoFounders. Réglez vos e-mails dans Paramètres."

    text = "\n\n".join([greeting, *paragraphs, f"{template.cta} : {link}", "—", footer])
    body = "".join(f'<p style="margin:0 0 16px">{html.escape(paragraph)}</p>' for paragraph in paragraphs)
    html_body = (
        '<div style="font-family:Arial,Helvetica,sans-serif;color:#1E2633;max-width:560px;margin:0 auto;padding:24px;line-height:1.5">'
        f'<p style="margin:0 0 16px">{html.escape(greeting)}</p>{body}'
        f'<p style="margin:24px 0"><a href="{html.escape(link)}" style="background:#1D4ED8;color:#ffffff;padding:12px 20px;'
        f'border-radius:8px;text-decoration:none;font-weight:bold">{html.escape(template.cta)}</a></p>'
        f'<p style="margin:32px 0 0;font-size:13px;color:#4A5463">{html.escape(footer)}</p></div>'
    )
    return RenderedEmail(template.subject, text, html_body)


class EmailSender(Protocol):
    async def send(self, to: str, email: RenderedEmail) -> None: ...


class EmailError(Exception):
    pass


class ResendClient:
    def __init__(self, api_key: str, sender: str, http: httpx.AsyncClient) -> None:
        self._key = api_key
        self._sender = sender
        self._http = http

    async def send(self, to: str, email: RenderedEmail) -> None:
        response = await self._http.post(
            RESEND_API,
            json={"from": self._sender, "to": [to], "subject": email.subject, "text": email.text, "html": email.html},
            headers={"Authorization": f"Bearer {self._key}"},
        )
        if response.status_code >= 400:
            raise EmailError(f"Resend ({response.status_code}) : {response.text[:200]}")


class OutboxStore(Protocol):
    async def list_pending_emails(self, limit: int) -> list[dict[str, Any]]: ...
    async def get_email_recipient(self, user_id: str) -> dict[str, Any] | None: ...
    async def mark_email_sent(self, email_id: str) -> None: ...
    async def mark_email_failed(self, email_id: str, attempts: int, error: str) -> None: ...


async def send_pending(store: OutboxStore, sender: EmailSender, site_url: str, limit: int = 20) -> int:
    """Envoie les e-mails en attente ; renvoie le nombre d'envois réussis. Un échec est retenté plus tard (5 fois au plus)."""
    sent = 0
    for item in await store.list_pending_emails(limit):
        attempts = int(item.get("attempts") or 0) + 1
        try:
            recipient = await store.get_email_recipient(str(item["user_id"]))
            if not recipient or not recipient.get("email"):
                await store.mark_email_failed(str(item["id"]), MAX_ATTEMPTS, "Adresse e-mail introuvable")
                continue
            first_name = (recipient.get("display_name") or "").split(" ")[0] or None
            email = render(str(item["template"]), item.get("payload") or {}, site_url, first_name)
            await sender.send(str(recipient["email"]), email)
            await store.mark_email_sent(str(item["id"]))
            sent += 1
        except KeyError:
            await store.mark_email_failed(str(item["id"]), MAX_ATTEMPTS, f"Modèle inconnu : {item.get('template')}")
        except Exception as error:  # noqa: BLE001 - un e-mail en échec ne doit pas bloquer les suivants
            logger.warning("Envoi d'e-mail impossible (%s) : %s", item.get("id"), error)
            await store.mark_email_failed(str(item["id"]), attempts, str(error)[:300])
    return sent
