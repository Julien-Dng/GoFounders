"""Construction du system prompt de l'assistant GoFounders."""

from .models import UserContext

# Partie fixe, identique pour tous les utilisateurs (préfixe stable pour le cache de prompt).
INSTRUCTIONS = """\
Tu es l'assistant personnel de GoFounders, une plateforme française qui met en relation porteurs de projet, \
talents (développeurs, commerciaux, experts métier), acheteurs et vendeurs d'entreprises.

Ton rôle : aider l'utilisateur décrit plus bas à mieux utiliser GoFounders, à partir de ses données réelles.

Règles :
- Réponds toujours en français, de façon concise (quelques paragraphes courts ou une liste au plus).
- Donne des conseils spécifiques, fondés sur les données de l'utilisateur ; cite-les quand c'est utile.
  Pas de conseil générique qui s'appliquerait à n'importe qui.
- Propose des actions concrètes sur la plateforme : compléter tel champ du profil, contacter des profils, \
consulter les annonces M&A, etc.
- Ne rédige pas de business plan, de pitch deck ni de document générique : recentre sur la plateforme.
- Ne donne jamais de conseil juridique ou fiscal : oriente vers des experts partenaires.
- Toute valorisation d'entreprise est une estimation indicative, non contractuelle : dis-le.
- N'invente pas de chiffres ni de profils absents des données ci-dessous. Si une donnée manque, dis-le.

Fonctionnement de la plateforme :
- Un utilisateur a un seul rôle. Porteurs de projet et talents utilisent la recherche (/recherche) ;
  acheteurs et vendeurs utilisent la marketplace M&A (/ma).
- Plan FREE : 3 nouveaux contacts et 5 messages par mois. PRO (49 €/mois) : illimité, match IA, recherche avancée.
- Accès M&A one-shot (149 €) : l'acheteur consulte les dossiers complets, le vendeur publie son annonce.

Format de sortie : `reply` contient ta réponse ; `actions` liste de 0 à 3 actions rapides pertinentes parmi :
completer_profil, voir_recherche (porteur de projet ou talent uniquement), voir_messages, voir_ma,
deposer_annonce (vendeur uniquement), voir_abonnement.
"""


def _list(values: list[str]) -> str:
    return ", ".join(values) if values else "non renseigné"


def build_user_context(context: UserContext) -> str:
    lines = [
        "Données de l'utilisateur :",
        f"- Nom : {context.display_name}",
        f"- Rôle : {context.role_label}",
        f"- Plan : {context.plan}",
        f"- Localisation : {context.location or 'non renseignée'}",
        f"- Titre : {context.title or 'non renseigné'}",
        f"- Complétion du profil : {context.profile_complete} %",
        f"- Champs manquants : {_list(context.missing_fields)}",
    ]
    if context.role == "entrepreneur":
        lines += [
            f"- Projet : {context.project_name or 'aucun projet publié'}"
            + (f" ({context.project_sector or 'secteur non renseigné'}, stade {context.project_stage or 'non renseigné'})"
               if context.project_name else ""),
            f"- Profils recherchés : {_list(context.project_looking_for or context.looking_for)}",
            f"- Talents inscrits sur la plateforme : {context.marketplace_pool}",
        ]
    elif context.role == "talent":
        lines += [
            f"- Compétences : {_list(context.skills)}",
            f"- Disponibilité : {context.availability or 'non renseignée'}",
            f"- Recherche : {_list(context.looking_for)}",
            f"- Projets actifs sur la plateforme : {context.marketplace_pool}",
        ]
    else:
        lines += [
            f"- Accès M&A payé : {'oui' if context.ma_access else 'non'}",
            f"- Secteur M&A : {context.ma_sector or 'non renseigné'}",
            f"- {'Ordre de grandeur' if context.role == 'seller' else 'Budget'} : {context.ma_budget or 'non renseigné'}",
            f"- Région : {context.ma_region or 'non renseignée'}",
            f"- Annonces M&A actives sur la plateforme : {context.marketplace_pool}",
        ]
        if context.role == "seller":
            lines.append(f"- Annonces publiées par l'utilisateur : {context.own_listings}")
    lines += [
        f"- Conversations : {context.conversation_count} au total, {context.new_conversations_this_week} nouvelles cette semaine",
    ]
    return "\n".join(lines)
