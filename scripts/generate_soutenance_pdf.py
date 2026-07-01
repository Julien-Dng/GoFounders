from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


OUTPUT_DIR = Path("docs")
PDF_PATH = OUTPUT_DIR / "soutenance_guide_stage_L3.pdf"

NAVY = colors.HexColor("#0B2545")
BLUE = colors.HexColor("#2563EB")
SOFT_BLUE = colors.HexColor("#EAF2FF")
HEADER_BLUE = colors.HexColor("#DCEBFF")
LIGHT_GRAY = colors.HexColor("#F6F8FB")
GRID = colors.HexColor("#CBD5E1")
MUTED = colors.HexColor("#64748B")
WHITE = colors.white


def make_styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "TitleCustom",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=27,
            textColor=NAVY,
            alignment=TA_LEFT,
            spaceAfter=8,
        ),
        "subtitle": ParagraphStyle(
            "SubtitleCustom",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=14,
            textColor=MUTED,
            spaceAfter=14,
        ),
        "h1": ParagraphStyle(
            "H1Custom",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=15,
            leading=19,
            textColor=BLUE,
            spaceBefore=14,
            spaceAfter=8,
        ),
        "h2": ParagraphStyle(
            "H2Custom",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=15,
            textColor=NAVY,
            spaceBefore=10,
            spaceAfter=5,
        ),
        "body": ParagraphStyle(
            "BodyCustom",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.7,
            leading=13.2,
            textColor=colors.HexColor("#1E293B"),
            spaceAfter=6,
        ),
        "small": ParagraphStyle(
            "SmallCustom",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.4,
            leading=11,
            textColor=colors.HexColor("#334155"),
        ),
        "table_header": ParagraphStyle(
            "TableHeaderCustom",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=8.6,
            leading=10.5,
            textColor=NAVY,
            alignment=TA_CENTER,
        ),
        "table": ParagraphStyle(
            "TableCustom",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.4,
            leading=10.5,
            textColor=colors.HexColor("#1E293B"),
        ),
        "callout_label": ParagraphStyle(
            "CalloutLabel",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=9.5,
            leading=12,
            textColor=NAVY,
        ),
        "footer": ParagraphStyle(
            "Footer",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8,
            textColor=MUTED,
            alignment=TA_CENTER,
        ),
    }


def p(text: str, style: ParagraphStyle):
    return Paragraph(text.replace("\n", "<br/>"), style)


def bullet_list(items: list[str], styles):
    return ListFlowable(
        [ListItem(p(item, styles["body"]), leftIndent=12) for item in items],
        bulletType="bullet",
        start="circle",
        leftIndent=16,
        bulletFontName="Helvetica",
        bulletFontSize=7,
    )


def checklist(items: list[str], styles):
    return ListFlowable(
        [ListItem(p(f"[ ] {item}", styles["body"]), leftIndent=12) for item in items],
        bulletType="bullet",
        start="circle",
        leftIndent=16,
        bulletFontName="Helvetica",
        bulletFontSize=7,
    )


