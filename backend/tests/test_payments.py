import hashlib
import hmac
import json
import os
import time
from collections import defaultdict, deque

import pytest

os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "service-key")

from fastapi.testclient import TestClient  # noqa: E402

from app.config import Settings, get_settings  # noqa: E402
from app.main import app, get_stripe, get_supabase  # noqa: E402
from app.payments import WebhookSignatureError, checkout_params, encode_form, verify_webhook  # noqa: E402

AUTH = {"Authorization": "Bearer valid"}
LISTING_ID = "22222222-2222-2222-2222-222222222222"
SECRET = "whsec_test"


class FakeSupabase:
    def __init__(self, role: str = "buyer", customer: str | None = None, owns: bool = True) -> None:
        self.role = role
        self.customer = customer
        self.owns = owns
        self.purchases: list[dict] = []
        self.extended: list[tuple] = []
        self.ended: list[tuple] = []

    async def get_user_id(self, token: str) -> str | None:
        return "user-1" if token == "valid" else None

    async def get_billing_profile(self, user_id: str) -> dict | None:
        return {"role": self.role, "email": "a@b.fr", "stripe_customer_id": self.customer}

    async def set_stripe_customer(self, user_id: str, customer_id: str) -> None:
        self.customer = customer_id

    async def owns_listing(self, user_id: str, listing_id: str) -> bool:
        return self.owns

    async def apply_purchase(self, **kwargs) -> bool:
        self.purchases.append(kwargs)
        return True

    async def extend_subscription(self, user_id: str, product: str, period_end: str) -> None:
        self.extended.append((user_id, product, period_end))

    async def end_subscription(self, user_id: str, product: str) -> None:
        self.ended.append((user_id, product))


class FakeStripe:
    def __init__(self) -> None:
        self.sessions: list[dict] = []
        self.customers = 0

    async def create_customer(self, user_id: str, email: str | None) -> str:
        self.customers += 1
        return "cus_new"

    async def create_checkout_session(self, params: dict) -> str:
        self.sessions.append(params)
        return "https://checkout.stripe.com/c/pay/cs_test"

    async def create_portal_session(self, customer_id: str, return_url: str) -> str:
        return "https://billing.stripe.com/p/session/test"


@pytest.fixture
def client_for():
    def build(supabase: FakeSupabase, stripe: FakeStripe | None = None) -> TestClient:
        app.dependency_overrides[get_supabase] = lambda: supabase
        app.dependency_overrides[get_stripe] = lambda: stripe or FakeStripe()
        app.dependency_overrides[get_settings] = lambda: Settings(
            supabase_url="https://test.supabase.co",
            supabase_service_role_key="service-key",
            stripe_webhook_secret=SECRET,
            site_url="https://gofounders.fr",
        )
        app.state.request_log = defaultdict(deque)
        return TestClient(app)

    yield build
    app.dependency_overrides.clear()


def signed(event: dict, secret: str = SECRET, timestamp: int | None = None) -> tuple[bytes, str]:
    payload = json.dumps(event).encode()
    timestamp = timestamp or int(time.time())
    signature = hmac.new(secret.encode(), f"{timestamp}.".encode() + payload, hashlib.sha256).hexdigest()
    return payload, f"t={timestamp},v1={signature}"


# --- Outils ------------------------------------------------------------------------------------


def test_encode_form_nested():
    pairs = encode_form({"mode": "payment", "line_items": [{"quantity": 1, "price_data": {"unit_amount": 100}}], "x": None})
    assert ("line_items[0][quantity]", "1") in pairs
    assert ("line_items[0][price_data][unit_amount]", "100") in pairs
    assert all(name != "x" for name, _ in pairs)


def test_verify_webhook_accepts_valid_signature():
    payload, header = signed({"type": "ping"})
    verify_webhook(payload, header, SECRET)


