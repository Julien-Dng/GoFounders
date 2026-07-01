import { Injectable, inject } from '@angular/core';
import { ConversationMessage, MarketplaceProfile } from '../data/mock-platform.data';
import { Conversation, Message } from '../models/message.model';
import { SupabaseProfileRow } from '../models/supabase-database.model';
import { User } from '../models/user.model';
import { MatchingService } from './matching.service';
import { SupabaseService } from './supabase.service';

interface SupabaseConversationRow {
  id: string;
  participant_a: string;
  participant_b: string;
  created_at: string;
}

interface SupabaseMessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

export interface ConversationThread {
  id: string;
  participantProfileId: string;
  participantName: string;
  participantInitials: string;
  participantRole: string;
  time: string;
  unread: number;
  isOnline: boolean;
  lastMessage: string;
  profile?: MarketplaceProfile;
  messages: ConversationMessage[];
}

@Injectable({ providedIn: 'root' })
export class MessagingService {
  private readonly supabase = inject(SupabaseService);
  private readonly matching = inject(MatchingService);

  async getConversations(_userId: string): Promise<Conversation[]> {
    return [];
  }

  async getMessages(_conversationId: string): Promise<Message[]> {
    return [];
  }

  async getConversationThreads(user: User): Promise<ConversationThread[]> {
    if (!this.supabase.isConfigured) {
      return [];
    }

    try {
      const { data: conversationsData, error: conversationsError } = await this.supabase.client
        .from('conversations')
        .select('*')
        .or(`participant_a.eq.${user.uid},participant_b.eq.${user.uid}`)
        .order('created_at', { ascending: false });

      if (conversationsError) {
        return [];
      }

      const conversationRows = (conversationsData ?? []) as SupabaseConversationRow[];
      const conversationIds = conversationRows.map(conversation => conversation.id);

      if (conversationIds.length === 0) {
        return [];
      }

      const { data: messagesData } = await this.supabase.client
        .from('messages')
        .select('*')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: true });

      const participantIds = conversationRows
        .map(conversation => conversation.participant_a === user.uid ? conversation.participant_b : conversation.participant_a);

      const { data: profilesData } = await this.supabase.client
        .from('profiles')
        .select('*')
        .in('id', participantIds);

      const messageRows = (messagesData ?? []) as SupabaseMessageRow[];
      const profileRows = (profilesData ?? []) as SupabaseProfileRow[];

      return Promise.all(conversationRows.map(async conversation => {
        const participantProfileId = conversation.participant_a === user.uid ? conversation.participant_b : conversation.participant_a;
        const profileRow = profileRows.find(profile => profile.id === participantProfileId);
        const profile = await this.matching.getMarketplaceProfileById(participantProfileId);
        const messages = messageRows
          .filter(message => message.conversation_id === conversation.id)
          .map(message => this.mapMessage(message, user.uid));
        const lastMessage = messages.at(-1);

        return {
          id: conversation.id,
          participantProfileId,
          participantName: profile?.displayName ?? profileRow?.display_name ?? 'Profil GoFounders',
          participantInitials: profile?.initials ?? this.initials(profileRow?.display_name ?? 'GoFounders'),
          participantRole: profile?.title ?? profileRow?.title ?? 'Profil GoFounders',
          time: lastMessage?.time ?? this.formatTime(conversation.created_at),
          unread: messageRows.filter(message =>
            message.conversation_id === conversation.id &&
            message.sender_id !== user.uid &&
            message.read_at === null
          ).length,
          isOnline: true,
          lastMessage: lastMessage?.content ?? 'Conversation ouverte.',
          profile,
          messages,
        };
      }));
    } catch {
      return [];
    }
  }

  async ensureConversationWithProfile(user: User, targetProfileId: string): Promise<string | null> {
    if (!this.supabase.isConfigured) {
      return targetProfileId;
    }

    const participantId = await this.resolveConversationParticipantId(targetProfileId);

    const { data: conversationsData, error: conversationsError } = await this.supabase.client
      .from('conversations')
      .select('*')
      .or(`participant_a.eq.${user.uid},participant_b.eq.${user.uid}`);

    if (conversationsError) {
      return null;
    }

    const existingConversation = ((conversationsData ?? []) as SupabaseConversationRow[]).find(conversation =>
      [conversation.participant_a, conversation.participant_b].includes(user.uid) &&
      [conversation.participant_a, conversation.participant_b].includes(participantId)
    );

    if (existingConversation) {
      return existingConversation.id;
    }

    const { data, error } = await this.supabase.client
      .from('conversations')
      .insert({
        participant_a: user.uid,
        participant_b: participantId,
      })
      .select('id')
      .single();

    if (error || !data) {
      return null;
    }

    return (data as { id: string }).id;
  }

  async sendThreadMessage(conversationId: string, senderId: string, content: string): Promise<ConversationMessage | null> {
    if (!this.supabase.isConfigured) {
      return this.createLocalMessage(content);
    }

    const { data, error } = await this.supabase.client
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
      })
      .select('*')
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapMessage(data as SupabaseMessageRow, senderId);
  }

  async sendMessage(_conversationId: string, _senderId: string, _content: string): Promise<void> {}

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    if (!this.supabase.isConfigured) {
      return;
    }

    await this.supabase.client
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .is('read_at', null);
  }

  private async resolveConversationParticipantId(targetProfileId: string): Promise<string> {
    const { data: profileData } = await this.supabase.client
      .from('profiles')
      .select('id')
      .eq('id', targetProfileId)
      .maybeSingle();

    if (profileData) {
      return targetProfileId;
    }

    const { data: projectData } = await this.supabase.client
      .from('projects')
      .select('owner_id')
      .eq('id', targetProfileId)
      .maybeSingle();

    return (projectData as { owner_id?: string } | null)?.owner_id ?? targetProfileId;
  }

  private mapMessage(message: SupabaseMessageRow, currentUserId: string): ConversationMessage {
    return {
      id: message.id,
      senderId: message.sender_id === currentUserId ? 'me' : 'other',
      content: message.content,
      time: this.formatTime(message.created_at),
    };
  }

  private createLocalMessage(content: string): ConversationMessage {
    const now = new Date();
    return {
      id: `local-${Date.now()}`,
      senderId: 'me',
      content,
      time: `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`,
    };
  }

  private formatTime(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  private initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
    return parts.length > 0 ? parts.map(part => part[0]?.toUpperCase() ?? '').join('') : 'GF';
  }
}
