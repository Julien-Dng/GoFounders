// Modules visibles au premier lancement. Un module désactivé est masqué (navigation, pages, tarifs, FAQ),
// pas supprimé : passer sa valeur à true le réactive. Les règles Supabase restent en place dans tous les cas.
export const FEATURES = {
  // Trouver un associé : /associes, /recherche, rôles porteur de projet et associé, offre PRO (prix dans offers.ts).
  associates: true,
  // Professionnels : rôle pro, annuaire /pros et fiche annuaire (prix dans offers.ts, 1 mois d'essai gratuit).
  pros: true,
  // Compte pro des cabinets (publication d'annonces pour leurs clients, contact des repreneurs) : masqué au lancement,
  // seule la fiche annuaire est proposée. À activer quand des cabinets le demandent.
  proAccount: false,
  // Assistant IA personnel /coaching-ia (lié à l'offre PRO).
  assistant: false,
  // Accès repreneur Plus (390 €/an : analyses illimitées, alertes).
  buyerPlus: false,
  // Offres cédant payantes : mise en avant (14 € ou 49 €) et dossier vérifié (199 €).
  sellerPaidOffers: true,
} as const;

export type FeatureName = keyof typeof FEATURES;

export function isEnabled(feature: FeatureName): boolean {
  return FEATURES[feature];
}
