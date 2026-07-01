import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const maAccessGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ensureSessionReady();

  if (auth.hasMaAccess()) {
    return true;
  }

  return router.createUrlTree(['/ma'], { queryParams: { access: 'required' } });
};
