import { ProfileType } from '../models/user.model';

export interface MarketplaceProfile {
  id: string;
  profileType: ProfileType;
  displayName: string;
  title: string;
  location: string;
  stage: string;
  sector: string;
  bio: string;
  skills: string[];
  match: number;
  initials: string;
  photoURL?: string;
  availableNow: boolean;
  availabilityLabel: string;
  lookingFor: string[];
  about: string;
  projectSummary: string;
  experienceSummary: string;
  quickInfo: Array<{ label: string; value: string }>;
}

export interface ConversationMessage {
  id: string;
  senderId: 'me' | 'other';
  content: string;
  time: string;
}

export interface ConversationData {
  id: string;
  participantProfileId: string;
  participantName: string;
  participantInitials: string;
  participantRole: string;
  time: string;
  unread: number;
  isOnline: boolean;
  lastMessage: string;
  messages: ConversationMessage[];
}

export interface MaListingData {
  id: string;
  sector: string;
  region: string;
  type: string;
  revenue: string;
  margin: string;
  age: string;
  reason: string;
  priceMin: string;
  priceMax: string;
  summary: string;
  description: string;
  highlights: string[];
}

export const MARKETPLACE_PROFILES: MarketplaceProfile[] = [
  {
    id: 'talent-sophie-martin',
    profileType: 'talent',
    displayName: 'Sophie Martin',
    title: 'CTO freelance',
    location: 'Paris',
    stage: 'MVP',
    sector: 'Tech',
    bio: "Développeuse produit avec une forte expérience SaaS et des mises en production IA en environnement contraint.",
    skills: ['Angular', 'Firebase', 'IA', 'Architecture'],
    match: 95,
    initials: 'SM',
    availableNow: true,
    availabilityLabel: 'Disponible immédiatement',
    lookingFor: ['Produits SaaS B2B', 'Co-fondation technique', 'Stack moderne'],
    about:
      "J'accompagne des équipes fondatrices sur la construction de produits solides, de la première version au passage à l'échelle. J'aime intervenir là où la clarté produit et la qualité d'exécution technique doivent avancer ensemble.",
    projectSummary:
      "Je recherche des projets avec une vraie ambition produit, une vision claire du marché et une équipe prête à travailler de manière très pragmatique.",
    experienceSummary:
      "10 ans d'expérience en développement produit, architecture frontend et coordination avec des profils data, design et business.",
    quickInfo: [
      { label: 'Secteur favori', value: 'SaaS B2B / IA' },
      { label: 'Type de collaboration', value: 'Mission longue ou association' },
      { label: 'Disponibilité', value: '2 à 3 jours par semaine' },
      { label: 'Localisation', value: 'Paris et remote' },
    ],
  },
  {
    id: 'talent-thomas-dupont',
    profileType: 'talent',
    displayName: 'Thomas Dupont',
    title: 'Développeur full-stack',
    location: 'Lyon',
    stage: 'Idée',
    sector: 'Tech',
    bio: "Profil technique orienté exécution, très à l'aise sur les marketplaces, l'automatisation et les paiements.",
    skills: ['Node.js', 'Stripe', 'DevOps', 'React'],
    match: 92,
    initials: 'TD',
    availableNow: true,
    availabilityLabel: 'Disponible rapidement',
    lookingFor: ['Marketplace', 'Paiement', 'Produit early stage'],
    about:
      "J'aime faire avancer vite les premières versions et structurer ensuite une base propre. Mon terrain de jeu naturel, ce sont les produits transactionnels et les outils à forte logique métier.",
    projectSummary:
      "Je privilégie des équipes qui ont déjà clarifié le problème client et qui veulent tester vite sans bricoler durablement.",
    experienceSummary:
      "7 ans entre startup et freelance, avec plusieurs lancements de MVP, refontes techniques et intégrations Stripe.",
    quickInfo: [
      { label: 'Secteur favori', value: 'Marketplace / Fintech' },
      { label: 'Type de collaboration', value: 'Freelance long terme' },
      { label: 'Disponibilité', value: 'Temps plein à partir de juin' },
      { label: 'Localisation', value: 'Lyon et remote' },
    ],
  },
  {
    id: 'talent-claire-bernard',
    profileType: 'talent',
    displayName: 'Claire Bernard',
    title: 'Product manager',
    location: 'Bordeaux',
    stage: 'En croissance',
    sector: 'Tech',
    bio: "Expérience B2B SaaS, cadrage produit, discovery et priorisation de roadmap avec des équipes mixtes.",
    skills: ['Produit', 'UX', 'Analytics', 'Discovery'],
    match: 89,
    initials: 'CB',
    availableNow: false,
    availabilityLabel: 'Disponible sous 1 mois',
    lookingFor: ['Produit SaaS', 'B2B', 'Roadmap et traction'],
    about:
      "Je travaille à l'intersection du produit, de l'expérience utilisateur et de la mesure. Mon objectif est d'aider les équipes à prendre de meilleures décisions sans ralentir le delivery.",
    projectSummary:
      "Je cherche des projets qui ont déjà des retours utilisateurs ou une base clients à écouter pour structurer les prochaines priorités.",
    experienceSummary:
      "8 ans en product management sur des produits B2B SaaS, avec des contextes allant de l'amorçage à la scale-up.",
    quickInfo: [
      { label: 'Secteur favori', value: 'SaaS / Product-led growth' },
      { label: 'Type de collaboration', value: 'Temps partiel structurant' },
      { label: 'Disponibilité', value: 'À partir du mois prochain' },
      { label: 'Localisation', value: 'Bordeaux et remote' },
    ],
  },
  {
    id: 'talent-marc-laurent',
    profileType: 'talent',
    displayName: 'Marc Laurent',
    title: 'Commercial senior',
    location: 'Marseille',
    stage: 'Établi',
    sector: 'Commerce',
    bio: "Habitué des cycles de vente complexes et des premières structurations sales dans des contextes B2B.",
    skills: ['Sales', 'Négociation', 'B2B', 'Closing'],
    match: 87,
    initials: 'ML',
    availableNow: true,
    availabilityLabel: 'Disponible immédiatement',
    lookingFor: ['Go-to-market', 'Commercial B2B', 'Acquisition'],
    about:
      "J'aide les fondateurs à transformer un bon produit en traction commerciale plus régulière. Mon approche combine prospection, process et discours de vente.",
    projectSummary:
      "Je cherche des équipes avec un produit déjà validé ou un début de traction, qui ont besoin d'accélérer côté acquisition et closing.",
    experienceSummary:
      "12 ans d'expérience commerciale sur des cycles complexes, du premier SDR au pilotage d'une petite équipe commerciale.",
    quickInfo: [
      { label: 'Secteur favori', value: 'B2B services / SaaS' },
      { label: 'Type de collaboration', value: 'Mission ou co-construction' },
      { label: 'Disponibilité', value: 'Immédiate' },
      { label: 'Localisation', value: 'Marseille et déplacements' },
    ],
  },
  {
    id: 'talent-emma-rousseau',
    profileType: 'talent',
    displayName: 'Emma Rousseau',
    title: 'Designer UI/UX',
    location: 'Toulouse',
    stage: 'MVP',
    sector: 'Marketing',
    bio: "Designer orientée conversion, parcours clairs et design systems maintenables pour équipes produit compactes.",
    skills: ['Figma', 'Branding', 'Design System', 'UX Research'],
    match: 84,
    initials: 'ER',
    availableNow: true,
    availabilityLabel: 'Disponible rapidement',
    lookingFor: ['Produit early stage', 'Refonte UX', 'Conversion'],
    about:
      "Je conçois des interfaces utiles, lisibles et prêtes à être industrialisées. J'aime travailler avec des équipes qui veulent passer d'un produit 'correct' à une expérience vraiment convaincante.",
    projectSummary:
      "Je recherche des produits qui ont besoin de mieux raconter leur valeur et de rendre leurs parcours plus fluides.",
    experienceSummary:
      "6 ans entre agences et produits SaaS, avec un vrai focus sur l'UX, les composants et la cohérence de marque.",
    quickInfo: [
      { label: 'Secteur favori', value: 'SaaS / Formation / Marketplace' },
      { label: 'Type de collaboration', value: 'Sprint ou accompagnement' },
      { label: 'Disponibilité', value: 'Sous 2 semaines' },
      { label: 'Localisation', value: 'Toulouse et remote' },
    ],
  },
  {
    id: 'talent-alexandre-petit',
    profileType: 'talent',
    displayName: 'Alexandre Petit',
    title: 'Growth marketer',
    location: 'Nantes',
    stage: 'En croissance',
    sector: 'Marketing',
    bio: "Acquisition, rétention et expérimentation pour passer de zéro à un début de traction mesurable.",
    skills: ['SEO', 'Ads', 'Growth', 'CRM'],
    match: 82,
    initials: 'AP',
    availableNow: false,
    availabilityLabel: 'Disponible sous 3 semaines',
    lookingFor: ['Traction', 'Acquisition', 'Growth loops'],
    about:
      "Je travaille sur les bons canaux au bon moment, avec une obsession simple : obtenir des apprentissages actionnables rapidement.",
    projectSummary:
      "Je privilégie les équipes prêtes à tester, mesurer et arbitrer sans se raconter d'histoires sur l'acquisition.",
    experienceSummary:
      "8 ans en growth, SEO, paid et CRM sur des produits digitaux en lancement et en croissance.",
    quickInfo: [
      { label: 'Secteur favori', value: 'SaaS / D2C / Marketplace' },
      { label: 'Type de collaboration', value: 'Mission à impact court terme' },
      { label: 'Disponibilité', value: 'À partir de juillet' },
      { label: 'Localisation', value: 'Nantes et remote' },
    ],
  },
  {
    id: 'talent-julie-moreau',
    profileType: 'talent',
    displayName: 'Julie Moreau',
    title: 'Data scientist',
    location: 'Lille',
    stage: 'Idée',
    sector: 'Santé',
    bio: "Machine learning appliqué à des cas concrets, avec une vraie culture produit et une exigence de clarté.",
    skills: ['Python', 'ML', 'Data Viz', 'MLOps'],
    match: 79,
    initials: 'JM',
    availableNow: true,
    availabilityLabel: 'Disponible immédiatement',
    lookingFor: ['IA utile', 'Santé', 'Cas d’usage métier'],
    about:
      "Je transforme des sujets data parfois flous en solutions compréhensibles, testables et déployables. J'aime les équipes qui veulent utiliser l'IA de façon concrète plutôt que comme argument marketing.",
    projectSummary:
      "Je recherche des projets avec une vraie matière métier, des données exploitables ou une hypothèse d'usage forte.",
    experienceSummary:
      "5 ans entre data science appliquée, prototypage de modèles et accompagnement produit dans des contextes complexes.",
    quickInfo: [
      { label: 'Secteur favori', value: 'Santé / IA appliquée' },
      { label: 'Type de collaboration', value: 'Mission ou conseil' },
      { label: 'Disponibilité', value: 'Immédiate' },
      { label: 'Localisation', value: 'Lille et remote' },
    ],
  },
  {
    id: 'projet-healthpilot',
    profileType: 'entrepreneur',
    displayName: 'HealthPilot',
    title: 'Fondatrice · Sophie Bernard',
    location: 'Paris',
    stage: 'MVP',
    sector: 'Santé',
    bio: "Assistant clinique basé sur l'IA pour faire gagner du temps aux professionnels de santé.",
    skills: ['Recherche CTO', 'Santé', 'B2B SaaS'],
    match: 96,
    initials: 'HP',
    availableNow: true,
    availabilityLabel: 'Équipe en recrutement',
    lookingFor: ['CTO', 'Expert IA', 'Co-fondation'],
    about:
      "HealthPilot aide les praticiens à réduire le temps administratif et à mieux préparer certaines décisions cliniques sans dégrader la qualité. Le besoin terrain a déjà été validé auprès d'un premier cercle d'utilisateurs.",
    projectSummary:
      "Le produit est en MVP avec des retours très encourageants. L'objectif des prochains mois est de sécuriser la stack, fiabiliser les premiers cas d'usage et accélérer les déploiements pilotes.",
    experienceSummary:
      "La fondatrice vient du product management en healthtech et a déjà piloté plusieurs lancements B2B dans des environnements réglementés.",
    quickInfo: [
      { label: 'Secteur', value: 'Santé / SaaS' },
      { label: 'Stade', value: 'MVP validé' },
      { label: 'Recherche', value: 'CTO / associé technique' },
      { label: 'Collaboration', value: 'Co-fondation ou implication forte' },
    ],
  },
  {
    id: 'projet-greenbox',
    profileType: 'entrepreneur',
    displayName: 'GreenBox',
    title: 'Fondateur · Thomas Leroy',
    location: 'Lyon',
    stage: 'Idée',
    sector: 'Commerce',
    bio: "Solution logistique responsable pour commerces locaux avec une vraie composante terrain.",
    skills: ['Recherche sales', 'Ops', 'Marketplace'],
    match: 91,
    initials: 'GB',
    availableNow: true,
    availabilityLabel: 'Équipe ouverte aux échanges',
    lookingFor: ['Co-fondateur sales', 'Ops', 'Produit'],
    about:
      "GreenBox veut simplifier la logistique locale pour des commerçants qui veulent mieux mutualiser leurs flux sans perdre en qualité de service. Le sujet est très opérationnel et fortement ancré dans le réel.",
    projectSummary:
      "Le projet en est à la phase de cadrage et de validation terrain. L'enjeu est de transformer des signaux encourageants en modèle opérable.",
    experienceSummary:
      "Le fondateur a un profil business et opérations, avec une bonne compréhension des problématiques de distribution locale.",
    quickInfo: [
      { label: 'Secteur', value: 'Commerce / logistique' },
      { label: 'Stade', value: 'Idée avec validation terrain' },
      { label: 'Recherche', value: 'Sales / Ops / produit' },
      { label: 'Collaboration', value: 'Temps partiel évolutif' },
    ],
  },
  {
    id: 'projet-datanest',
    profileType: 'entrepreneur',
    displayName: 'DataNest',
    title: 'Fondatrice · Claire Renaud',
    location: 'Bordeaux',
    stage: 'En croissance',
    sector: 'Tech',
    bio: "Plateforme d'analyse pour PME qui veulent centraliser leurs KPIs sans lourdeur technique.",
    skills: ['Produit', 'Frontend', 'Customer success'],
    match: 88,
    initials: 'DN',
    availableNow: false,
    availabilityLabel: 'Reprise des échanges le mois prochain',
    lookingFor: ['Frontend senior', 'Product designer', 'Customer success'],
    about:
      "DataNest simplifie l'accès à des tableaux de bord utiles pour des PME qui n'ont pas d'équipe data. La traction commerciale est là, mais l'expérience produit doit maintenant passer un cap.",
    projectSummary:
      "L'équipe cherche à rendre l'outil plus fluide, plus lisible et mieux adapté à des clients non techniques.",
    experienceSummary:
      "La fondatrice a un parcours data et produit, avec une forte culture client et un vrai souci de pédagogie.",
    quickInfo: [
      { label: 'Secteur', value: 'Tech / data' },
      { label: 'Stade', value: 'Croissance' },
      { label: 'Recherche', value: 'Frontend / design / CS' },
      { label: 'Collaboration', value: 'Mission ou recrutement' },
    ],
  },
  {
    id: 'projet-fleetflow',
    profileType: 'entrepreneur',
    displayName: 'FleetFlow',
    title: 'Fondateur · Mehdi Amrani',
    location: 'Marseille',
    stage: 'Établi',
    sector: 'Industrie',
    bio: "Outil de pilotage de flotte déjà commercialisé, en recherche de renfort growth.",
    skills: ['Growth', 'B2B', 'SaaS'],
    match: 85,
    initials: 'FF',
    availableNow: true,
    availabilityLabel: 'Entretiens en cours',
    lookingFor: ['Growth', 'Marketing B2B', 'RevOps'],
    about:
      "FleetFlow aide des gestionnaires de flotte à suivre leur activité, mieux anticiper leurs coûts et gagner en visibilité opérationnelle.",
    projectSummary:
      "Le produit est installé, les clients sont là, et l'équipe veut maintenant rendre l'acquisition plus régulière et le pilotage commercial plus précis.",
    experienceSummary:
      "Le fondateur vient des opérations terrain avec une vraie compréhension des contraintes industrie et transport.",
    quickInfo: [
      { label: 'Secteur', value: 'Industrie / mobilité' },
      { label: 'Stade', value: 'Établi' },
      { label: 'Recherche', value: 'Growth / revops' },
      { label: 'Collaboration', value: 'Freelance ou recrutement' },
    ],
  },
  {
    id: 'projet-eduspark',
    profileType: 'entrepreneur',
    displayName: 'EduSpark',
    title: 'Fondatrice · Nora Lemoine',
    location: 'Toulouse',
    stage: 'MVP',
    sector: 'Éducation',
    bio: "Parcours de formation hybride pour aider les indépendants à monter en compétences plus vite.",
    skills: ['Design', 'Produit', 'No-code'],
    match: 83,
    initials: 'ES',
    availableNow: true,
    availabilityLabel: 'Échanges ouverts',
    lookingFor: ['Designer', 'No-code builder', 'Produit'],
    about:
      "EduSpark veut rendre la montée en compétences plus simple pour des indépendants qui manquent de temps et de repères.",
    projectSummary:
      "Le MVP existe et les premiers utilisateurs confirment l'intérêt. Le besoin principal est d'améliorer l'expérience et la conversion sur les parcours clés.",
    experienceSummary:
      "La fondatrice a déjà lancé plusieurs programmes de formation et connaît très bien ses utilisateurs finaux.",
    quickInfo: [
      { label: 'Secteur', value: 'Éducation / formation' },
      { label: 'Stade', value: 'MVP en test' },
      { label: 'Recherche', value: 'Design / produit / no-code' },
      { label: 'Collaboration', value: 'Temps partiel structurant' },
    ],
  },
  {
    id: 'projet-atelier-local',
    profileType: 'entrepreneur',
    displayName: 'Atelier Local',
    title: 'Fondateur · Hugo Perez',
    location: 'Nantes',
    stage: 'Idée',
    sector: 'Commerce',
    bio: "Réseau de producteurs locaux avec une expérience d'achat plus simple, plus lisible et plus humaine.",
    skills: ['Marketplace', 'Operations', 'Branding'],
    match: 80,
    initials: 'AL',
    availableNow: false,
    availabilityLabel: 'Échanges à partir du mois prochain',
    lookingFor: ['Marketplace', 'Ops', 'Branding'],
    about:
      "Atelier Local veut mieux connecter des producteurs et des acheteurs de proximité grâce à une expérience plus lisible et un modèle plus simple à activer localement.",
    projectSummary:
      "Le projet est en phase de cadrage, avec un vrai travail à faire sur l'offre, la preuve marché et les parcours d'usage.",
    experienceSummary:
      "Le fondateur connaît bien les circuits courts et les contraintes opérationnelles des acteurs locaux.",
    quickInfo: [
      { label: 'Secteur', value: 'Commerce local' },
      { label: 'Stade', value: 'Idée structurée' },
      { label: 'Recherche', value: 'Ops / marketplace / marque' },
      { label: 'Collaboration', value: 'Association ou mission' },
    ],
  },
  {
    id: 'projet-finloop',
    profileType: 'entrepreneur',
    displayName: 'Finloop',
    title: 'Fondatrice · Sarah Cohen',
    location: 'Lille',
    stage: 'En croissance',
    sector: 'Finance',
    bio: "Application de pilotage de trésorerie pour indépendants avec une approche simple et actionnable.",
    skills: ['Data', 'Produit', 'Finance'],
    match: 78,
    initials: 'FL',
    availableNow: true,
    availabilityLabel: 'Équipe en structuration',
    lookingFor: ['Data', 'Produit', 'Growth'],
    about:
      "Finloop aide des indépendants à reprendre le contrôle sur leur trésorerie avec des indicateurs concrets et des recommandations simples.",
    projectSummary:
      "Le produit progresse bien, mais l'équipe veut maintenant mieux structurer sa roadmap data et la lisibilité des parcours.",
    experienceSummary:
      "La fondatrice a un profil finance et ops, avec une forte sensibilité produit et pédagogie client.",
    quickInfo: [
      { label: 'Secteur', value: 'Finance / SaaS' },
      { label: 'Stade', value: 'Croissance' },
      { label: 'Recherche', value: 'Data / produit / growth' },
      { label: 'Collaboration', value: 'Mission ou CDI' },
    ],
  },
];

