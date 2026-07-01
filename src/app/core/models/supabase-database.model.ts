import { Plan, ProfileType } from './user.model';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: SupabaseProfileRow;
        Insert: SupabaseProfileInsert;
        Update: SupabaseProfileUpdate;
        Relationships: [];
      };
      projects: {
        Row: SupabaseProjectRow;
        Insert: SupabaseProjectInsert;
        Update: SupabaseProjectUpdate;
        Relationships: [];
      };
      conversations: {
        Row: SupabaseConversationRow;
        Insert: SupabaseConversationInsert;
        Update: SupabaseConversationUpdate;
        Relationships: [];
      };
      messages: {
        Row: SupabaseMessageRow;
        Insert: SupabaseMessageInsert;
        Update: SupabaseMessageUpdate;
        Relationships: [];
      };
      notifications: {
        Row: SupabaseNotificationRow;
        Insert: SupabaseNotificationInsert;
        Update: SupabaseNotificationUpdate;
        Relationships: [];
      };
      ma_listings: {
        Row: SupabaseMaListingRow;
        Insert: SupabaseMaListingInsert;
        Update: SupabaseMaListingUpdate;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      profile_role: ProfileType;
      plan_type: Plan;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export interface SupabaseProfileRow {
  id: string;
  email: string;
  display_name: string;
  role: ProfileType;
  plan: Plan;
  ma_access: boolean;
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
  created_at: string;
  updated_at: string;
}

export interface SupabaseProfileInsert {
  id: string;
  email: string;
  display_name: string;
  role: ProfileType;
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
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseProfileUpdate {
  display_name?: string;
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
  is_admin?: boolean | null;
  updated_at?: string;
}

export interface SupabaseConversationRow {
  id: string;
  participant_a: string;
  participant_b: string;
  created_at: string;
}

export interface SupabaseConversationInsert {
  id?: string;
  participant_a: string;
  participant_b: string;
  created_at?: string;
}

export interface SupabaseConversationUpdate {
  participant_a?: string;
  participant_b?: string;
}

export interface SupabaseMessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

export interface SupabaseMessageInsert {
  id?: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at?: string | null;
  created_at?: string;
}

export interface SupabaseMessageUpdate {
  content?: string;
  read_at?: string | null;
}

export interface SupabaseNotificationRow {
  id: string;
  user_id: string;
  title: string;
  body: string;
  link_url: string | null;
  read_at: string | null;
  created_at: string;
}

export interface SupabaseNotificationInsert {
  id?: string;
  user_id: string;
  title: string;
  body: string;
  link_url?: string | null;
  read_at?: string | null;
  created_at?: string;
}

export interface SupabaseNotificationUpdate {
  read_at?: string | null;
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
  sale_reason: string | null;
  confidential_description: string | null;
  contact_info: string | null;
  status: 'active' | 'sold' | 'withdrawn';
  created_at: string;
  updated_at: string;
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
  sale_reason?: string | null;
  confidential_description?: string | null;
  contact_info?: string | null;
  status?: 'active' | 'sold' | 'withdrawn';
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseMaListingUpdate {
  sector?: string;
  region?: string;
  type?: 'cession' | 'fonds_commerce' | 'parts_sociales';
  revenue?: number | null;
  margin?: number | null;
  age?: number | null;
  price_min?: number | null;
  price_max?: number | null;
  public_summary?: string;
  sale_reason?: string | null;
  confidential_description?: string | null;
  contact_info?: string | null;
  status?: 'active' | 'sold' | 'withdrawn';
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
  created_at: string;
  updated_at: string;
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
  created_at?: string;
  updated_at?: string;
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
  updated_at?: string;
}
