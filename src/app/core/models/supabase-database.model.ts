import { Plan, ProCategory, ProfileType, Usage } from './user.model';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// Colonnes de profiles lisibles depuis l'appli : toutes sauf l'email (2026-10-12-profils-par-role.sql).
// Un select('*') sur profiles est refusé par Supabase.
export const PROFILE_COLUMNS =
  'id, display_name, role, usages, plan, ma_access, ma_access_expires_at, is_admin, location, title, bio, photo_url, github_url, linkedin_url, website_url, skills, looking_for, availability_label, ma_sector, ma_budget, ma_region, buyer_plus_until, pro_directory_until, pro_account_until, pro_category, verified_at, associate_offered_at, associate_started_at, investment_readiness, created_at, updated_at';

export interface SupabaseProfileRow {
  id: string;
  // Non lisible depuis l'appli (seul le back avec la clé service_role y a accès).
  email?: string;
  display_name: string;
  role: ProfileType;
  usages?: Usage[] | null;
  plan: Plan;
  ma_access: boolean;
  ma_access_expires_at?: string | null;
  buyer_plus_until?: string | null;
  pro_directory_until?: string | null;
  pro_account_until?: string | null;
  pro_category?: ProCategory | null;
  is_admin?: boolean | null;
  location: string | null;
  title: string | null;
  bio: string | null;
  photo_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  skills: string[] | null;
  looking_for: string[] | null;
  availability_label: string | null;
  ma_sector: string | null;
  ma_budget: string | null;
  ma_region: string | null;
  // Badge « Profil vérifié », posé par un admin (2026-10-21-moderation-verification-stats.sql).
  verified_at?: string | null;
  // Profil d'associé proposé aux porteurs de projet (set_associate_offer, 2026-11-15-objectifs-automatiques.sql).
  associate_offered_at?: string | null;
  associate_started_at?: string | null;
  // Prêt à entrer au capital avec un apport (2026-11-25-apport-associe.sql) : yes, discuss, no ou non précisé.
  investment_readiness?: 'yes' | 'discuss' | 'no' | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseProfileInsert {
  id: string;
  email: string;
  display_name: string;
  role: ProfileType;
  usages?: Usage[];
  plan?: Plan;
  ma_access?: boolean;
  is_admin?: boolean | null;
  location?: string | null;
  title?: string | null;
  bio?: string | null;
  photo_url?: string | null;
  github_url?: string | null;
  linkedin_url?: string | null;
  website_url?: string | null;
  skills?: string[] | null;
  looking_for?: string[] | null;
  availability_label?: string | null;
  ma_sector?: string | null;
  ma_budget?: string | null;
  ma_region?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseMaListingRow {
  id: string;
  owner_id: string;
  sector: string;
  region: string;
  type: 'cession' | 'fonds_commerce' | 'parts_sociales';
  revenue: number | null;
  margin: number | null;
  age: number | null;
  price_min: number | null;
  price_max: number | null;
  public_summary: string;
  // Titre court de l'aperçu (2026-11-11-titre-annonce.sql), facultatif.
  public_title?: string | null;
  sale_reason: string | null;
  confidential_description: string | null;
  contact_info: string | null;
  status: 'active' | 'sold' | 'withdrawn';
  // Offres « reprise » : mise en avant payante et badge « dossier vérifié » (posés côté serveur).
  featured_until?: string | null;
  verified?: boolean | null;
  created_at: string;
  updated_at: string;
  // Annonces enrichies (2026-10-26-annonces-enrichies.sql) ; growth_notes uniquement dans le dossier.
  revenue_year?: number | null;
  revenue_history?: Array<{ year: number; revenue: number }> | null;
  included_assets?: string[] | null;
  monthly_visitors?: number | null;
  acquisition_channels?: string[] | null;
  team_size?: number | null;
  owner_hours_per_week?: number | null;
  growth_notes?: string | null;
}

export interface SupabaseMaListingInsert {
  id?: string;
  owner_id: string;
  sector: string;
  region: string;
  type: 'cession' | 'fonds_commerce' | 'parts_sociales';
  revenue?: number | null;
  margin?: number | null;
  age?: number | null;
  price_min?: number | null;
  price_max?: number | null;
  public_summary: string;
  // Titre court de l'aperçu (2026-11-11-titre-annonce.sql), facultatif.
  public_title?: string | null;
  sale_reason?: string | null;
  confidential_description?: string | null;
  contact_info?: string | null;
  status?: 'active' | 'sold' | 'withdrawn';
  revenue_year?: number | null;
  revenue_history?: Array<{ year: number; revenue: number }>;
  included_assets?: string[];
  monthly_visitors?: number | null;
  acquisition_channels?: string[];
  team_size?: number | null;
  owner_hours_per_week?: number | null;
  growth_notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseProjectRow {
  id: string;
  owner_id: string;
  name: string;
  sector: string | null;
  stage: string | null;
  description: string | null;
  looking_for: string[] | null;
  skills_needed: string[] | null;
  location: string | null;
  is_active: boolean;
  open_to_equity?: boolean | null;
  nda_required?: boolean | null;
  // Aperçu anonyme du projet sur la vitrine /associes, seulement s'il est publié (2026-11-17-visibilite-contact.sql).
  public_listing?: boolean | null;
  // Indique qu'une partie confidentielle existe ; son contenu passe par get_project_confidential().
  has_confidential_details?: boolean | null;
  created_at: string;
  updated_at: string;
}

// Colonnes lisibles d'un projet : jamais de select('*') (confidential_details n'est pas accordée en lecture).
export const PROJECT_COLUMNS =
  'id, owner_id, name, sector, stage, description, looking_for, skills_needed, location, is_active, open_to_equity, nda_required, has_confidential_details, public_listing, created_at, updated_at';

export type ProjectAccessStatus = 'pending' | 'approved' | 'refused';

export interface SupabaseProjectAccessRequestRow {
  id: string;
  project_id: string | null;
  requester_id: string | null;
  owner_id: string | null;
  status: ProjectAccessStatus;
  nda_version: string | null;
  nda_accepted_at: string | null;
  nda_ip: string | null;
  nda_user_agent: string | null;
  snapshot: { project_name?: string; owner_name?: string; requester_name?: string } | null;
  created_at: string;
  decided_at: string | null;
}

export interface SupabaseProjectInsert {
  id?: string;
  owner_id: string;
  name: string;
  sector?: string | null;
  stage?: string | null;
  description?: string | null;
  looking_for?: string[] | null;
  skills_needed?: string[] | null;
  location?: string | null;
  is_active?: boolean;
  open_to_equity?: boolean;
  confidential_details?: string | null;
  nda_required?: boolean;
  created_at?: string;
  updated_at?: string;
  public_listing?: boolean;
}

export interface SupabaseProjectUpdate {
  name?: string;
  sector?: string | null;
  stage?: string | null;
  description?: string | null;
  looking_for?: string[] | null;
  skills_needed?: string[] | null;
  location?: string | null;
  is_active?: boolean;
  open_to_equity?: boolean;
  confidential_details?: string | null;
  nda_required?: boolean;
  updated_at?: string;
  public_listing?: boolean;
}
