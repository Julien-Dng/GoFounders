import { Timestamp } from '@angular/fire/firestore';

export type ProfileType = 'entrepreneur' | 'talent' | 'buyer' | 'seller';
export type Plan = 'FREE' | 'PRO' | 'PREMIUM';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  location: string;
  profileType: ProfileType;
  plan: Plan;
  maAccess: boolean;
  stripeCustomerId?: string;
  createdAt: Timestamp;
  lastActive: Timestamp;
  profileComplete: number;
  verified: boolean;
}
