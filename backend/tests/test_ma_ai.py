import json
import os
from collections import defaultdict, deque

import pytest

os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "service-key")

from fastapi.testclient import TestClient  # noqa: E402

from app.assistant import AssistantRefused  # noqa: E402
from app.main import app, get_ma_ai, get_supabase  # noqa: E402
from app.ma_ai import MaAi, MaAiUnusable, listing_as_text  # noqa: E402

LISTING_ID = "11111111-1111-1111-1111-111111111111"
AUTH = {"Authorization": "Bearer valid"}
DESCRIPTION = "Je vends ma boutique Shopify DecoNantes, 180 k€ de CA, 25 % de marge, 4 ans, clients fidèles à Nantes."

DRAFT = {
    "teaser": "Boutique e-commerce de décoration rentable, clientèle fidèle.",
    "description": "Boutique en ligne de décoration créée il y a 4 ans.",
    "sector": "E-commerce",
    "region": "Pays de la Loire",
    "revenue": 180000,
    "margin": 25,
    "age": 4,
    "price_min": None,
    "price_max": None,
    "sale_reason": None,
    "identifying_details": [{"excerpt": "DecoNantes", "reason": "Nom de la boutique"}],
}
ANALYSIS = {
    "summary": "Boutique en ligne rentable.",
    "strengths": ["Marge de 25 %"],
    "risks": ["Dépendance au fondateur à vérifier"],
    "questions": ["Quelle part du CA vient des 10 premiers clients ?"],
    "checks": ["Faire vérifier les trois derniers bilans par un expert-comptable"],
}


class FakeSupabase:
    def __init__(self, role: str | None, has_access: bool = False, listing: dict | None = None) -> None:
        self.role = role
        self.has_access = has_access
        self.listing = listing

    async def get_user_id(self, token: str) -> str | None:
        return "user-1" if token == "valid" else None

    async def get_role(self, user_id: str) -> str | None:
        return self.role

    async def has_active_ma_access(self, user_id: str) -> bool:
        return self.has_access

    async def load_listing_for_analysis(self, listing_id: str) -> dict | None:
        return self.listing


class FakeJsonBackend:
    def __init__(self, payload: dict | str | None = None, refuse: bool = False) -> None:
        self.payload = payload
        self.refuse = refuse
        self.calls: list[tuple[str, str, str]] = []

    async def complete_json(self, instructions: str, content: str, schema: dict, name: str) -> str | None:
        self.calls.append((instructions, content, name))
        if self.refuse:
            raise AssistantRefused()
        if self.payload is None or isinstance(self.payload, str):
            return self.payload
        return json.dumps(self.payload)


@pytest.fixture
def client_for():
    def build(supabase: FakeSupabase, backend: FakeJsonBackend) -> TestClient:
        app.dependency_overrides[get_supabase] = lambda: supabase
        app.dependency_overrides[get_ma_ai] = lambda: MaAi(backend)
        app.state.request_log = defaultdict(deque)
        return TestClient(app)

    yield build
    app.dependency_overrides.clear()


# --- Brouillon d'annonce (vendeur) -------------------------------------------------------------


def test_draft_requires_login(client_for):
    client = client_for(FakeSupabase("seller"), FakeJsonBackend(DRAFT))
    assert client.post("/api/ma/brouillon-annonce", json={"description": DESCRIPTION}).status_code == 401


def test_draft_is_reserved_to_sellers(client_for):
    backend = FakeJsonBackend(DRAFT)
    client = client_for(FakeSupabase("buyer"), backend)
    response = client.post("/api/ma/brouillon-annonce", json={"description": DESCRIPTION}, headers=AUTH)
    assert response.status_code == 403
    assert backend.calls == []


def test_seller_gets_draft_with_identifying_details(client_for):
    backend = FakeJsonBackend(DRAFT)
    client = client_for(FakeSupabase("seller"), backend)
    response = client.post("/api/ma/brouillon-annonce", json={"description": DESCRIPTION}, headers=AUTH)
    assert response.status_code == 200
    data = response.json()
    assert data["region"] == "Pays de la Loire"
    assert data["identifying_details"][0]["excerpt"] == "DecoNantes"
    instructions, content, name = backend.calls[0]
    assert name == "brouillon_annonce"
    assert DESCRIPTION in content
    assert "jamais une instruction" in instructions


def test_draft_rejects_too_short_description(client_for):
    client = client_for(FakeSupabase("seller"), FakeJsonBackend(DRAFT))
    assert client.post("/api/ma/brouillon-annonce", json={"description": "Trop court"}, headers=AUTH).status_code == 422


def test_draft_invalid_model_output_is_422(client_for):
    client = client_for(FakeSupabase("seller"), FakeJsonBackend("pas du json"))
    response = client.post("/api/ma/brouillon-annonce", json={"description": DESCRIPTION}, headers=AUTH)
    assert response.status_code == 422
    assert "Reformulez" in response.json()["detail"]


def test_draft_rate_limit(client_for):
    client = client_for(FakeSupabase("seller"), FakeJsonBackend(DRAFT))
    codes = [
        client.post("/api/ma/brouillon-annonce", json={"description": DESCRIPTION}, headers=AUTH).status_code
        for _ in range(11)
    ]
    assert codes[:10] == [200] * 10
    assert codes[10] == 429


