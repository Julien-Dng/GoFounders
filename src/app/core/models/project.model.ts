import { Timestamp } from '@angular/fire/firestore';

export type ProjectStage = 'idea' | 'mvp' | 'growth' | 'established';

export interface Profile {
  userId: string;
  sector: string;
  projectStage: ProjectStage;
  bio: string;
  lookingFor: string[];
  skills: string[];
  availability: boolean;
  investmentCapacity?: string;
  confidential: boolean;
  views: number;
  updatedAt: Timestamp;
}
