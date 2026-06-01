import { Injectable, computed, inject, signal } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { Plan, ProfileType, User } from '../models/user.model';

const USERS_STORAGE_KEY = 'gofounders.mock.users';
const SESSION_STORAGE_KEY = 'gofounders.mock.session';

interface StoredUserRecord {
  uid: string;
  email: string;
  password: string;
  displayName: string;
  photoURL?: string;
  location: string;
  profileType: ProfileType;
  profileTitle?: string;
  bio?: string;
  skills?: string[];
  lookingFor?: string[];
  availabilityLabel?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  plan: Plan;
  maAccess: boolean;
  stripeCustomerId?: string;
  createdAt: string;
  lastActive: string;
  profileComplete: number;
  verified: boolean;
}

export interface SignInPayload {
  email: string;
  password: string;
}

export interface SignUpPayload {
  email: string;
  password: string;
  displayName: string;
  location: string;
  profileType: ProfileType;
}

export interface AuthResult {
  success: boolean;
  message?: string;
}

export interface UpdateProfilePayload {
  displayName: string;
  location: string;
  profileTitle: string;
  bio: string;
  skills: string[];
  lookingFor: string[];
  availabilityLabel: string;
  githubUrl: string;
  linkedinUrl: string;
  websiteUrl: string;
  photoURL?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly _currentUser = signal<User | null>(null);

  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);
  readonly plan = computed(() => this._currentUser()?.plan ?? 'FREE');
  readonly hasMaAccess = computed(() => this._currentUser()?.maAccess ?? false);
  readonly initials = computed(() => this.computeInitials(this._currentUser()?.displayName ?? ''));

  constructor() {
    this.restoreSession();
  }

  isProOrAbove(): boolean {
    const activePlan = this.plan();
    return activePlan === 'PRO' || activePlan === 'PREMIUM';
  }

  isPremium(): boolean {
    return this.plan() === 'PREMIUM';
  }

  setUser(user: User | null): void {
    this._currentUser.set(user);
  }

  async signIn(payload: SignInPayload, returnUrl?: string | null): Promise<AuthResult> {
    const users = this.readUsers();
    const email = payload.email.trim().toLowerCase();
    const password = payload.password.trim();
    const userIndex = users.findIndex(user => user.email === email && user.password === password);

    if (userIndex < 0) {
      return {
        success: false,
        message: 'Email ou mot de passe incorrect.',
      };
    }

    const updatedUser: StoredUserRecord = {
      ...users[userIndex],
      lastActive: new Date().toISOString(),
    };

    users[userIndex] = updatedUser;
    this.writeUsers(users);
    this.setAuthenticatedUser(updatedUser);
    await this.router.navigateByUrl(this.resolvePostAuthUrl(returnUrl));

    return { success: true };
  }

  async signUp(payload: SignUpPayload, returnUrl?: string | null): Promise<AuthResult> {
    const users = this.readUsers();
    const email = payload.email.trim().toLowerCase();

    if (users.some(user => user.email === email)) {
      return {
        success: false,
        message: 'Un compte existe déjà avec cet email.',
      };
    }

    const now = new Date().toISOString();
    const newUser: StoredUserRecord = {
      uid: this.createUid(),
      email,
      password: payload.password.trim(),
      displayName: payload.displayName.trim(),
      location: payload.location.trim(),
      profileType: payload.profileType,
      plan: 'FREE',
      maAccess: false,
      createdAt: now,
      lastActive: now,
      profileComplete: 65,
      verified: false,
    };

    users.push(newUser);
    this.writeUsers(users);
    this.setAuthenticatedUser(newUser);
    await this.router.navigateByUrl(this.resolvePostAuthUrl(returnUrl));

    return { success: true };
  }

  async grantMaAccess(): Promise<boolean> {
    const activeUser = this._currentUser();

    if (!activeUser) {
      return false;
    }

    const users = this.readUsers();
    const userIndex = users.findIndex(user => user.uid === activeUser.uid);

    if (userIndex < 0) {
      return false;
    }

    const updatedUser: StoredUserRecord = {
      ...users[userIndex],
      maAccess: true,
      lastActive: new Date().toISOString(),
    };

    users[userIndex] = updatedUser;
    this.writeUsers(users);
    this.setAuthenticatedUser(updatedUser);

    return true;
  }

  async grantDemoPlan(plan: Exclude<Plan, 'FREE'> = 'PRO'): Promise<boolean> {
    const activeUser = this._currentUser();

    if (!activeUser) {
      return false;
    }

    const users = this.readUsers();
    const userIndex = users.findIndex(user => user.uid === activeUser.uid);

    if (userIndex < 0) {
      return false;
    }

    const updatedUser: StoredUserRecord = {
      ...users[userIndex],
      plan,
      lastActive: new Date().toISOString(),
    };

    users[userIndex] = updatedUser;
    this.writeUsers(users);
    this.setAuthenticatedUser(updatedUser);

    return true;
  }

  async updateProfile(payload: UpdateProfilePayload): Promise<AuthResult> {
    const activeUser = this._currentUser();

    if (!activeUser) {
      return {
        success: false,
        message: 'Vous devez être connecté pour modifier votre profil.',
      };
    }

    const users = this.readUsers();
    const userIndex = users.findIndex(user => user.uid === activeUser.uid);

    if (userIndex < 0) {
      return {
        success: false,
        message: 'Profil introuvable.',
      };
    }

    const updatedUser: StoredUserRecord = {
      ...users[userIndex],
      displayName: payload.displayName.trim(),
      location: payload.location.trim(),
      profileTitle: this.cleanOptionalText(payload.profileTitle),
      bio: this.cleanOptionalText(payload.bio),
      skills: this.cleanTags(payload.skills),
      lookingFor: this.cleanTags(payload.lookingFor),
      availabilityLabel: this.cleanOptionalText(payload.availabilityLabel),
      githubUrl: this.cleanOptionalText(payload.githubUrl),
      linkedinUrl: this.cleanOptionalText(payload.linkedinUrl),
      websiteUrl: this.cleanOptionalText(payload.websiteUrl),
      photoURL: payload.photoURL?.trim() || undefined,
      lastActive: new Date().toISOString(),
    };

    updatedUser.profileComplete = this.computeProfileComplete(updatedUser);
    users[userIndex] = updatedUser;
    this.writeUsers(users);
    this.setAuthenticatedUser(updatedUser);

    return { success: true };
  }

  async signOut(): Promise<void> {
    this._currentUser.set(null);
    this.removeSession();
    await this.router.navigate(['/connexion']);
  }

  private restoreSession(): void {
    const sessionUserId = this.readSessionUserId();

    if (!sessionUserId) {
      return;
    }

    const storedUser = this.readUsers().find(user => user.uid === sessionUserId);

    if (!storedUser) {
      this.removeSession();
      return;
    }

    this._currentUser.set(this.toRuntimeUser(storedUser));
  }

  private setAuthenticatedUser(user: StoredUserRecord): void {
    this._currentUser.set(this.toRuntimeUser(user));
    this.writeSessionUserId(user.uid);
  }

  private resolvePostAuthUrl(returnUrl?: string | null): string {
    if (!returnUrl) {
      return '/dashboard';
    }

    const normalizedUrl = returnUrl.trim();

    if (!normalizedUrl.startsWith('/') || normalizedUrl.startsWith('//')) {
      return '/dashboard';
    }

    return normalizedUrl;
  }

  private readUsers(): StoredUserRecord[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);

    if (!rawUsers) {
      return [];
    }

    try {
      const parsedUsers = JSON.parse(rawUsers) as StoredUserRecord[];
      return Array.isArray(parsedUsers) ? parsedUsers : [];
    } catch {
      return [];
    }
  }

  private writeUsers(users: StoredUserRecord[]): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }

  private readSessionUserId(): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    return localStorage.getItem(SESSION_STORAGE_KEY);
  }

  private writeSessionUserId(userId: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(SESSION_STORAGE_KEY, userId);
  }

  private removeSession(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.removeItem(SESSION_STORAGE_KEY);
  }

  private toRuntimeUser(user: StoredUserRecord): User {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      location: user.location,
      profileType: user.profileType,
      profileTitle: user.profileTitle,
      bio: user.bio,
      skills: user.skills,
      lookingFor: user.lookingFor,
      availabilityLabel: user.availabilityLabel,
      githubUrl: user.githubUrl,
      linkedinUrl: user.linkedinUrl,
      websiteUrl: user.websiteUrl,
      plan: user.plan,
      maAccess: user.maAccess,
      stripeCustomerId: user.stripeCustomerId,
      createdAt: Timestamp.fromDate(new Date(user.createdAt)),
      lastActive: Timestamp.fromDate(new Date(user.lastActive)),
      profileComplete: user.profileComplete,
      verified: user.verified,
    };
  }

  private computeInitials(displayName: string): string {
    const parts = displayName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);

    if (parts.length === 0) {
      return 'GF';
    }

    return parts.map(part => part[0]?.toUpperCase() ?? '').join('');
  }

  private cleanOptionalText(value: string): string | undefined {
    const cleanedValue = value.trim();
    return cleanedValue ? cleanedValue : undefined;
  }

  private cleanTags(tags: string[]): string[] | undefined {
    const cleanedTags = tags
      .map(tag => tag.trim())
      .filter(Boolean)
      .slice(0, 12);

    return cleanedTags.length > 0 ? cleanedTags : undefined;
  }

  private computeProfileComplete(user: StoredUserRecord): number {
    const fields: Array<string | string[] | undefined> = [
      user.displayName,
      user.location,
      user.profileTitle,
      user.bio,
      user.photoURL,
      user.skills,
      user.lookingFor,
      user.availabilityLabel,
    ];

    const completedFields = fields.filter(field => Array.isArray(field) ? field.length > 0 : Boolean(field?.trim())).length;
    return Math.min(100, Math.round((completedFields / fields.length) * 100));
  }

  private createUid(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return `user-${Date.now()}`;
  }
}
