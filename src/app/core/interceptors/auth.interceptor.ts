import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const user = auth.currentUser();

  // Firebase Auth token will be attached here once Firebase is integrated
  if (user) {
    const cloned = req.clone({
      setHeaders: { 'X-User-Id': user.uid },
    });
    return next(cloned);
  }

  return next(req);
};