export const CONVERSATIONS: ConversationData[] = [
  {
    id: 'talent-sophie-martin',
    participantProfileId: 'talent-sophie-martin',
    participantName: 'Sophie Martin',
    participantInitials: 'SM',
    participantRole: 'CTO freelance',
    time: '14:32',
    unread: 2,
    isOnline: true,
    lastMessage: "Bonjour, votre projet m'intéresse beaucoup.",
    messages: [
      { id: 'msg-1', senderId: 'other', content: "Bonjour ! Votre projet m'intéresse beaucoup.", time: '14:30' },
      { id: 'msg-2', senderId: 'me', content: "Merci, ravi de lire ça. Vous êtes disponible cette semaine ?", time: '14:31' },
      { id: 'msg-3', senderId: 'other', content: "Oui, avec plaisir. Je peux me libérer jeudi après-midi.", time: '14:32' },
    ],
  },
  {
    id: 'talent-marc-laurent',
    participantProfileId: 'talent-marc-laurent',
    participantName: 'Marc Laurent',
    participantInitials: 'ML',
    participantRole: 'Commercial senior',
    time: 'Hier',
    unread: 0,
    isOnline: false,
    lastMessage: 'Quand êtes-vous disponible pour un échange ?',
    messages: [
      { id: 'msg-4', senderId: 'other', content: "Bonjour, votre recherche côté acquisition m'intéresse.", time: '11:18' },
      { id: 'msg-5', senderId: 'me', content: 'Merci Marc, votre profil semble très aligné avec notre phase actuelle.', time: '11:25' },
      { id: 'msg-6', senderId: 'other', content: 'Quand êtes-vous disponible pour un échange ?', time: '11:31' },
    ],
  },
];

