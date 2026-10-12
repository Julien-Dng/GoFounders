import { Injectable } from '@angular/core';
import { MA_PAYMENT_LINK } from '../config/ma-offer.config';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  // Creates Stripe Checkout Session via Firebase Function → redirects to Stripe
  async subscribePro(userId: string): Promise<void> {}

  async subscribePremium(userId: string): Promise<void> {}

  readonly hasMaPaymentLink = MA_PAYMENT_LINK.length > 0;

  // One-shot M&A access (149€) — phase de validation : Stripe Payment Link + activation manuelle.
  // Retourne false si aucun lien n'est configuré (l'appelant garde alors son fallback).
  purchaseMaAccess(user: { uid: string; email: string }): boolean {
    if (!this.hasMaPaymentLink) {
      return false;
    }

    const url = new URL(MA_PAYMENT_LINK);
    url.searchParams.set('client_reference_id', user.uid);
    url.searchParams.set('prefilled_email', user.email);
    window.location.href = url.toString();
    return true;
  }

  async cancelSubscription(userId: string): Promise<void> {}
}
