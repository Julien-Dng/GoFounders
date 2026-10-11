from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

Role = Literal["entrepreneur", "talent", "buyer", "seller"]
Plan = Literal["FREE", "PRO", "PREMIUM"]

# Actions rapides proposées sous une réponse ; l'appli Angular les traduit en liens.
Action = Literal["completer_profil", "voir_recherche", "voir_messages", "voir_ma", "deposer_annonce", "voir_abonnement"]
ACTIONS: tuple[Action, ...] = (
    "completer_profil",
    "voir_recherche",
    "voir_messages",
    "voir_ma",
    "deposer_annonce",
    "voir_abonnement",
)

ROLE_LABELS: dict[str, str] = {
    "entrepreneur": "Porteur de projet",
    "talent": "Talent / Expert",
    "buyer": "Acheteur / Repreneur",
    "seller": "Vendeur M&A",
}

STAGE_LABELS: dict[str, str] = {"idea": "Idée", "mvp": "MVP", "growth": "En croissance", "established": "Établi"}

PROFILE_FIELDS = ("display_name", "location", "title", "bio", "photo_url", "skills", "looking_for", "availability_label")


class UserContext(BaseModel):
    """Données réelles de l'utilisateur injectées dans le prompt et affichées dans /coaching-ia."""

    display_name: str
    role: Role
    plan: Plan
    location: str | None = None
    title: str | None = None
    bio: str | None = None
    skills: list[str] = []
    looking_for: list[str] = []
    availability: str | None = None
    ma_access: bool = False
    ma_sector: str | None = None
    ma_budget: str | None = None
    ma_region: str | None = None
    profile_complete: int
    missing_fields: list[str] = []
    project_name: str | None = None
    project_sector: str | None = None
    project_stage: str | None = None
    project_looking_for: list[str] = []
    conversation_count: int
    new_conversations_this_week: int
    marketplace_pool: int
    own_listings: int = 0

    @property
    def role_label(self) -> str:
        return ROLE_LABELS[self.role]

    @classmethod
    def from_rows(
        cls,
        *,
        profile: dict[str, Any],
        project: dict[str, Any] | None,
        conversation_count: int,
        new_conversations_this_week: int,
        marketplace_pool: int,
        own_listings: int,
    ) -> "UserContext":
        labels = {
            "location": "localisation",
            "title": "titre",
            "bio": "bio",
            "photo_url": "photo",
            "skills": "compétences",
            "looking_for": "ce que vous recherchez",
            "availability_label": "disponibilité",
        }
        filled = [field for field in PROFILE_FIELDS if profile.get(field)]
        project = project or {}
        return cls(
            display_name=profile.get("display_name") or "Membre",
            role=profile["role"],
            plan=profile.get("plan") or "FREE",
            location=profile.get("location"),
            title=profile.get("title"),
            bio=profile.get("bio"),
            skills=profile.get("skills") or [],
            looking_for=profile.get("looking_for") or [],
            availability=profile.get("availability_label"),
            ma_access=bool(profile.get("ma_access")),
            ma_sector=profile.get("ma_sector"),
            ma_budget=profile.get("ma_budget"),
            ma_region=profile.get("ma_region"),
            profile_complete=round(len(filled) / len(PROFILE_FIELDS) * 100),
            missing_fields=[label for field, label in labels.items() if not profile.get(field)],
            project_name=project.get("name"),
            project_sector=project.get("sector"),
            project_stage=STAGE_LABELS.get(project.get("stage") or "", project.get("stage")),
            project_looking_for=project.get("looking_for") or [],
            conversation_count=conversation_count,
            new_conversations_this_week=new_conversations_this_week,
            marketplace_pool=marketplace_pool,
            own_listings=own_listings,
        )


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    messages: list[ChatTurn] = Field(min_length=1, max_length=40)

    @field_validator("messages")
    @classmethod
    def ends_with_user(cls, messages: list[ChatTurn]) -> list[ChatTurn]:
        if messages[0].role != "user" or messages[-1].role != "user":
            raise ValueError("La conversation doit commencer et finir par un message utilisateur")
        return messages


class ChatResponse(BaseModel):
    reply: str
    actions: list[Action] = []


class ContextItem(BaseModel):
    label: str
    value: str


class ContextResponse(BaseModel):
    profile: list[ContextItem]
    activity: list[ContextItem]
    suggested_questions: list[str]
