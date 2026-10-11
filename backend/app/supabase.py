"""Accès Supabase côté serveur : vérification du jeton utilisateur et lecture du contexte."""

from datetime import UTC, datetime, timedelta
from typing import Any

import httpx

from .models import UserContext


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
            return None
        user_id = response.json().get("id")
        return user_id if isinstance(user_id, str) else None

    async def _select(self, table: str, params: dict[str, str]) -> list[dict[str, Any]]:
        response = await self._http.get(
            f"{self._url}/rest/v1/{table}",
            params=params,
            headers={"apikey": self._key, "Authorization": f"Bearer {self._key}"},
        )
        if response.status_code != 200:
            raise SupabaseError(f"Lecture {table} impossible ({response.status_code})")
        rows = response.json()
        return rows if isinstance(rows, list) else []

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
