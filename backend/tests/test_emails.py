import asyncio

from app.emails import TEMPLATES, render, send_pending


class FakeStore:
    def __init__(self, items, recipients):
        self.items = items
        self.recipients = recipients
        self.sent: list[str] = []
        self.failed: list[tuple[str, int, str]] = []

    async def list_pending_emails(self, limit):
        return self.items[:limit]

    async def get_email_recipient(self, user_id):
        return self.recipients.get(user_id)

    async def mark_email_sent(self, email_id):
        self.sent.append(email_id)

    async def mark_email_failed(self, email_id, attempts, error):
        self.failed.append((email_id, attempts, error))


class FakeSender:
    def __init__(self, fail_for=None):
        self.fail_for = fail_for
        self.messages = []

    async def send(self, to, email):
        if to == self.fail_for:
            raise RuntimeError("Resend indisponible")
        self.messages.append((to, email))


def test_every_template_renders_with_link_and_without_placeholders():
    for name in TEMPLATES:
        email = render(name, {"listing_label": "SaaS, Bretagne", "listing_id": "abc", "reason": "Nom visible"}, "https://site.fr/", "Claire")
        assert email.subject
        assert "https://site.fr/" in email.text
        assert "{" not in email.text and "{" not in email.html
        assert email.text.startswith("Bonjour Claire,")


def test_new_message_email_never_contains_message_content():
    email = render("new_message", {"content": "Le prix est de 300 k€"}, "https://site.fr")
    assert "300" not in email.text and "300" not in email.html
    assert "https://site.fr/messages" in email.text


def test_html_escapes_payload():
    email = render("listing_rejected", {"listing_label": "<b>SaaS</b>", "reason": "<script>x</script>"}, "https://site.fr")
    assert "<script>" not in email.html
    assert "&lt;script&gt;" in email.html


def test_send_pending_marks_sent_failed_and_unknown():
    items = [
        {"id": "1", "user_id": "u1", "template": "access_request", "payload": {"listing_label": "SaaS, Bretagne"}, "attempts": 0},
        {"id": "2", "user_id": "u2", "template": "access_approved", "payload": {"listing_label": "E-commerce", "listing_id": "L"}, "attempts": 2},
        {"id": "3", "user_id": "u3", "template": "inconnu", "payload": {}, "attempts": 0},
        {"id": "4", "user_id": "absent", "template": "new_message", "payload": {}, "attempts": 0},
    ]
    store = FakeStore(items, {"u1": {"email": "a@x.fr", "display_name": "Claire Martin"}, "u2": {"email": "b@x.fr"}, "u3": {"email": "c@x.fr"}})
    sender = FakeSender(fail_for="b@x.fr")
    sent = asyncio.run(send_pending(store, sender, "https://site.fr"))
    assert sent == 1
    assert store.sent == ["1"]
    assert sender.messages[0][1].text.startswith("Bonjour Claire,")
    failed = {email_id: attempts for email_id, attempts, _ in store.failed}
    assert failed == {"2": 3, "3": 5, "4": 5}
