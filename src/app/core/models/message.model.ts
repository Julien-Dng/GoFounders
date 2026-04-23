import { Timestamp } from '@angular/fire/firestore';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  read: boolean;
  createdAt: Timestamp;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  lastMessage?: string;
  lastMessageAt?: Timestamp;
  unreadCount: number;
}
