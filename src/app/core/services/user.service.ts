import { Injectable } from '@angular/core';
import { User, Plan } from '../models/user.model';
import { Profile } from '../models/project.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  // Placeholder — will call Firestore via AngularFire
  async getUserById(uid: string): Promise<User | null> {
    return null;
  }

  async getProfileByUserId(uid: string): Promise<Profile | null> {
    return null;
  }

  async updateProfile(uid: string, data: Partial<Profile>): Promise<void> {}

  async updatePlan(uid: string, plan: Plan): Promise<void> {}

  async grantMaAccess(uid: string): Promise<void> {}
}
