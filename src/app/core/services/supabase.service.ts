import { Injectable } from '@angular/core';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

const FALLBACK_SUPABASE_URL = 'https://example.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'anon-key-not-configured';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly isConfigured = this.hasValidConfig();
  readonly client: SupabaseClient;

  constructor() {
    this.client = createClient(
      this.isConfigured ? environment.supabaseUrl : FALLBACK_SUPABASE_URL,
      this.isConfigured ? environment.supabaseAnonKey : FALLBACK_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
        },
      }
    );
  }

  private hasValidConfig(): boolean {
    return (
      environment.supabaseUrl.startsWith('https://') &&
      environment.supabaseUrl.includes('.supabase.co') &&
      environment.supabaseAnonKey.length > 20
    );
  }
}
