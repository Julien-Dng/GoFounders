// Engagement de confidentialité (NDA) type accepté par un associé avant d'accéder à la partie confidentielle
// d'un projet. Source : document « Engagement de confidentialité GoFounders (NDA type) ».
//
// TEXTE PROVISOIRE : à faire valider par un avocat avant la mise en ligne.
// Toute modification du texte = nouvelle NDA_VERSION (la version acceptée est enregistrée comme preuve).

export const NDA_VERSION = 'v0-provisoire-2026-10-19';

// À compléter avec la dénomination de la société éditrice de GoFounders.
export const NDA_PUBLISHER = '[société éditrice de GoFounders]';

export interface NdaParties {
  ownerName: string;
  associateName: string;
  projectName: string;
}

export interface NdaArticle {
  title: string;
  paragraphs: string[];
}

export function ndaArticles(parties: NdaParties): NdaArticle[] {
  const { ownerName, associateName, projectName } = parties;

  return [
    {
      title: 'Parties et préambule',
      paragraphs: [
        `Entre ${ownerName}, porteur du projet « ${projectName} » (le Porteur de projet), et ${associateName} (l'Associé), tous deux utilisateurs de la plateforme GoFounders éditée par ${NDA_PUBLISHER} (GoFounders).`,
        "L'Associé souhaite étudier la possibilité de rejoindre le Projet, notamment en qualité d'associé, de co-fondateur ou de collaborateur (la Finalité). Le Porteur de projet accepte de lui communiquer des informations confidentielles à la condition que l'Associé s'engage à les garder secrètes et à ne les utiliser que pour la Finalité.",
      ],
    },
    {
      title: 'Article 1 – Informations confidentielles',
      paragraphs: [
        "Toutes les informations relatives au Projet communiquées par le Porteur de projet à l'Associé à compter de l'acceptation du présent engagement, quels qu'en soient la forme et le support : notamment la partie confidentielle de la fiche du Projet, le concept détaillé, le produit et son code, le savoir-faire, les données de marché, les clients, prospects et partenaires, les informations financières et la stratégie, ainsi que les échanges dans la messagerie GoFounders et lors des rendez-vous liés à la Finalité.",
      ],
    },
    {
      title: "Article 2 – Obligations de l'Associé",
      paragraphs: [
        "L'Associé s'engage à : garder les Informations confidentielles strictement secrètes et ne pas les communiquer à un tiers ; ne les utiliser que pour la Finalité ; ne pas développer ni exploiter, seul ou avec d'autres, un projet reprenant de façon substantielle les Informations confidentielles ; ne déposer aucun titre de propriété intellectuelle portant sur elles ; ne pas les copier ni en faire de captures, sauf ce qui est strictement nécessaire à la Finalité ; les protéger avec au moins le même soin que ses propres informations confidentielles ; ne les communiquer à ses conseils (avocat, expert-comptable) que s'ils sont tenus au secret ; prévenir sans délai le Porteur de projet de toute divulgation ou utilisation non autorisée.",
      ],
    },
    {
      title: 'Article 3 – Exceptions',
      paragraphs: [
        "Ces obligations ne s'appliquent pas aux informations dont l'Associé prouve qu'elles étaient déjà publiques ou le sont devenues sans faute de sa part, qu'il détenait déjà licitement sans obligation de confidentialité, qu'un tiers libre de les divulguer lui a transmises, ou qu'il a développées de façon indépendante. Une idée générale ou un concept largement connu ne devient pas confidentiel du seul fait qu'il figure dans le Projet.",
        "Si la loi ou une autorité impose une divulgation, l'Associé prévient le Porteur de projet dès que possible et ne divulgue que ce qui est strictement exigé.",
      ],
    },
    {
      title: 'Article 4 – Restitution, absence de droits et de contrat',
      paragraphs: [
        "À la demande du Porteur de projet, ou dès que l'Associé renonce à rejoindre le Projet, l'Associé cesse d'utiliser les Informations confidentielles et restitue ou détruit sous 15 jours les documents et copies qui les contiennent. La fin de l'accès sur GoFounders ne met pas fin à ses obligations.",
        "Les Informations confidentielles restent la propriété du Porteur de projet ; leur communication ne confère aucun droit ni licence à l'Associé. Le présent engagement n'oblige aucune Partie à conclure un accord d'association ou tout autre contrat ; une éventuelle entrée au capital sera négociée dans un document distinct.",
      ],
    },
    {
      title: 'Article 5 – Durée',
      paragraphs: [
        "Le présent engagement prend effet à son acceptation en ligne. Les obligations de confidentialité durent pendant les échanges entre les Parties puis pendant 3 ans après la dernière communication d'Informations confidentielles, et aussi longtemps qu'une information relève du secret des affaires (articles L. 151-1 et suivants du Code de commerce).",
      ],
    },
    {
      title: 'Article 6 – Manquement',
      paragraphs: [
        "Tout manquement engage la responsabilité de l'Associé et l'oblige à réparer l'intégralité du préjudice subi par le Porteur de projet, qui peut aussi demander en justice toute mesure pour faire cesser la divulgation ou l'utilisation non autorisée.",
      ],
    },
    {
      title: 'Article 7 – Rôle de GoFounders, preuve et données personnelles',
      paragraphs: [
        "GoFounders n'est pas partie au présent engagement : elle met ce modèle type à disposition et conserve la preuve de son acceptation. Elle ne fournit aucun conseil juridique et ne garantit ni l'exécution de l'engagement, ni l'issue d'un litige. Pour un accord sur mesure, les Parties peuvent être mises en relation avec les experts juridiques partenaires de GoFounders.",
        "L'acceptation en ligne a la même valeur qu'une signature manuscrite (articles 1366 et 1367 du Code civil). GoFounders enregistre l'identité des comptes, le Projet, la version du texte, la date et l'heure, l'adresse IP et le navigateur de l'Associé, et les conserve au moins 5 ans après la fin des obligations, pour la preuve, sur la base de l'intérêt légitime des Parties. Chaque Partie peut en obtenir une copie.",
      ],
    },
    {
      title: 'Article 8 – Droit applicable',
      paragraphs: [
        "Le présent engagement est soumis au droit français. Les Parties recherchent d'abord une solution amiable ; à défaut, le litige est porté devant la juridiction compétente selon les règles de droit commun. L'Associé agissant en tant que consommateur peut recourir gratuitement à un médiateur de la consommation.",
      ],
    },
  ];
}

