import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { canAccessMaDetails, canPublishMaListing } from '../models/user.model';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

export type PaymentMode = 'simulation' | 'stripe';
export type PaymentProduct = 'PRO' | 'PREMIUM' | 'MA_ACCESS';

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

    if (product === 'MA_ACCESS' && !canAccessMaDetails(user.profileType)) {
      return {
        success: false,
        message: canPublishMaListing(user.profileType)
          ? 'La publication est gratuite pour les vendeurs : aucun paiement nécessaire.'
          : "L'accès M&A est réservé aux comptes acheteur.",
      };
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
      const applied = this.auth.applyLocalEntitlements(
        product === 'MA_ACCESS'
          ? { maAccess: true, maAccessExpiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString() }
          : { plan: product }
      );

      if (!applied) {
        return { success: false, message: "Impossible d'appliquer le paiement simulé." };
      }
    }

    return {
      success: true,
      message: product === 'MA_ACCESS' ? 'Accès M&A activé pour 12 mois (paiement simulé).' : `Plan ${product} activé (paiement simulé).`,
    };
  }
}
