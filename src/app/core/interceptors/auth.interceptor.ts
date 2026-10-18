import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { API_URL } from '../services/ai.service';
import { SupabaseService } from '../services/supabase.service';

// Ajoute le jeton de session Supabase aux appels vers le back Python ; le back le vérifie auprès de Supabase.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const supabase = inject(SupabaseService);

  if (!supabase.isConfigured || !req.url.startsWith(API_URL)) {
    return next(req);
  }

  return from(supabase.client.auth.getSession()).pipe(
    switchMap(({ data }) => {
      const token = data.session?.access_token;
      return next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req);
    })
  );
};
