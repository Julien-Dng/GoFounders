import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  // Creates Stripe Checkout Session via Firebase Function → redirects to Stripe
  async subscribePro(userId: string): Promise<void> {}

  async subscribePremium(userId: string): Promise<void> {}

  // One-shot M&A access (149€)
  async purchaseMaAccess(userId: string): Promise<void> {}

  async cancelSubscription(userId: string): Promise<void> {}
}