def table(data: list[list[str]], widths: list[float], styles, header=True):
    wrapped = []
    for row_index, row in enumerate(data):
        wrapped_row = []
        for cell in row:
            wrapped_row.append(p(cell, styles["table_header"] if header and row_index == 0 else styles["table"]))
        wrapped.append(wrapped_row)

    t = Table(wrapped, colWidths=[w * cm for w in widths], repeatRows=1 if header else 0)
    commands = [
        ("GRID", (0, 0), (-1, -1), 0.4, GRID),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    if header:
        commands.extend([
            ("BACKGROUND", (0, 0), (-1, 0), HEADER_BLUE),
            ("TEXTCOLOR", (0, 0), (-1, 0), NAVY),
        ])
    t.setStyle(TableStyle(commands))
    return t


def callout(label: str, body: str, styles):
    data = [[p(label, styles["callout_label"])], [p(body, styles["body"])]]
    t = Table(data, colWidths=[17.2 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_GRAY),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#D8E0EA")),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return t


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawCentredString(A4[0] / 2, 0.65 * cm, f"Guide de préparation - stage L3 informatique - page {doc.page}")
    canvas.restoreState()


def build_pdf():
    OUTPUT_DIR.mkdir(exist_ok=True)
    styles = make_styles()
    doc = SimpleDocTemplate(
        str(PDF_PATH),
        pagesize=A4,
        rightMargin=1.55 * cm,
        leftMargin=1.55 * cm,
        topMargin=1.45 * cm,
        bottomMargin=1.25 * cm,
        title="Guide de préparation - soutenance stage L3 informatique",
    )

    story = []
    story.append(p("Guide de préparation - rapport et soutenance de stage L3 informatique", styles["title"]))
    story.append(p("Document de synthèse à compléter pour préparer le rapport/formulaire et le support oral PDF.", styles["subtitle"]))
    story.append(callout(
        "Objectif",
        "Regrouper les éléments attendus par les consignes : informations du stage, missions réalisées, résultats, technologies, bibliographie, plan de présentation et checklist finale.",
        styles,
    ))
    story.append(Spacer(1, 8))

    story.append(p("1. Informations à renseigner", styles["h1"]))
    story.append(table([
        ["Élément", "A préparer / à renseigner"],
        ["Stagiaire", "[Nom, prénom, parcours : ASR / CILS / MIAGE]"],
        ["Entreprise", "[Nom de l'entreprise, secteur, activité principale]"],
        ["Tuteur / tutrice", "[Nom, fonction, rôle dans le suivi du stage]"],
        ["Dates", "Mai 2026 - juillet 2026, à ajuster selon la convention."],
        ["Intitulé du stage", "[Titre officiel figurant sur l'offre ou la convention]"],
        ["Sujet initial", "[Sujet présenté au départ, en 4 à 5 lignes rédigées]"],
    ], [4.1, 13.1], styles))

    story.append(p("2. Ce que les consignes demandent pour le rapport", styles["h1"]))
    story.append(p(
        "Le rapport est un formulaire synthétique destiné aux enseignants évaluateurs. Les réponses doivent être rédigées sous forme de phrases, pas sous forme de mots-clés isolés.",
        styles["body"],
    ))
    story.append(table([
        ["Rubrique", "Contenu attendu", "Volume conseillé"],
        ["Contexte", "Expliquer l'existant, les contraintes et le cadre du stage.", "5 à 10 lignes"],
        ["Équipe d'accueil", "Présenter l'organisation, les interactions, les outils de travail et le suivi.", "5 à 10 lignes"],
        ["Missions réalisées", "Décrire les missions en ordre chronologique, même si elles ont évolué.", "20 à 30 lignes"],
        ["Missions principales", "Détailler les travaux les plus représentatifs.", "10 à 20 lignes"],
        ["Résultats obtenus", "Présenter les livrables, corrections, fonctionnalités ou apprentissages concrets.", "10 à 20 lignes"],
        ["Bilan et perspectives", "Faire le bilan professionnel et expliquer l'intérêt pour l'entreprise.", "10 à 15 lignes"],
        ["Technologies", "Lister les outils et expliquer leur rôle dans les missions.", "5 à 10 lignes"],
        ["Bibliographie", "Citer documentation, sites, cours, pages techniques utiles, avec commentaire.", "10 à 20 lignes"],
    ], [3.3, 10.3, 3.6], styles))

    story.append(PageBreak())
    story.append(p("3. Missions à valoriser dans ton stage", styles["h1"]))
    story.append(table([
        ["Bloc", "Travail à présenter", "Preuves / captures possibles"],
        ["Analyse et UX/UI", "Recueil des besoins, conception de l'architecture logicielle, réalisation de maquettes Figma.", "Maquettes, schéma d'architecture, liste des besoins, choix UX."],
        ["Développement front-end", "Intégration d'interfaces utilisateur en HTML5, CSS3, JavaScript et Angular.", "Captures d'écran avant/après, composants, pages, responsive."],
        ["Développement back-end", "Création de la base de données, développement d'API et de la logique serveur.", "Modèle de données, endpoints, flux client/serveur, règles de sécurité."],
        ["Tests et déploiement", "Réalisation de tests unitaires, vérifications fonctionnelles et mise en production.", "Résultats de tests, procédure de déploiement, environnement cible."],
    ], [3.5, 7.7, 6.0], styles))

    story.append(p("4. Plan conseillé pour la soutenance orale de 15 minutes", styles["h1"]))
    story.append(p(
        "La soutenance doit être claire, fluide et cohérente. Le support doit rester sobre, numéroté, au format PDF, sans vidéo ni animation. Prévoir des captures plutôt qu'une démonstration en direct.",
        styles["body"],
    ))
    story.append(table([
        ["Diapo", "Contenu", "Temps"],
        ["1", "Titre, nom, entreprise, dates, tuteur.", "0:45"],
        ["2", "Contexte de l'entreprise et besoin initial.", "1:15"],
        ["3", "Sujet de stage, objectifs et périmètre.", "1:30"],
        ["4", "Organisation du travail, méthode, outils, interactions.", "1:15"],
        ["5", "Analyse, UX/UI, architecture et maquettes.", "2:00"],
        ["6", "Développement front-end Angular et intégration des interfaces.", "2:00"],
        ["7", "Back-end, base de données, API et logique serveur.", "2:00"],
        ["8", "Tests, correction, déploiement et qualité.", "1:30"],
        ["9", "Résultats obtenus, limites et difficultés rencontrées.", "1:30"],
        ["10", "Bilan professionnel, compétences acquises, perspectives.", "1:15"],
    ], [1.35, 13.2, 2.65], styles))

    story.append(PageBreak())
    story.append(p("5. Checklist des éléments à préparer", styles["h1"]))
    story.append(p("Pour le rapport / formulaire", styles["h2"]))
    story.append(checklist([
        "Rédiger le sujet initial en 5 lignes maximum.",
        "Rédiger le contexte du stage avec l'existant et les contraintes.",
        "Décrire l'équipe d'accueil et les interactions professionnelles.",
        "Lister les missions réalisées dans l'ordre chronologique.",
        "Détailler 2 ou 3 missions principales avec résultats concrets.",
        "Préparer une liste de technologies avec leur rôle précis.",
        "Préparer une bibliographie commentée : Angular, TypeScript, Firebase, documentation API, outils utilisés, cours, etc.",
    ], styles))
    story.append(Spacer(1, 4))
    story.append(p("Pour le support de soutenance", styles["h2"]))
    story.append(checklist([
        "Créer un support PDF uniquement, sans animation ni vidéo.",
        "Numéroter toutes les diapositives.",
        "Limiter le texte : mots-clés, captures, schémas, tableaux courts.",
        "Prévoir au moins une capture ou un schéma pour chaque mission importante.",
        "Ne pas faire de démonstration en direct : utiliser des captures commentées.",
        "Répéter la présentation plusieurs fois pour respecter les 15 minutes.",
        "Préparer 5 à 8 questions possibles du jury avec réponses courtes.",
    ], styles))

    story.append(p("6. Formulations courtes réutilisables", styles["h1"]))
    story.append(table([
        ["Usage", "Formulation possible"],
        ["Mission générale", "Participation au développement, à l'amélioration et à la mise en qualité d'applications web dans un contexte professionnel."],
        ["Front-end", "Intégration d'interfaces utilisateur responsives avec Angular, HTML5, CSS3 et TypeScript."],
        ["Back-end / données", "Contribution à la structuration des données, à la logique serveur et aux échanges entre le client et le serveur."],
        ["Qualité", "Réalisation de tests, corrections fonctionnelles, vérifications de routage et préparation au déploiement."],
        ["Bilan", "Ce stage m'a permis de renforcer mes compétences techniques tout en découvrant les contraintes d'un projet réel : besoins utilisateurs, priorisation, qualité, documentation et livraison."],
    ], [4.0, 13.2], styles))

    story.append(p("7. Questions possibles du jury", styles["h1"]))
    story.append(bullet_list([
        "Pourquoi avoir choisi cette architecture logicielle ?",
        "Quelles difficultés techniques as-tu rencontrées et comment les as-tu résolues ?",
        "Comment as-tu vérifié que les fonctionnalités développées fonctionnaient correctement ?",
        "Quels choix UX/UI ont été faits pour améliorer l'expérience utilisateur ?",
        "Quelles limites restent à corriger ou améliorer après ton stage ?",
        "Quelles compétences as-tu le plus développées pendant cette période ?",
    ], styles))

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(PDF_PATH.resolve())


if __name__ == "__main__":
    build_pdf()