@pytest.mark.parametrize(
    "header_builder",
    [
        lambda payload: None,
        lambda payload: "t=1,v1=abc",
        lambda payload: signed({"type": "ping"}, secret="autre")[1],
        lambda payload: signed({"type": "ping"}, timestamp=int(time.time()) - 3600)[1],
    ],
)
def test_verify_webhook_rejects_bad_signatures(header_builder):
    payload, _ = signed({"type": "ping"})
    with pytest.raises(WebhookSignatureError):
        verify_webhook(payload, header_builder(payload), SECRET)


def test_checkout_params_subscription_carries_metadata():
    params = checkout_params("PRO_ACCOUNT", user_id="u", customer_id="cus", site_url="https://x.fr", listing_id=None, evidence=None)
    assert params["mode"] == "subscription"
    assert params["line_items"][0]["price_data"]["recurring"] == {"interval": "month"}
    assert params["subscription_data"]["metadata"] == {"user_id": "u", "product": "PRO_ACCOUNT"}
    assert params["success_url"].startswith("https://x.fr/paiement/merci?session_id=")


# --- Création de session -----------------------------------------------------------------------


def test_checkout_requires_login(client_for):
    assert client_for(FakeSupabase()).post("/api/paiements/session", json={"product": "MA_ACCESS"}).status_code == 401


def test_buyer_gets_checkout_url_and_customer_is_saved(client_for):
    supabase, stripe = FakeSupabase("buyer"), FakeStripe()
    response = client_for(supabase, stripe).post("/api/paiements/session", json={"product": "MA_ACCESS"}, headers=AUTH)
    assert response.status_code == 200
    assert response.json()["url"].startswith("https://checkout.stripe.com/")
    assert supabase.customer == "cus_new"
    session = stripe.sessions[0]
    assert session["metadata"]["product"] == "MA_ACCESS"
    assert session["line_items"][0]["price_data"]["unit_amount"] == 14900


def test_existing_customer_is_reused(client_for):
    stripe = FakeStripe()
    client_for(FakeSupabase("buyer", customer="cus_old"), stripe).post("/api/paiements/session", json={"product": "MA_PLUS"}, headers=AUTH)
    assert stripe.customers == 0
    assert stripe.sessions[0]["customer"] == "cus_old"


def test_wrong_role_is_refused(client_for):
    stripe = FakeStripe()
    response = client_for(FakeSupabase("seller"), stripe).post("/api/paiements/session", json={"product": "MA_ACCESS"}, headers=AUTH)
    assert response.status_code == 403
    assert stripe.sessions == []


def test_premium_and_unknown_offers_are_refused(client_for):
    client = client_for(FakeSupabase("entrepreneur"))
    assert client.post("/api/paiements/session", json={"product": "PREMIUM"}, headers=AUTH).status_code == 400
    assert client.post("/api/paiements/session", json={"product": "GRATUIT"}, headers=AUTH).status_code == 400


def test_listing_offer_requires_own_listing(client_for):
    client = client_for(FakeSupabase("seller", owns=False))
    response = client.post("/api/paiements/session", json={"product": "FEATURE_7D", "listing_id": LISTING_ID}, headers=AUTH)
    assert response.status_code == 404


def test_verification_requires_evidence(client_for):
    client = client_for(FakeSupabase("seller"))
    response = client.post("/api/paiements/session", json={"product": "VERIFICATION", "listing_id": LISTING_ID, "evidence": "court"}, headers=AUTH)
    assert response.status_code == 422


def test_portal_requires_existing_customer(client_for):
    assert client_for(FakeSupabase("buyer")).post("/api/paiements/portail", headers=AUTH).status_code == 404
    response = client_for(FakeSupabase("buyer", customer="cus_1")).post("/api/paiements/portail", headers=AUTH)
    assert response.status_code == 200
    assert response.json()["url"].startswith("https://billing.stripe.com/")


# --- Webhook ------------------------------------------------------------------------------------


def post_event(client: TestClient, event: dict, secret: str = SECRET):
    payload, header = signed(event, secret)
    return client.post("/api/stripe/webhook", content=payload, headers={"Stripe-Signature": header, "Content-Type": "application/json"})


