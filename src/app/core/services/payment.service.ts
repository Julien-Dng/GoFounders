import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AccountProduct, ListingProduct } from '../config/offers';
import { canAccessMaDetails, canPublishMaListing } from '../models/user.model';
import { API_URL } from './ai.service';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';
import { ListingAccessService } from './listing-access.service';

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
  INTRO: 'Mise en relation débloquée : le dossier complet et le contact du cédant sont ouverts',
};

export interface PaymentResult {
  success: boolean;
  message: string;
}

// environment.ts n'est pas versionné : un fichier local sans paymentMode reste en simulation.
const PAYMENT_MODE: PaymentMode = (environment as { paymentMode?: PaymentMode }).paymentMode ?? 'simulation';

// Point d'entrée unique des paiements. En simulation, les droits sont accordés par la fonction
// Supabase simulate_purchase ; en mode stripe, le back Python crée la session Stripe Checkout et
// les droits sont accordés par le webhook Stripe (backend/app/payments.py, apply_purchase).
@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SupabaseService);
  private readonly http = inject(HttpClient);

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
      if (product === 'PREMIUM') {
        return { success: false, message: "L'accompagnement PREMIUM est sur devis : envoyez-nous votre demande depuis la page Tarifs." };
      }

      return this.redirectToCheckout({ product });
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
      return this.redirectToCheckout({ product, listing_id: listingId, evidence: evidence ?? null });
    }

    if (!this.supabase.isConfigured) {
      if (product === 'INTRO' && ListingAccessService.demoUnlock(listingId)) {
        return { success: true, message: `${LISTING_MESSAGES.INTRO} (mode démo).` };
      }
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

  // Portail Stripe : moyens de paiement, factures et résiliation des abonnements.
  async openBillingPortal(): Promise<PaymentResult> {
    try {
      const { url } = await firstValueFrom(this.http.post<{ url: string }>(`${API_URL}/api/paiements/portail`, {}));
      window.location.assign(url);
      return { success: true, message: 'Ouverture du portail de facturation…' };
    } catch (error) {
      return { success: false, message: this.httpError(error) };
    }
  }

  // Mode stripe : session Checkout créée par le back, puis redirection vers la page de paiement Stripe.
  private async redirectToCheckout(body: { product: string; listing_id?: string; evidence?: string | null }): Promise<PaymentResult> {
    try {
      const { url } = await firstValueFrom(this.http.post<{ url: string }>(`${API_URL}/api/paiements/session`, body));
      window.location.assign(url);
      return { success: true, message: 'Redirection vers le paiement sécurisé…' };
    } catch (error) {
      return { success: false, message: this.httpError(error) };
    }
  }

  private httpError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const detail = (error.error as { detail?: unknown } | null)?.detail;

      if (typeof detail === 'string') {
        return detail;
      }

      if (error.status === 0) {
        return 'Le service de paiement est injoignable. Réessayez dans un instant.';
      }
    }

    return 'Le paiement est momentanément indisponible.';
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
      RIEN_A_DEBLOQUER: 'Le cédant doit d’abord accepter votre demande, ou la mise en relation est déjà débloquée.',
      MESSAGE_TROP_COURT: 'Décrivez votre besoin en quelques phrases (au moins 20 caractères).',
    };
    const code = Object.keys(known).find(key => message.includes(key));
    return code ? known[code] : message;
  }
}