export interface NdaProof {
  version: string;
  acceptedAt: string;
  ip?: string | null;
  userAgent?: string | null;
}

// Texte complet + preuve d'acceptation, pour le fichier téléchargeable par chaque Partie.
export function ndaProofDocument(parties: NdaParties, proof: NdaProof): string {
  const acceptedAt = new Date(proof.acceptedAt).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'medium' });
  const lines = [
    'ENGAGEMENT DE CONFIDENTIALITÉ — PREUVE D\'ACCEPTATION',
    '',
    `Projet : ${parties.projectName}`,
    `Porteur de projet : ${parties.ownerName}`,
    `Associé : ${parties.associateName}`,
    `Version du texte : ${proof.version}`,
    `Accepté le : ${acceptedAt}`,
    `Adresse IP : ${proof.ip || 'non enregistrée'}`,
    `Navigateur : ${proof.userAgent || 'non enregistré'}`,
    '',
    '----------------------------------------',
    '',
  ];

  for (const article of ndaArticles(parties)) {
    lines.push(article.title.toUpperCase(), '', ...article.paragraphs.flatMap(paragraph => [paragraph, '']));
  }

  lines.push('----------------------------------------', `Document généré par GoFounders. ${NDA_PUBLISHER}.`);
  return lines.join('\n');
}

export function downloadTextFile(fileName: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
