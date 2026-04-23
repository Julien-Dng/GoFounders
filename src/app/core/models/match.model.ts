import { Timestamp } from '@angular/fire/firestore';

export type MatchStatus = 'pending' | 'accepted' | 'rejected' | 'connected';

export interface Match {
  id: string;
  user1Id: string;
  user2Id: string;
  score: number;
  scoreReason: string[];
  status: MatchStatus;
  createdAt: Timestamp;
}