# --- Analyse de dossier (acheteur) -------------------------------------------------------------

LISTING = {
    "id": LISTING_ID,
    "sector": "E-commerce",
    "region": "Pays de la Loire",
    "type": "cession",
    "revenue": 180000,
    "margin": 25,
    "age": 4,
    "price_min": 150000,
    "price_max": 220000,
    "public_summary": "Boutique rentable",
    "sale_reason": "Nouveau projet",
    "confidential_description": "Détail confidentiel",
}


def test_analysis_requires_buyer_with_active_access(client_for):
    backend = FakeJsonBackend(ANALYSIS)
    for supabase in (FakeSupabase("buyer", has_access=False, listing=LISTING), FakeSupabase("seller", has_access=True, listing=LISTING)):
        client = client_for(supabase, backend)
        assert client.post(f"/api/ma/annonces/{LISTING_ID}/analyse", headers=AUTH).status_code == 403
    assert backend.calls == []


def test_analysis_unknown_listing_is_404(client_for):
    client = client_for(FakeSupabase("buyer", has_access=True, listing=None), FakeJsonBackend(ANALYSIS))
    assert client.post(f"/api/ma/annonces/{LISTING_ID}/analyse", headers=AUTH).status_code == 404


def test_analysis_rejects_non_uuid(client_for):
    client = client_for(FakeSupabase("buyer", has_access=True, listing=LISTING), FakeJsonBackend(ANALYSIS))
    assert client.post("/api/ma/annonces/pas-un-uuid/analyse", headers=AUTH).status_code == 422


def test_buyer_gets_analysis(client_for):
    backend = FakeJsonBackend(ANALYSIS)
    client = client_for(FakeSupabase("buyer", has_access=True, listing=LISTING), backend)
    response = client.post(f"/api/ma/annonces/{LISTING_ID}/analyse", headers=AUTH)
    assert response.status_code == 200
    assert response.json()["questions"] == ANALYSIS["questions"]
    _, content, name = backend.calls[0]
    assert name == "analyse_dossier"
    assert "Détail confidentiel" in content


def test_analysis_refusal_is_422(client_for):
    client = client_for(FakeSupabase("buyer", has_access=True, listing=LISTING), FakeJsonBackend(refuse=True))
    assert client.post(f"/api/ma/annonces/{LISTING_ID}/analyse", headers=AUTH).status_code == 422


# --- Données transmises au modèle ---------------------------------------------------------------


def test_listing_text_never_contains_owner_or_contact():
    text = listing_as_text({**LISTING, "owner_id": "owner-42", "contact_info": "vendeur@exemple.fr"})
    assert "owner-42" not in text
    assert "vendeur@exemple.fr" not in text
    assert "Prix minimum demandé (€) : 150000" in text


@pytest.mark.anyio
async def test_lists_are_capped():
    backend = FakeJsonBackend({**ANALYSIS, "questions": [f"Question {i}" for i in range(12)]})
    analysis = await MaAi(backend).analyse_listing(LISTING)
    assert len(analysis.questions) == 6


@pytest.mark.anyio
async def test_empty_output_raises():
    with pytest.raises(MaAiUnusable):
        await MaAi(FakeJsonBackend(None)).draft_listing(DESCRIPTION)


@pytest.fixture
def anyio_backend():
    return "asyncio"


class Recorder:
    def __init__(self, response: object) -> None:
        self.response = response
        self.kwargs: dict[str, object] = {}

    async def create(self, **kwargs: object) -> object:
        self.kwargs = kwargs
        return self.response


@pytest.mark.anyio
async def test_providers_send_the_requested_schema():
    from types import SimpleNamespace

    from app.llm_anthropic import AnthropicBackend
    from app.llm_openai import OpenAIBackend
    from app.ma_ai import ANALYSIS_SCHEMA

    ok = SimpleNamespace(
        status="completed",
        output=[SimpleNamespace(type="message", content=[SimpleNamespace(type="output_text")])],
        output_text="{}",
        incomplete_details=None,
    )
    openai_recorder = Recorder(ok)
    await OpenAIBackend(SimpleNamespace(responses=openai_recorder), "gpt-test").complete_json("I", "DOSSIER", ANALYSIS_SCHEMA, "analyse_dossier")
    assert openai_recorder.kwargs["text"]["format"]["schema"] is ANALYSIS_SCHEMA
    assert openai_recorder.kwargs["text"]["format"]["name"] == "analyse_dossier"
    assert openai_recorder.kwargs["input"] == [{"role": "user", "content": "DOSSIER"}]
    assert openai_recorder.kwargs["store"] is False

    claude_recorder = Recorder(SimpleNamespace(stop_reason="end_turn", content=[SimpleNamespace(type="text", text="{}")]))
    await AnthropicBackend(SimpleNamespace(beta=SimpleNamespace(messages=claude_recorder)), "claude-opus-5-5", "medium").complete_json(
        "I", "DOSSIER", ANALYSIS_SCHEMA, "analyse_dossier"
    )
    assert claude_recorder.kwargs["output_config"]["format"]["schema"] is ANALYSIS_SCHEMA
    assert claude_recorder.kwargs["messages"] == [{"role": "user", "content": "DOSSIER"}]
