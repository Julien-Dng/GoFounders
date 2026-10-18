"""Accès Supabase côté serveur : vérification du jeton utilisateur et lecture du contexte."""

from datetime import UTC, datetime, timedelta
from typing import Any

import logging

import httpx

from .models import UserContext

logger = logging.getLogger(__name__)


class SupabaseError(Exception):
    pass


class SupabaseClient:
    def __init__(self, url: str, service_role_key: str, http: httpx.AsyncClient) -> None:
        self._url = url.rstrip("/")
        self._key = service_role_key
        self._http = http

    async def get_user_id(self, access_token: str) -> str | None:
        """Renvoie l'id de l'utilisateur si le jeton Supabase est valide, sinon None."""
        response = await self._http.get(
            f"{self._url}/auth/v1/user",
            headers={"apikey": self._key, "Authorization": f"Bearer {access_token}"},
        )
        if response.status_code != 200:
            logger.warning("Jeton refusé par Supabase (%s) : %s", response.status_code, response.text[:200])
            return None
        user_id = response.json().get("id")
        return user_id if isinstance(user_id, str) else None

    def _service_headers(self) -> dict[str, str]:
        # Ancienne clé service_role (JWT « eyJ… ») : aussi en Bearer. Nouvelle clé « sb_secret_… » :
        # uniquement dans apikey, Supabase refuse une clé qui n'est pas un JWT dans Authorization.
        headers = {"apikey": self._key}
        if self._key.startswith("eyJ"):
            headers["Authorization"] = f"Bearer {self._key}"
        return headers

    async def _select(self, table: str, params: dict[str, str]) -> list[dict[str, Any]]:
        response = await self._http.get(
            f"{self._url}/rest/v1/{table}",
            params=params,
            headers=self._service_headers(),
        )
        if response.status_code != 200:
            raise SupabaseError(f"Lecture {table} impossible ({response.status_code}) : {response.text[:300]}")
        rows = response.json()
        return rows if isinstance(rows, list) else []

    async def get_role(self, user_id: str) -> str | None:
        rows = await self._select("profiles", {"id": f"eq.{user_id}", "select": "role"})
        role = rows[0].get("role") if rows else None
        return role if isinstance(role, str) else None

    async def has_active_ma_access(self, user_id: str) -> bool:
        """Même règle que l'appli : fonction Supabase has_active_ma_access (accès repreneur non expiré)."""
        response = await self._http.post(
            f"{self._url}/rest/v1/rpc/has_active_ma_access",
            json={"target_user": user_id},
            headers=self._service_headers(),
        )
        if response.status_code != 200:
            raise SupabaseError(f"has_active_ma_access impossible ({response.status_code}) : {response.text[:300]}")
        return response.json() is True

    async def consume_ai_analysis(self, user_id: str, free_limit: int) -> bool:
        """Décompte une analyse de dossier : True si elle est permise (Plus illimité, sinon free_limit par mois)."""
        response = await self._http.post(
            f"{self._url}/rest/v1/rpc/consume_ai_analysis",
            json={"target_user": user_id, "free_limit": free_limit},
            headers=self._service_headers(),
        )
        if response.status_code != 200:
            raise SupabaseError(f"consume_ai_analysis impossible ({response.status_code}) : {response.text[:300]}")
        return response.json() is True

    async def load_listing_for_analysis(self, listing_id: str) -> dict[str, Any] | None:
        """Dossier d'une annonce active, sans owner_id ni contact_info (jamais transmis au modèle)."""
        rows = await self._select(
            "ma_listings",
            {
                "id": f"eq.{listing_id}",
                "status": "eq.active",
                "select": "id,sector,region,type,revenue,margin,age,price_min,price_max,public_summary,sale_reason,confidential_description",
            },
        )
        return rows[0] if rows else None

    async def load_user_context(self, user_id: str) -> UserContext | None:
        profiles = await self._select("profiles", {"id": f"eq.{user_id}", "select": "*"})
        if not profiles:
            return None
        profile = profiles[0]
        role = profile.get("role", "")

        week_ago = (datetime.now(UTC) - timedelta(days=7)).isoformat()
        conversations = await self._select(
            "conversations",
            {"or": f"(participant_a.eq.{user_id},participant_b.eq.{user_id})", "select": "id,created_at"},
        )
        project = None
        if role == "entrepreneur":
            projects = await self._select(
                "projects", {"owner_id": f"eq.{user_id}", "is_active": "eq.true", "select": "*", "limit": "1"}
            )
            project = projects[0] if projects else None

        # Profils proposés par la recherche : talents pour un porteur de projet, projets pour un talent.
        if role == "entrepreneur":
            pool = len(await self._select("profiles", {"role": "eq.talent", "select": "id"}))
        elif role == "talent":
            pool = len(await self._select("projects", {"is_active": "eq.true", "select": "id"}))
        else:
            pool = len(await self._select("ma_listings", {"status": "eq.active", "select": "id"}))

        own_listings = 0
        if role == "seller":
            own_listings = len(await self._select("ma_listings", {"owner_id": f"eq.{user_id}", "select": "id"}))

        return UserContext.from_rows(
            profile=profile,
            project=project,
            conversation_count=len(conversations),
            new_conversations_this_week=sum(1 for c in conversations if (c.get("created_at") or "") >= week_ago),
            marketplace_pool=pool,
            own_listings=own_listings,
        )
