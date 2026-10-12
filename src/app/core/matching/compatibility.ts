// Score de compatibilité entre un projet (ce qu'il recherche) et un talent (ce qu'il propose).
// Calcul par règles, sans IA : déterministe, gratuit et explicable par des raisons affichées.

export interface ProjectSide {
  // Compétences et profils recherchés : « CTO », « Angular », « commercial »...
  needs: string[];
  sector?: string;
  location?: string;
}

export interface TalentSide {
  // Compétences et intitulé du talent.
  offers: string[];
  // Texte libre (bio...) où chercher le secteur du projet.
  text?: string;
  location?: string;
  availableNow: boolean;
}

export interface CompatibilityResult {
  score: number;
  reasons: string[];
}

const WEIGHTS = { skills: 50, location: 20, availability: 15, sector: 15 } as const;

// Valeurs génériques ou de remplissage, qui ne disent rien du besoin réel.
const GENERIC_TERMS = new Set([
  'talent', 'talents', 'associe', 'associes', 'expertise', 'projet', 'projets', 'equipe', 'execution',
  'collaboration', 'projet entrepreneurial', 'profil', 'profils', 'tech',
]);

// Familles de compétences : un besoin « CTO » est couvert par un talent « Développeur full-stack ».
const SKILL_FAMILIES: string[][] = [
  ['cto', 'developpeur', 'developpement', 'dev', 'fullstack', 'full stack', 'backend', 'frontend', 'angular', 'react', 'vue', 'node', 'python', 'java', 'php', 'typescript', 'javascript', 'ingenieur', 'logiciel', 'mobile'],
  ['commercial', 'sales', 'vente', 'ventes', 'business developer', 'bizdev', 'account manager', 'cco'],
  ['marketing', 'growth', 'seo', 'acquisition', 'cmo', 'communication', 'contenu', 'social media'],
  ['design', 'designer', 'ux', 'ui', 'figma', 'product designer'],
  ['finance', 'cfo', 'comptable', 'comptabilite', 'controle de gestion', 'levee de fonds'],
  ['produit', 'product', 'product manager', 'product owner', 'cpo'],
  ['data', 'data scientist', 'machine learning', 'ia', 'analytics', 'sql'],
  ['juridique', 'juriste', 'avocat', 'legal'],
  ['operations', 'ops', 'coo', 'logistique', 'supply chain'],
];

const REMOTE_TERMS = ['distance', 'remote', 'teletravail', 'full remote'];

export function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9+#]+/g, ' ')
    .trim();
}

function meaningful(values: string[]): string[] {
  const seen = new Set<string>();
  return values
    .map(value => value.trim())
    .filter(value => {
      const key = normalize(value);
      if (!key || GENERIC_TERMS.has(key) || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

function containsTerm(text: string, term: string): boolean {
  return ` ${text} `.includes(` ${term} `);
}

function families(value: string): Set<number> {
  const text = normalize(value);
  const found = new Set<number>();
  SKILL_FAMILIES.forEach((family, index) => {
    if (family.some(term => containsTerm(text, term))) {
      found.add(index);
    }
  });
  return found;
}

function needIsCovered(need: string, offers: string[]): boolean {
  const normalizedNeed = normalize(need);
  const needFamilies = families(need);

  return offers.some(offer => {
    const normalizedOffer = normalize(offer);

    if (normalizedOffer === normalizedNeed) {
      return true;
    }

    const shorter = normalizedOffer.length < normalizedNeed.length ? normalizedOffer : normalizedNeed;
    const longer = shorter === normalizedOffer ? normalizedNeed : normalizedOffer;
    if (shorter.length >= 3 && containsTerm(longer, shorter)) {
      return true;
    }

    return [...families(offer)].some(family => needFamilies.has(family));
  });
}

function city(location: string | undefined): string {
  return normalize((location ?? '').split(',')[0] ?? '');
}

export function computeCompatibility(project: ProjectSide, talent: TalentSide): CompatibilityResult {
  const reasons: string[] = [];
  let score = 0;

  // 1. Compétences : part des besoins du projet couverts par le talent.
  // Le secteur est parfois rangé dans les profils recherchés : il est évalué au critère 4, pas ici.
  const sectorKey = normalize(project.sector ?? '');
  const needs = meaningful(project.needs).filter(need => normalize(need) !== sectorKey);
  const offers = meaningful(talent.offers);
  if (needs.length > 0 && offers.length > 0) {
    const covered = needs.filter(need => needIsCovered(need, offers));
    score += Math.round((covered.length / needs.length) * WEIGHTS.skills);
    if (covered.length > 0) {
      reasons.push(`Correspond à la recherche : ${covered.slice(0, 3).join(', ')}`);
    }
  } else {
    // Besoins ou compétences non renseignés : critère neutre plutôt que pénalisant.
    score += Math.round(WEIGHTS.skills * 0.3);
  }

  // 2. Localisation.
  const projectCity = city(project.location);
  const talentCity = city(talent.location);
  const remote = [project.location, talent.location].some(location =>
    REMOTE_TERMS.some(term => normalize(location ?? '').includes(term))
  );
  if (projectCity && projectCity === talentCity) {
    score += WEIGHTS.location;
    reasons.push(`Même ville : ${(talent.location ?? '').split(',')[0].trim()}`);
  } else if (remote) {
    score += Math.round(WEIGHTS.location * 0.7);
    reasons.push('Travail à distance possible');
  } else if (!projectCity || !talentCity) {
    score += Math.round(WEIGHTS.location * 0.4);
  } else {
    score += Math.round(WEIGHTS.location * 0.2);
  }

  // 3. Disponibilité du talent.
  if (talent.availableNow) {
    score += WEIGHTS.availability;
    reasons.push('Disponible rapidement');
  } else {
    score += Math.round(WEIGHTS.availability * 0.3);
  }

  // 4. Secteur du projet présent dans le parcours du talent.
  if (!sectorKey) {
    score += Math.round(WEIGHTS.sector * 0.4);
  } else if (containsTerm(normalize([...talent.offers, talent.text ?? ''].join(' ')), sectorKey)) {
    score += WEIGHTS.sector;
    reasons.push(`Expérience dans le secteur : ${project.sector}`);
  }

  return { score: Math.min(100, Math.max(0, score)), reasons };
}
