import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { canAccessMaDetails } from '../models/user.model';
import { AuthService } from '../services/auth.service';

// Dossier M&A complet : réservé aux acheteurs ayant payé l'accès (vérifié aussi côté Supabase).
export const maAccessGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ensureSessionReady();

  if (canAccessMaDetails(auth.currentUser()?.profileType) && auth.hasMaAccess()) {
    return true;
  }

  return router.createUrlTree(['/ma'], { queryParams: { access: 'required' } });
};
