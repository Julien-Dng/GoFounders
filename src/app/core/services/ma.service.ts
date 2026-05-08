import { Injectable } from '@angular/core';
import { MaListing } from '../models/ma-listing.model';

export interface MaSearchFilters {
  sector?: string;
  region?: string;
  priceMin?: number;
  priceMax?: number;
  type?: string;
}

@Injectable({ providedIn: 'root' })
export class MaService {
  async getListings(filters?: MaSearchFilters): Promise<MaListing[]> {
    return [];
  }

  async getListingById(id: string): Promise<MaListing | null> {
    return null;
  }

  async createListing(data: Omit<MaListing, 'id' | 'createdAt'>): Promise<string> {
    return '';
  }
}
