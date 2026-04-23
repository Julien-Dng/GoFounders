import { Injectable } from '@angular/core';
import { Message, Conversation } from '../models/message.model';

@Injectable({ providedIn: 'root' })
export class MessagingService {
  async getConversations(userId: string): Promise<Conversation[]> {
    return [];
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    return [];
  }

  async sendMessage(conversationId: string, senderId: string, content: string): Promise<void> {}

  async markAsRead(conversationId: string, userId: string): Promise<void> {}
}