def test_webhook_rejects_bad_signature(client_for):
    supabase = FakeSupabase()
    response = post_event(client_for(supabase), {"type": "checkout.session.completed"}, secret="autre")
    assert response.status_code == 400
    assert supabase.purchases == []


def test_completed_checkout_applies_purchase(client_for):
    supabase = FakeSupabase()
    event = {
        "type": "checkout.session.completed",
        "data": {"object": {
            "id": "cs_1", "payment_status": "paid", "amount_total": 4900, "subscription": None,
            "metadata": {"user_id": "user-1", "product": "FEATURE_30D", "listing_id": LISTING_ID},
        }},
    }
    assert post_event(client_for(supabase), event).status_code == 200
    purchase = supabase.purchases[0]
    assert purchase["reference"] == "cs_1"
    assert purchase["product"] == "FEATURE_30D"
    assert purchase["listing_id"] == LISTING_ID
    assert purchase["amount_cents"] == 4900


def test_unpaid_checkout_is_ignored(client_for):
    supabase = FakeSupabase()
    event = {"type": "checkout.session.completed", "data": {"object": {"id": "cs_2", "payment_status": "unpaid", "metadata": {"user_id": "u", "product": "PRO"}}}}
    assert post_event(client_for(supabase), event).status_code == 200
    assert supabase.purchases == []


def test_delayed_payment_success_applies_purchase(client_for):
    # Prélèvement SEPA : la session se termine « unpaid », puis Stripe confirme le paiement plus tard.
    supabase = FakeSupabase()
    client = client_for(supabase)
    metadata = {"user_id": "user-1", "product": "MA_ACCESS"}
    completed = {"type": "checkout.session.completed", "data": {"object": {"id": "cs_3", "payment_status": "unpaid", "metadata": metadata}}}
    succeeded = {
        "type": "checkout.session.async_payment_succeeded",
        "data": {"object": {"id": "cs_3", "payment_status": "paid", "amount_total": 14900, "metadata": metadata}},
    }
    assert post_event(client, completed).status_code == 200
    assert supabase.purchases == []
    assert post_event(client, succeeded).status_code == 200
    assert supabase.purchases[0]["reference"] == "cs_3"
    assert supabase.purchases[0]["product"] == "MA_ACCESS"


def test_delayed_payment_failure_grants_nothing(client_for):
    supabase = FakeSupabase()
    event = {"type": "checkout.session.async_payment_failed", "data": {"object": {"id": "cs_4", "metadata": {"user_id": "u", "product": "MA_ACCESS"}}}}
    assert post_event(client_for(supabase), event).status_code == 200
    assert supabase.purchases == []


def test_renewal_extends_subscription(client_for):
    supabase = FakeSupabase()
    event = {
        "type": "invoice.paid",
        "data": {"object": {
            "billing_reason": "subscription_cycle",
            "parent": {"subscription_details": {"metadata": {"user_id": "user-1", "product": "PRO_ACCOUNT"}}},
            "lines": {"data": [{"period": {"end": 1893456000}}]},
        }},
    }
    assert post_event(client_for(supabase), event).status_code == 200
    assert supabase.extended[0][:2] == ("user-1", "PRO_ACCOUNT")
    assert supabase.extended[0][2].startswith("2030-01-01")


def test_first_invoice_is_left_to_checkout(client_for):
    supabase = FakeSupabase()
    event = {"type": "invoice.paid", "data": {"object": {"billing_reason": "subscription_create", "lines": {"data": []}}}}
    assert post_event(client_for(supabase), event).status_code == 200
    assert supabase.extended == []


def test_deleted_subscription_ends_rights(client_for):
    supabase = FakeSupabase()
    event = {"type": "customer.subscription.deleted", "data": {"object": {"metadata": {"user_id": "user-1", "product": "PRO"}}}}
    assert post_event(client_for(supabase), event).status_code == 200
    assert supabase.ended == [("user-1", "PRO")]
