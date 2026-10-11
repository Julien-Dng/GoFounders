import json
import os
from collections import defaultdict
from types import SimpleNamespace

import pytest

os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "service-key")

from fastapi.testclient import TestClient  # noqa: E402

from app.assistant import FALLBACK_REPLY, REFUSAL_REPLY, Assistant  # noqa: E402
from app.main import app, get_assistant, get_supabase  # noqa: E402
from app.models import ChatResponse, ChatTurn, UserContext  # noqa: E402
from app.prompt import build_user_context  # noqa: E402


def make_context(**overrides: object) -> UserContext:
    profile = {
        "display_name": "Alice Martin",
        "role": "entrepreneur",
        "plan": "PRO",
        "location": "Lyon",
        "title": "Fondatrice SaaS",
        "skills": [],
        "looking_for": ["CTO"],
    }
    profile.update(overrides)
    return UserContext.from_rows(
        profile=profile,
        project={"name": "LogiFlow", "sector": "SaaS", "stage": "mvp", "looking_for": ["CTO"]},
        conversation_count=4,
        new_conversations_this_week=1,
        marketplace_pool=12,
        own_listings=0,
    )


class FakeSupabase:
    def __init__(self, context: UserContext | None) -> None:
        self.context = context

    async def get_user_id(self, token: str) -> str | None:
        return "user-1" if token == "valid" else None

    async def load_user_context(self, user_id: str) -> UserContext | None:
        return self.context


class FakeAssistant:
    def __init__(self) -> None:
        self.calls: list[list[ChatTurn]] = []

    async def reply(self, context: UserContext, history: list[ChatTurn]) -> ChatResponse:
        self.calls.append(history)
        return ChatResponse(reply="Complétez votre bio.", actions=["completer_profil"])


@pytest.fixture
def client_for():
    def build(context: UserContext | None) -> tuple[TestClient, FakeAssistant]:
        assistant = FakeAssistant()
        app.dependency_overrides[get_supabase] = lambda: FakeSupabase(context)
        app.dependency_overrides[get_assistant] = lambda: assistant
        app.state.request_log = defaultdict(lambda: __import__("collections").deque())
        return TestClient(app), assistant

    yield build
    app.dependency_overrides.clear()


AUTH = {"Authorization": "Bearer valid"}
BODY = {"messages": [{"role": "user", "content": "Comment avoir plus de réponses ?"}]}


def test_requires_login(client_for):
    client, _ = client_for(make_context())
    assert client.post("/api/coaching-ia/messages", json=BODY).status_code == 401
    assert client.post("/api/coaching-ia/messages", json=BODY, headers={"Authorization": "Bearer bad"}).status_code == 401


def test_free_plan_is_rejected_server_side(client_for):
    client, assistant = client_for(make_context(plan="FREE"))
    response = client.post("/api/coaching-ia/messages", json=BODY, headers=AUTH)
    assert response.status_code == 403
    assert assistant.calls == []


def test_pro_user_gets_reply(client_for):
    client, assistant = client_for(make_context())
    response = client.post("/api/coaching-ia/messages", json=BODY, headers=AUTH)
    assert response.status_code == 200
    assert response.json() == {"reply": "Complétez votre bio.", "actions": ["completer_profil"]}
    assert len(assistant.calls) == 1


def test_history_must_end_with_user(client_for):
    client, _ = client_for(make_context())
    body = {"messages": [{"role": "user", "content": "a"}, {"role": "assistant", "content": "b"}]}
    assert client.post("/api/coaching-ia/messages", json=body, headers=AUTH).status_code == 422


def test_rate_limit(client_for, monkeypatch):
    client, _ = client_for(make_context())
    from app.config import get_settings

    monkeypatch.setattr(get_settings(), "max_requests_per_hour", 2)
    codes = [client.post("/api/coaching-ia/messages", json=BODY, headers=AUTH).status_code for _ in range(3)]
    assert codes == [200, 200, 429]


def test_context_endpoint_by_role(client_for):
    client, _ = client_for(make_context(role="seller", ma_sector="Restauration"))
    data = client.get("/api/coaching-ia/contexte", headers=AUTH).json()
    labels = [item["label"] for item in data["activity"]]
    assert "Mes annonces" in labels
    assert "Annonces M&A actives" in labels


def test_prompt_contains_real_data():
    prompt = build_user_context(make_context())
    assert "Alice Martin" in prompt
    assert "LogiFlow" in prompt
    assert "Talents inscrits sur la plateforme : 12" in prompt
    assert "bio" in prompt  # champ manquant signalé


# --- Assistant : traitement de la réponse Claude ---------------------------------------------


class FakeMessages:
    def __init__(self, response: SimpleNamespace) -> None:
        self.response = response
        self.kwargs: dict[str, object] = {}

    async def create(self, **kwargs: object) -> SimpleNamespace:
        self.kwargs = kwargs
        return self.response


def fake_client(stop_reason: str, text: str | None) -> SimpleNamespace:
    content = [SimpleNamespace(type="text", text=text)] if text is not None else []
    messages = FakeMessages(SimpleNamespace(stop_reason=stop_reason, content=content))
    return SimpleNamespace(beta=SimpleNamespace(messages=messages))


HISTORY = [ChatTurn(role="user", content="Que faire ?")]


@pytest.mark.anyio
async def test_assistant_filters_actions_by_role():
    payload = {"reply": "Voici mes conseils.", "actions": ["voir_recherche", "voir_ma", "voir_ma", "deposer_annonce"]}
    client = fake_client("end_turn", json.dumps(payload))
    result = await Assistant(client, "claude-opus-5-5", "medium").reply(make_context(role="buyer"), HISTORY)
    assert result.actions == ["voir_ma"]
    kwargs = client.beta.messages.kwargs
    assert kwargs["model"] == "claude-opus-5-5"
    assert kwargs["fallbacks"] == "default"
    assert kwargs["output_config"]["effort"] == "medium"


@pytest.mark.anyio
async def test_assistant_handles_refusal_and_bad_output():
    refusal = await Assistant(fake_client("refusal", None), "m", "medium").reply(make_context(), HISTORY)
    assert refusal.reply == REFUSAL_REPLY
    truncated = await Assistant(fake_client("max_tokens", '{"reply": "coup'), "m", "medium").reply(make_context(), HISTORY)
    assert truncated.reply == FALLBACK_REPLY


@pytest.fixture
def anyio_backend():
    return "asyncio"