export const MA_LISTINGS: MaListingData[] = [
  {
    id: 'MA-001',
    sector: 'E-commerce',
    region: 'Île-de-France',
    type: 'Cession',
    revenue: '280 k€/an',
    margin: '22 %',
    age: '7 ans',
    reason: 'Retraite du dirigeant',
    priceMin: '350 k€',
    priceMax: '420 k€',
    summary: 'Boutique en ligne de produits bio avec une base clients fidèle et une marque bien installée.',
    description:
      "L'activité repose sur une marque reconnue sur sa niche, une acquisition maîtrisée et une logistique déjà structurée. Le repreneur récupère une base clients récurrente, des process documentés et une activité rentable immédiatement exploitable.",
    highlights: ['Marque établie', 'Base clients fidèle', 'Opérations déjà structurées'],
  },
  {
    id: 'MA-002',
    sector: 'SaaS',
    region: 'Auvergne-Rhône-Alpes',
    type: 'Parts sociales',
    revenue: '450 k€/an',
    margin: '35 %',
    age: '4 ans',
    reason: 'Pivot vers un nouveau projet',
    priceMin: '800 k€',
    priceMax: '1,2 M€',
    summary: 'Plateforme B2B SaaS avec 120 clients récurrents et une croissance stable.',
    description:
      "L'entreprise commercialise un produit B2B SaaS sur abonnement avec une base clients récurrente, un churn contenu et une équipe compacte. Le repreneur bénéficie d'un produit mûr, de revenus récurrents et de leviers de croissance déjà identifiés.",
    highlights: ['120 clients récurrents', 'Produit mûr', 'Croissance stable'],
  },
  {
    id: 'MA-003',
    sector: 'Restauration',
    region: "Provence-Alpes-Côte d'Azur",
    type: 'Fonds de commerce',
    revenue: '320 k€/an',
    margin: '18 %',
    age: '12 ans',
    reason: 'Reconversion professionnelle',
    priceMin: '280 k€',
    priceMax: '350 k€',
    summary: 'Restaurant établi avec emplacement premium et clientèle régulière.',
    description:
      "L'établissement bénéficie d'une excellente visibilité locale, d'une clientèle régulière et d'une équipe autonome. Le positionnement est clair et la reprise peut se faire avec une continuité d'exploitation rapide.",
    highlights: ['Emplacement premium', 'Clientèle régulière', 'Équipe autonome'],
  },
  {
    id: 'MA-004',
    sector: 'Services B2B',
    region: 'Nouvelle-Aquitaine',
    type: 'Cession',
    revenue: '180 k€/an',
    margin: '28 %',
    age: '5 ans',
    reason: "Déménagement à l'étranger",
    priceMin: '200 k€',
    priceMax: '280 k€',
    summary: 'Agence de consulting RH avec contrats récurrents et très bonne réputation.',
    description:
      "L'activité s'appuie sur un portefeuille récurrent et une forte recommandation client. Le positionnement est bien identifié et l'entreprise peut intéresser un repreneur opérateur ou un acteur qui veut compléter son offre.",
    highlights: ['Contrats récurrents', 'Bonne réputation', 'Positionnement clair'],
  },
  {
    id: 'MA-005',
    sector: 'E-commerce',
    region: 'Occitanie',
    type: 'Parts sociales',
    revenue: '520 k€/an',
    margin: '25 %',
    age: '6 ans',
    reason: 'Focus sur activité principale',
    priceMin: '650 k€',
    priceMax: '780 k€',
    summary: 'Marketplace niche avec forte notoriété et automatisation avancée.',
    description:
      "La société a construit une belle notoriété sur un segment spécialisé et opère avec un niveau d'automatisation élevé. Les fondamentaux sont sains et l'acquéreur peut accélérer via développement commercial ou extension d'offre.",
    highlights: ['Notoriété forte', 'Automatisation avancée', 'Potentiel d’extension'],
  },
  {
    id: 'MA-006',
    sector: 'Commerce de détail',
    region: 'Hauts-de-France',
    type: 'Fonds de commerce',
    revenue: '380 k€/an',
    margin: '20 %',
    age: '15 ans',
    reason: 'Retraite anticipée',
    priceMin: '420 k€',
    priceMax: '520 k€',
    summary: 'Boutique physique avec local commercial en propriété et équipe déjà formée.',
    description:
      "Le commerce profite d'un ancrage local fort, d'une activité stable et d'un local bien situé. La reprise est facilitée par une organisation rodée et une équipe qui connaît bien le fonctionnement quotidien.",
    highlights: ['Local bien situé', 'Équipe formée', 'Activité stable'],
  },
];

export function findMarketplaceProfileById(profileId: string): MarketplaceProfile | undefined {
  return MARKETPLACE_PROFILES.find(profile => profile.id === profileId);
}

export function findConversationById(conversationId: string): ConversationData | undefined {
  return CONVERSATIONS.find(conversation => conversation.id === conversationId);
}

export function findMaListingById(listingId: string): MaListingData | undefined {
  return MA_LISTINGS.find(listing => listing.id === listingId);
}
