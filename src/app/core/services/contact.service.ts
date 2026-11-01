import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

export type ContactTopic = 'question' | 'cession' | 'reprise' | 'paiement' | 'probleme' | 'partenariat' | 'autre';
export type InboxStatus = 'new' | 'contacted' | 'closed';

export const CONTACT_TOPICS: Array<{ value: ContactTopic; label: string }> = [
  { value: 'question', label: 'Question générale' },
  { value: 'cession', label: 'Je veux vendre mon entreprise' },
  { value: 'reprise', label: 'Je veux reprendre une entreprise' },
  { value: 'paiement', label: 'Paiement ou facture' },
  { value: 'probleme', label: 'Signaler un problème ou une annonce' },
  { value: 'partenariat', label: 'Partenariat ou presse' },
  { value: 'autre', label: 'Autre' },
];

export interface InboxItem {
  kind: 'contact' | 'premium';
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  topic: string;
  message: string;
  status: InboxStatus;
  created_at: string;
}

export interface ContactResult {
  success: boolean;
  message: string;
}

// Formulaire de contact (visiteurs et membres) et boîte de réception admin : supabase/2026-10-25-contact.sql.
@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly supabase = inject(SupabaseService);

  async send(name: string, email: string, topic: ContactTopic, message: string): Promise<ContactResult> {
    if (!this.supabase.isConfigured) {
      return { success: true, message: 'Message enregistré (mode démo, non transmis).' };
    }

    const { error } = await this.supabase.client.rpc('send_contact_message', {
      p_name: name,
      p_email: email,
      p_topic: topic,
      p_message: message,
    });

    return error
      ? { success: false, message: this.readableError(error.message) }
      : { success: true, message: 'Message envoyé. Nous vous répondons par email.' };
  }

  async listInbox(): Promise<InboxItem[]> {
    if (!this.supabase.isConfigured) {
      return [];
    }

    const { data, error } = await this.supabase.client.rpc('admin_list_inbox', { p_limit: 200 });
    return error ? [] : ((data ?? []) as InboxItem[]);
  }

  async setStatus(item: InboxItem, status: InboxStatus): Promise<boolean> {
    if (!this.supabase.isConfigured) {
      return true;
    }

    const { error } = await this.supabase.client.rpc('admin_set_inbox_status', { p_kind: item.kind, p_id: item.id, p_status: status });
    return !error;
  }

  private readableError(message: string): string {
    const known: Record<string, string> = {
      NOM_REQUIS: 'Indiquez votre nom.',
      EMAIL_INVALIDE: 'Cette adresse email ne semble pas valide.',
      SUJET_INVALIDE: 'Choisissez un sujet.',
      MESSAGE_TROP_COURT: 'Décrivez votre demande en quelques phrases (au moins 20 caractères).',
      TROP_DE_MESSAGES: 'Vous avez déjà envoyé plusieurs messages : nous les avons bien reçus. Réessayez dans une heure si besoin.',
      FORMULAIRE_SATURE: "Le formulaire est temporairement indisponible. Écrivez-nous directement par email.",
    };
    const code = Object.keys(known).find(key => message.includes(key));
    return code ? known[code] : "L'envoi a échoué. Réessayez dans quelques instants.";
  }
}
