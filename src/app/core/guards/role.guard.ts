import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { ProfileType } from '../models/user.model';
import { AuthService } from '../services/auth.service';

// Restreint une route aux rôles listés dans route.data.allowedRoles ; les autres rôles vont sur le M&A.
export const roleGuard: CanActivateFn = async (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ensureSessionReady();

  const allowedRoles = (route.data['allowedRoles'] as ProfileType[] | undefined) ?? [];
  const profileType = auth.currentUser()?.profileType;

  if (profileType && allowedRoles.includes(profileType)) {
    return true;
  }

  return router.createUrlTree(['/ma']);
};
