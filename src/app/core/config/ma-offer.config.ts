// Phase de validation "reprise" : paiement via un Stripe Payment Link (URL publique, pas un secret).
// Créer le lien dans le dashboard Stripe (produit "Accès repreneur GoFounders", 149 €, paiement unique)
// puis coller l'URL ici. Tant qu'il est vide, les CTA renvoient vers /tarifs#ma-access.
// Après chaque paiement, passer `profiles.ma_access = true` à la main dans Supabase
// (le client_reference_id du paiement contient l'uid de l'acheteur).
export const MA_PAYMENT_LINK = '';

export const MA_ACCESS_PRICE_LABEL = '149 €';
