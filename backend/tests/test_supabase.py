import httpx
import pytest

from app.supabase import SupabaseClient

USER = "00000000-0000-0000-0000-00000000000a"


def handler(request: httpx.Request) -> httpx.Response:
    assert request.headers["apikey"] == "service-key"
    path, params = request.url.path, dict(request.url.params)
    if path == "/auth/v1/user":
        ok = request.headers["Authorization"] == "Bearer good"
        return httpx.Response(200 if ok else 401, json={"id": USER} if ok else {})
    if path == "/rest/v1/profiles" and params.get("id") == f"eq.{USER}":
        return httpx.Response(200, json=[{"id": USER, "display_name": "Ana", "role": "entrepreneur", "plan": "PRO", "bio": "x"}])
    if path == "/rest/v1/profiles" and params.get("role") == "eq.talent":
        return httpx.Response(200, json=[{"id": "t1"}, {"id": "t2"}])
    if path == "/rest/v1/conversations":
        assert params["or"] == f"(participant_a.eq.{USER},participant_b.eq.{USER})"
        return httpx.Response(200, json=[
            {"id": "c1", "created_at": "2000-01-01T00:00:00+00:00"},
            {"id": "c2", "created_at": "2999-01-01T00:00:00+00:00"},
        ])
    if path == "/rest/v1/projects":
        return httpx.Response(200, json=[{"name": "LogiFlow", "sector": "SaaS", "stage": "growth"}])
    return httpx.Response(404, json={})


@pytest.mark.anyio
async def test_load_context_and_auth():
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http:
        client = SupabaseClient("https://test.supabase.co/", "service-key", http)
        assert await client.get_user_id("good") == USER
        assert await client.get_user_id("bad") is None

        context = await client.load_user_context(USER)
        assert context is not None
        assert context.conversation_count == 2
        assert context.new_conversations_this_week == 1
        assert context.marketplace_pool == 2
        assert context.project_name == "LogiFlow"
        assert context.project_stage == "En croissance"
        assert context.profile_complete == 25  # display_name + bio sur 8 champs


@pytest.fixture
def anyio_backend():
    return "asyncio"
