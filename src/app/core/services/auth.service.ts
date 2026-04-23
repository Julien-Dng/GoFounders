import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);

  private _currentUser = signal<User | null>(null);

  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);
  readonly plan = computed(() => this._currentUser()?.plan ?? 'FREE');
  readonly hasMaAccess = computed(() => this._currentUser()?.maAccess ?? false);

  isProOrAbove(): boolean {
    const plan = this.plan();
    return plan === 'PRO' || plan === 'PREMIUM';
  }

  isPremium(): boolean {
    return this.plan() === 'PREMIUM';
  }

  // Called after Firebase Auth resolves — set by auth initialization logic
  setUser(user: User | null): void {
    this._currentUser.set(user);
  }

  signOut(): void {
    this._currentUser.set(null);
    this.router.navigate(['/connexion']);
  }
}
