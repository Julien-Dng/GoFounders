import { Timestamp } from '@angular/fire/firestore';

export type MaListingType = 'cession' | 'fonds_commerce' | 'parts_sociales';
export type MaListingStatus = 'active' | 'sold' | 'withdrawn';

export interface MaListing {
  id: string;
  ownerId: string;
  sector: string;
  region: string;
  type: MaListingType;
  revenue: number;
  margin: number;
  age: number;
  priceMin: number;
  priceMax: number;
  saleReason: string;
  description: string;
  contactInfo: string;
  status: MaListingStatus;
  createdAt: Timestamp;
}
