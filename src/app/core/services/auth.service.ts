import { Injectable, computed, inject, signal } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { SupabaseProfileInsert, SupabaseProfileRow, SupabaseProjectInsert } from '../models/supabase-database.model';
import { Plan, ProfileType, User } from '../models/user.model';
import { validateRegistrationEmail } from '../validators/email-policy.validator';
import { SupabaseService } from './supabase.service';

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
  isAdmin?: boolean;
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
  projectName?: string;
  projectSector?: string;
  projectStage?: string;
  talentHeadline?: string;
  talentSkill?: string;
  talentAvailability?: boolean;
  maSector?: string;
  maBudget?: string;
  maRegion?: string;
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
  private readonly supabase = inject(SupabaseService);
  private readonly _currentUser = signal<User | null>(null);
  private readonly readyPromise: Promise<void>;

  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);
  readonly plan = computed(() => this._currentUser()?.plan ?? 'FREE');
  readonly hasMaAccess = computed(() => this._currentUser()?.maAccess ?? false);
  readonly isAdmin = computed(() => this._currentUser()?.isAdmin ?? false);
  readonly initials = computed(() => this.computeInitials(this._currentUser()?.displayName ?? ''));

  constructor() {
    this.readyPromise = this.restoreSession();

    if (this.supabase.isConfigured) {
      this.supabase.client.auth.onAuthStateChange((_event, session) => {
        void this.syncSupabaseAuthUser(session?.user ?? null);
      });
    }
  }

  async ensureSessionReady(): Promise<void> {
    await this.readyPromise;
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
    if (this.supabase.isConfigured) {
      return this.signInWithSupabase(payload, returnUrl);
    }

    return this.signInLocally(payload, returnUrl);
  }

  async signUp(payload: SignUpPayload, returnUrl?: string | null): Promise<AuthResult> {
    const emailPolicy = validateRegistrationEmail(payload.email);

    if (!emailPolicy.valid) {
      return {
        success: false,
        message: emailPolicy.message ?? 'Email refuse.',
      };
    }

    if (this.supabase.isConfigured) {
      return this.signUpWithSupabase(payload, returnUrl);
    }

    return this.signUpLocally(payload, returnUrl);
  }

  async grantMaAccess(): Promise<boolean> {
    const activeUser = this._currentUser();

    if (!activeUser) {
      return false;
    }

    if (this.supabase.isConfigured) {
      const { error } = await this.supabase.client
        .from('profiles')
        .update({ ma_access: true })
        .eq('id', activeUser.uid);
      if (error) {
        return false;
      }
      this._currentUser.set({ ...activeUser, maAccess: true });
      return true;
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

    if (this.supabase.isConfigured) {
      const { error } = await this.supabase.client
        .from('profiles')
        .update({ plan })
        .eq('id', activeUser.uid);
      if (error) {
        return false;
      }
      this._currentUser.set({ ...activeUser, plan });
      return true;
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
    if (this.supabase.isConfigured) {
      return this.updateProfileWithSupabase(payload);
    }

    return this.updateProfileLocally(payload);
  }

  async signOut(): Promise<void> {
    if (this.supabase.isConfigured) {
      await this.supabase.client.auth.signOut();
    }

    this._currentUser.set(null);
    this.removeSession();
    await this.router.navigate(['/connexion']);
  }

  private async signInWithSupabase(payload: SignInPayload, returnUrl?: string | null): Promise<AuthResult> {
    const email = payload.email.trim().toLowerCase();
    const password = payload.password.trim();
    const { data, error } = await this.supabase.client.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      return {
        success: false,
        message: error?.message ?? 'Email ou mot de passe incorrect.',
      };
    }

    if (!data.user.email_confirmed_at) {
      await this.supabase.client.auth.signOut();

      return {
        success: false,
        message: 'Confirmez votre email avant de vous connecter.',
      };
    }

    const loaded = await this.loadSupabaseProfile(data.user.id, data.user);

    if (!loaded) {
      return {
        success: false,
        message: 'Compte authentifie, mais profil GoFounders introuvable.',
      };
    }

    await this.router.navigateByUrl(this.resolvePostAuthUrl(returnUrl));
    return { success: true };
  }

  private async signUpWithSupabase(payload: SignUpPayload, returnUrl?: string | null): Promise<AuthResult> {
    const email = payload.email.trim().toLowerCase();
    const password = payload.password.trim();
    const { data, error } = await this.supabase.client.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: payload.displayName.trim(),
          profile_type: payload.profileType,
          location: payload.location.trim(),
          profile_title: this.buildInitialProfileTitle(payload) ?? '',
          skills: this.buildInitialSkills(payload) ?? [],
          looking_for: this.buildInitialLookingFor(payload) ?? [],
          availability_label: payload.profileType === 'talent' && payload.talentAvailability ? 'Disponible rapidement' : '',
          project_name: payload.projectName?.trim() ?? '',
          project_sector: payload.projectSector?.trim() ?? '',
          project_stage: payload.projectStage?.trim() ?? 'mvp',
        },
      },
    });

    if (error || !data.user) {
      return {
        success: false,
        message: error?.message ?? 'Creation du compte impossible.',
      };
    }

    if (!data.session || !data.user.email_confirmed_at) {
      if (data.session) {
        await this.supabase.client.auth.signOut();
      }

      await this.router.navigate(['/connexion'], {
        queryParams: {
          email,
          confirmation: '1',
          ...(returnUrl ? { returnUrl } : {}),
        },
      });

      return {
        success: true,
        message: 'Compte cree. Confirmez votre email, puis connectez-vous.',
      };
    }

    const { profile, errorMessage } = await this.saveSupabaseProfileAfterSignUp(data.user.id, email, payload);

    if (!profile) {
      return {
        success: false,
        message: errorMessage ?? 'Compte cree, mais profil impossible a enregistrer.',
      };
    }

    if (payload.profileType === 'entrepreneur') {
      await this.createInitialProject(profile.id, payload);
    }

    this._currentUser.set(this.toRuntimeUserFromSupabaseProfile(profile, data.user));
    await this.router.navigateByUrl(this.resolvePostAuthUrl(returnUrl));

    return { success: true };
  }

  private async saveSupabaseProfileAfterSignUp(
    userId: string,
    email: string,
    payload: SignUpPayload
  ): Promise<{ profile: SupabaseProfileRow | null; errorMessage?: string }> {
    const { data: existingProfile } = await this.supabase.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (existingProfile) {
      const { data, error } = await this.supabase.client
        .from('profiles')
        .update({
          display_name: payload.displayName.trim(),
          location: payload.location.trim(),
          title: this.buildInitialProfileTitle(payload) ?? null,
          skills: this.buildInitialSkills(payload) ?? [],
          looking_for: this.buildInitialLookingFor(payload) ?? [],
          availability_label: payload.profileType === 'talent' && payload.talentAvailability ? 'Disponible rapidement' : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select('*')
        .single();

      return {
        profile: data as SupabaseProfileRow | null,
        errorMessage: error?.message,
      };
    }

    const profileInsert = this.buildSupabaseProfileInsert(userId, email, payload);
    const { data, error } = await this.supabase.client
      .from('profiles')
      .insert(profileInsert)
      .select('*')
      .single();

    return {
      profile: data as SupabaseProfileRow | null,
      errorMessage: error?.message,
    };
  }

  private async updateProfileWithSupabase(payload: UpdateProfilePayload): Promise<AuthResult> {
    const activeUser = this._currentUser();

    if (!activeUser) {
      return {
        success: false,
        message: 'Vous devez etre connecte pour modifier votre profil.',
      };
    }

    let photoUrl = payload.photoURL?.trim() || null;

    if (photoUrl?.startsWith('data:image/')) {
      const uploadedPhotoUrl = await this.uploadAvatar(activeUser.uid, photoUrl);
      photoUrl = uploadedPhotoUrl ?? activeUser.photoURL ?? null;
    }

    const { data, error } = await this.supabase.client
      .from('profiles')
      .update({
        display_name: payload.displayName.trim(),
        location: this.cleanOptionalText(payload.location) ?? null,
        title: this.cleanOptionalText(payload.profileTitle) ?? null,
        bio: this.cleanOptionalText(payload.bio) ?? null,
        skills: this.cleanTags(payload.skills) ?? [],
        looking_for: this.cleanTags(payload.lookingFor) ?? [],
        availability_label: this.cleanOptionalText(payload.availabilityLabel) ?? null,
        github_url: this.cleanOptionalText(payload.githubUrl) ?? null,
        linkedin_url: this.cleanOptionalText(payload.linkedinUrl) ?? null,
        website_url: this.cleanOptionalText(payload.websiteUrl) ?? null,
        photo_url: photoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', activeUser.uid)
      .select('*')
      .single();

    if (error || !data) {
      return {
        success: false,
        message: error?.message ?? 'Impossible de sauvegarder le profil.',
      };
    }

    this._currentUser.set(this.toRuntimeUserFromSupabaseProfile(data));
    return { success: true };
  }

  private async restoreSession(): Promise<void> {
    if (!this.supabase.isConfigured) {
      this.restoreLocalSession();
      return;
    }

    const { data } = await this.supabase.client.auth.getSession();
    await this.syncSupabaseAuthUser(data.session?.user ?? null);
  }

  private restoreLocalSession(): void {
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

  private async syncSupabaseAuthUser(authUser: SupabaseAuthUser | null): Promise<void> {
    if (!authUser) {
      this._currentUser.set(null);
      return;
    }

    await this.loadSupabaseProfile(authUser.id, authUser);
  }

  private async loadSupabaseProfile(userId: string, authUser?: SupabaseAuthUser): Promise<boolean> {
    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      this._currentUser.set(null);
      return false;
    }

    const profile = data ?? (authUser ? await this.createSupabaseProfileFromAuthUser(authUser) : null);

    if (!profile) {
      this._currentUser.set(null);
      return false;
    }

    this._currentUser.set(this.toRuntimeUserFromSupabaseProfile(profile, authUser));
    return true;
  }

  private async createSupabaseProfileFromAuthUser(authUser: SupabaseAuthUser): Promise<SupabaseProfileRow | null> {
    const metadata = authUser.user_metadata as Record<string, unknown>;
    const email = authUser.email?.trim().toLowerCase() ?? '';
    const profileInsert: SupabaseProfileInsert = {
      id: authUser.id,
      email,
      display_name: this.readMetadataText(metadata, 'display_name') ?? this.deriveDisplayNameFromEmail(email),
      role: this.readMetadataProfileType(metadata, 'profile_type'),
      plan: 'FREE',
      ma_access: false,
      location: this.readMetadataText(metadata, 'location') ?? null,
      title: this.readMetadataText(metadata, 'profile_title') ?? null,
      skills: this.readMetadataStringArray(metadata, 'skills') ?? [],
      looking_for: this.readMetadataStringArray(metadata, 'looking_for') ?? [],
      availability_label: this.readMetadataText(metadata, 'availability_label') ?? null,
    };

    const { data, error } = await this.supabase.client
      .from('profiles')
      .insert(profileInsert)
      .select('*')
      .single();

    if (error || !data) {
      return null;
    }

    return data as SupabaseProfileRow;
  }

  private async createInitialProject(ownerId: string, payload: SignUpPayload): Promise<void> {
    const projectName = this.cleanOptionalText(payload.projectName) ?? `${payload.displayName.trim()} - projet`;
    const project: SupabaseProjectInsert = {
      owner_id: ownerId,
      name: projectName,
      sector: this.cleanOptionalText(payload.projectSector) ?? null,
      stage: this.cleanOptionalText(payload.projectStage) ?? 'mvp',
      description: null,
      looking_for: [],
      skills_needed: [],
      location: this.cleanOptionalText(payload.location) ?? null,
      is_active: true,
    };

    const { error } = await this.supabase.client.from('projects').insert(project);

    if (error) {
      console.warn('Projet initial non cree dans Supabase:', error.message);
    }
  }

  private async uploadAvatar(userId: string, dataUrl: string): Promise<string | null> {
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const extension = this.getImageExtension(blob.type);
      const filePath = `${userId}/avatar-${Date.now()}.${extension}`;
      const { error } = await this.supabase.client.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: blob.type,
          upsert: true,
        });

      if (error) {
        console.warn('Avatar non envoye dans Supabase Storage:', error.message);
        return null;
      }

      const { data } = this.supabase.client.storage.from('avatars').getPublicUrl(filePath);
      return data.publicUrl;
    } catch {
      return null;
    }
  }

  private signInLocally(payload: SignInPayload, returnUrl?: string | null): Promise<AuthResult> {
    const users = this.readUsers();
    const email = payload.email.trim().toLowerCase();
    const password = payload.password.trim();
    const userIndex = users.findIndex(user => user.email === email && user.password === password);

    if (userIndex < 0) {
      return Promise.resolve({
        success: false,
        message: 'Email ou mot de passe incorrect.',
      });
    }

    const updatedUser: StoredUserRecord = {
      ...users[userIndex],
      lastActive: new Date().toISOString(),
    };

    users[userIndex] = updatedUser;
    this.writeUsers(users);
    this.setAuthenticatedUser(updatedUser);

    return this.router.navigateByUrl(this.resolvePostAuthUrl(returnUrl)).then(() => ({ success: true }));
  }

  private signUpLocally(payload: SignUpPayload, returnUrl?: string | null): Promise<AuthResult> {
    const users = this.readUsers();
    const email = payload.email.trim().toLowerCase();

    if (users.some(user => user.email === email)) {
      return Promise.resolve({
        success: false,
        message: 'Un compte existe deja avec cet email.',
      });
    }

    const now = new Date().toISOString();
    const newUser: StoredUserRecord = {
      uid: this.createUid(),
      email,
      password: payload.password.trim(),
      displayName: payload.displayName.trim(),
      location: payload.location.trim(),
      profileType: payload.profileType,
      profileTitle: this.buildInitialProfileTitle(payload),
      skills: this.buildInitialSkills(payload),
      lookingFor: this.buildInitialLookingFor(payload),
      availabilityLabel: payload.profileType === 'talent' && payload.talentAvailability ? 'Disponible rapidement' : undefined,
      plan: 'FREE',
      maAccess: false,
      createdAt: now,
      lastActive: now,
      profileComplete: 65,
      verified: false,
    };

    newUser.profileComplete = this.computeProfileComplete(newUser);
    users.push(newUser);
    this.writeUsers(users);
    this.setAuthenticatedUser(newUser);

    return this.router.navigateByUrl(this.resolvePostAuthUrl(returnUrl)).then(() => ({ success: true }));
  }

  private async updateProfileLocally(payload: UpdateProfilePayload): Promise<AuthResult> {
    const activeUser = this._currentUser();

    if (!activeUser) {
      return {
        success: false,
        message: 'Vous devez etre connecte pour modifier votre profil.',
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

  private buildSupabaseProfileInsert(userId: string, email: string, payload: SignUpPayload): SupabaseProfileInsert {
    return {
      id: userId,
      email,
      display_name: payload.displayName.trim(),
      role: payload.profileType,
      plan: 'FREE',
      ma_access: false,
      location: payload.location.trim(),
      title: this.buildInitialProfileTitle(payload) ?? null,
      skills: this.buildInitialSkills(payload) ?? [],
      looking_for: this.buildInitialLookingFor(payload) ?? [],
      availability_label: payload.profileType === 'talent' && payload.talentAvailability ? 'Disponible rapidement' : null,
    };
  }

  private buildInitialProfileTitle(payload: SignUpPayload): string | undefined {
    if (payload.profileType === 'entrepreneur') {
      return this.cleanOptionalText(payload.projectName);
    }

    if (payload.profileType === 'talent') {
      return this.cleanOptionalText(payload.talentHeadline);
    }

    if (payload.profileType === 'buyer') {
      return this.cleanOptionalText(payload.maSector) ? `Recherche M&A - ${payload.maSector?.trim()}` : undefined;
    }

    return this.cleanOptionalText(payload.maSector) ? `Cession M&A - ${payload.maSector?.trim()}` : undefined;
  }

  private buildInitialSkills(payload: SignUpPayload): string[] | undefined {
    if (payload.profileType !== 'talent') {
      return undefined;
    }

    return this.cleanTags([payload.talentSkill ?? '']);
  }

  private buildInitialLookingFor(payload: SignUpPayload): string[] | undefined {
    if (payload.profileType === 'entrepreneur') {
      return this.cleanTags(['Talent', payload.projectSector ?? '']);
    }

    if (payload.profileType === 'talent') {
      return this.cleanTags(['Projet entrepreneurial']);
    }

    return this.cleanTags([payload.maBudget ?? '', payload.maRegion ?? '']);
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
      isAdmin: user.isAdmin ?? false,
      stripeCustomerId: user.stripeCustomerId,
      createdAt: Timestamp.fromDate(new Date(user.createdAt)),
      lastActive: Timestamp.fromDate(new Date(user.lastActive)),
      profileComplete: user.profileComplete,
      verified: user.verified,
    };
  }

  private toRuntimeUserFromSupabaseProfile(profile: SupabaseProfileRow, authUser?: SupabaseAuthUser): User {
    return {
      uid: profile.id,
      email: profile.email || authUser?.email || '',
      displayName: profile.display_name,
      photoURL: profile.photo_url ?? undefined,
      location: profile.location ?? '',
      profileType: profile.role,
      profileTitle: profile.title ?? undefined,
      bio: profile.bio ?? undefined,
      skills: profile.skills ?? undefined,
      lookingFor: profile.looking_for ?? undefined,
      availabilityLabel: profile.availability_label ?? undefined,
      githubUrl: profile.github_url ?? undefined,
      linkedinUrl: profile.linkedin_url ?? undefined,
      websiteUrl: profile.website_url ?? undefined,
      plan: profile.plan,
      maAccess: profile.ma_access,
      isAdmin: profile.is_admin ?? false,
      createdAt: Timestamp.fromDate(new Date(profile.created_at)),
      lastActive: Timestamp.fromDate(new Date(profile.updated_at)),
      profileComplete: this.computeProfileCompleteFromFields([
        profile.display_name,
        profile.location,
        profile.title,
        profile.bio,
        profile.photo_url,
        profile.skills,
        profile.looking_for,
        profile.availability_label,
      ]),
      verified: Boolean(authUser?.email_confirmed_at),
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

  private readMetadataText(metadata: Record<string, unknown>, key: string): string | undefined {
    const value = metadata[key];

    if (typeof value !== 'string') {
      return undefined;
    }

    return this.cleanOptionalText(value);
  }

  private readMetadataStringArray(metadata: Record<string, unknown>, key: string): string[] | undefined {
    const value = metadata[key];

    if (!Array.isArray(value)) {
      return undefined;
    }

    return this.cleanTags(value.filter((item): item is string => typeof item === 'string'));
  }

  private readMetadataProfileType(metadata: Record<string, unknown>, key: string): ProfileType {
    const value = metadata[key];

    if (value === 'entrepreneur' || value === 'talent' || value === 'buyer' || value === 'seller') {
      return value;
    }

    return 'talent';
  }

  private deriveDisplayNameFromEmail(email: string): string {
    const localPart = email.split('@')[0]?.trim();
    return localPart ? localPart : 'Utilisateur GoFounders';
  }

  private cleanOptionalText(value: string | undefined): string | undefined {
    const cleanedValue = value?.trim() ?? '';
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
    return this.computeProfileCompleteFromFields([
      user.displayName,
      user.location,
      user.profileTitle,
      user.bio,
      user.photoURL,
      user.skills,
      user.lookingFor,
      user.availabilityLabel,
    ]);
  }

  private computeProfileCompleteFromFields(fields: Array<string | string[] | null | undefined>): number {
    const completedFields = fields.filter(field => Array.isArray(field) ? field.length > 0 : Boolean(field?.trim())).length;
    return Math.min(100, Math.round((completedFields / fields.length) * 100));
  }

  private getImageExtension(mimeType: string): string {
    if (mimeType === 'image/png') {
      return 'png';
    }

    if (mimeType === 'image/webp') {
      return 'webp';
    }

    return 'jpg';
  }

  private createUid(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return `user-${Date.now()}`;
  }
}
