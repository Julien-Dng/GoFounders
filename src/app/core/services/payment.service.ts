import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AccountProduct, ListingProduct } from '../config/offers';
import { canAccessMaDetails, canPublishMaListing } from '../models/user.model';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

export type PaymentMode = 'simulation' | 'stripe';
export type PaymentProduct = AccountProduct;

export type PremiumTopic = 'cession' | 'reprise' | 'associes' | 'autre';

const PRODUCT_MESSAGES: Record<PaymentProduct, string> = {
  PRO: 'Plan PRO activé',
  PREMIUM: 'Plan PREMIUM activé',
  MA_ACCESS: 'Accès repreneur activé pour 12 mois',
  MA_PLUS: 'Accès repreneur Plus activé pour 12 mois',
  PRO_DIRECTORY: 'Fiche annuaire activée pour 1 mois',
  PRO_ACCOUNT: 'Compte pro activé pour 1 mois',
};

const LISTING_MESSAGES: Record<ListingProduct, string> = {
  FEATURE_7D: 'Annonce mise en avant pendant 7 jours',
  FEATURE_30D: 'Annonce mise en avant pendant 30 jours',
  VERIFICATION: 'Demande de vérification envoyée : un membre de l’équipe GoFounders examine vos justificatifs',
};

export interface PaymentResult {
  success: boolean;
  message: string;
}

// environment.ts n'est pas versionné : un fichier local sans paymentMode reste en simulation.
const PAYMENT_MODE: PaymentMode = (environment as { paymentMode?: PaymentMode }).paymentMode ?? 'simulation';

// Point d'entrée unique des paiements. En simulation, les droits sont accordés par la fonction
// Supabase simulate_purchase ; en mode stripe, ils le seront par le webhook Stripe.
@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SupabaseService);

  readonly isSimulation = PAYMENT_MODE === 'simulation';

  async purchase(product: PaymentProduct): Promise<PaymentResult> {
    const user = this.auth.currentUser();

    if (!user) {
      return { success: false, message: 'Connectez-vous pour continuer.' };
    }

    if ((product === 'MA_ACCESS' || product === 'MA_PLUS') && !canAccessMaDetails(user.profileType)) {
      return {
        success: false,
        message: canPublishMaListing(user.profileType)
          ? 'La publication est gratuite pour les vendeurs : aucun paiement nécessaire.'
          : "L'accès M&A est réservé aux comptes acheteur.",
      };
    }

    if ((product === 'PRO_DIRECTORY' || product === 'PRO_ACCOUNT') && user.profileType !== 'pro') {
      return { success: false, message: 'Ces offres sont réservées aux comptes professionnels.' };
    }

    if (PAYMENT_MODE === 'stripe') {
      // À brancher : Edge Function qui crée la session Stripe Checkout puis redirection.
      return { success: false, message: "Le paiement en ligne n'est pas encore disponible." };
    }

    return this.simulatePurchase(product);
  }

  private async simulatePurchase(product: PaymentProduct): Promise<PaymentResult> {
    if (this.supabase.isConfigured) {
      const { error } = await this.supabase.client.rpc('simulate_purchase', { product });

      if (error) {
        return { success: false, message: error.message };
      }

      await this.auth.reloadCurrentProfile();
    } else {
      const inOneYear = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
      const inOneMonth = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
      const applied = this.auth.applyLocalEntitlements(
        product === 'MA_ACCESS'
          ? { maAccess: true, maAccessExpiresAt: inOneYear }
          : product === 'MA_PLUS'
            ? { maAccess: true, maAccessExpiresAt: inOneYear, buyerPlusUntil: inOneYear }
            : product === 'PRO_DIRECTORY'
              ? { proDirectoryUntil: inOneMonth }
              : product === 'PRO_ACCOUNT'
                ? { proAccountUntil: inOneMonth }
                : { plan: product }
      );

      if (!applied) {
        return { success: false, message: "Impossible d'appliquer le paiement simulé." };
      }
    }

    return { success: true, message: `${PRODUCT_MESSAGES[product]} (paiement simulé).` };
  }

  // Achats liés à une annonce : mise en avant, dossier vérifié (justificatifs décrits par le cédant).
  async purchaseForListing(product: ListingProduct, listingId: string, evidence?: string): Promise<PaymentResult> {
    if (!this.auth.currentUser()) {
      return { success: false, message: 'Connectez-vous pour continuer.' };
    }

    if (PAYMENT_MODE === 'stripe') {
      return { success: false, message: "Le paiement en ligne n'est pas encore disponible." };
    }

    if (!this.supabase.isConfigured) {
      return { success: false, message: 'Disponible uniquement avec la base Supabase (mode démo).' };
    }

    const { error } = await this.supabase.client.rpc('simulate_listing_purchase', {
      product,
      p_listing_id: listingId,
      p_evidence: evidence ?? null,
    });

    if (error) {
      return { success: false, message: this.readableError(error.message) };
    }

    return { success: true, message: `${LISTING_MESSAGES[product]} (paiement simulé).` };
  }

  // Accompagnement PREMIUM : demande de devis transmise à l'équipe.
  async requestPremium(topic: PremiumTopic, message: string, phone?: string): Promise<PaymentResult> {
    if (!this.auth.currentUser()) {
      return { success: false, message: 'Connectez-vous pour envoyer votre demande.' };
    }

    if (!this.supabase.isConfigured) {
      return { success: true, message: 'Demande enregistrée (mode démo, non transmise).' };
    }

    const { error } = await this.supabase.client.rpc('request_premium', { p_topic: topic, p_message: message, p_phone: phone ?? null });

    return error
      ? { success: false, message: this.readableError(error.message) }
      : { success: true, message: 'Demande envoyée : nous vous recontactons sous 48 h ouvrées pour établir un devis.' };
  }

  private readableError(message: string): string {
    const known: Record<string, string> = {
      JUSTIFICATIFS_REQUIS: 'Décrivez vos justificatifs (au moins 20 caractères).',
      DEJA_VERIFIEE: 'Cette annonce est déjà vérifiée.',
      ANNONCE_INTROUVABLE: 'Annonce introuvable.',
      MESSAGE_TROP_COURT: 'Décrivez votre besoin en quelques phrases (au moins 20 caractères).',
    };
    const code = Object.keys(known).find(key => message.includes(key));
    return code ? known[code] : message;
  }
}
