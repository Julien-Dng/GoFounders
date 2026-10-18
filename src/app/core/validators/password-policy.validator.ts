import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Règle de mot de passe de l'inscription et de la réinitialisation.
// Identique à Supabase (Authentication > Sign In / Providers > Email) : 8 caractères minimum et
// « Lowercase, uppercase letters, digits and symbols », appliquée côté serveur.
// Supabase ne compte que les lettres non accentuées (a-z, A-Z) et les symboles ci-dessous.

export const PASSWORD_MIN_LENGTH = 8;

// Mots de passe parmi les plus utilisés en France, refusés même s'ils respectent les autres critères.
const COMMON_PASSWORDS = new Set([
  '12345678', '123456789', '1234567890', '00000000', '11111111', '12341234', '87654321',
  'password', 'password1', 'password123', 'motdepasse', 'motdepasse1', 'motdepasse123',
  'azerty12', 'azerty123', 'azerty1234', 'azertyuiop', 'qwerty12', 'qwerty123', 'qwertyuiop',
  'abc12345', 'abcd1234', '1234abcd', 'admin123', 'administrateur', 'bonjour1', 'bonjour123',
  'soleil123', 'iloveyou1', 'jetaime1', 'jetaime123', 'doudou123', 'chocolat1', 'loulou123',
  'marseille13', 'football1', 'test1234', 'welcome1', 'gofounders', 'gofounders1', 'gofounders123',
]);

// Liste des symboles acceptés par Supabase : !@#$%^&*()_+-=[]{};'\:"|<>?,./`~
const SUPABASE_SYMBOLS = /[!@#$%^&*()_+\-=[\]{};'\\:"|<>?,./`~]/;

export interface PasswordRule {
  id: 'length' | 'lowercase' | 'uppercase' | 'digit' | 'symbol' | 'common';
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', label: `${PASSWORD_MIN_LENGTH} caractères minimum`, test: password => password.length >= PASSWORD_MIN_LENGTH },
  { id: 'lowercase', label: 'Une minuscule (a-z)', test: password => /[a-z]/.test(password) },
  { id: 'uppercase', label: 'Une majuscule (A-Z)', test: password => /[A-Z]/.test(password) },
  { id: 'digit', label: 'Un chiffre', test: password => /[0-9]/.test(password) },
  { id: 'symbol', label: 'Un symbole (! ? @ # - _ …)', test: password => SUPABASE_SYMBOLS.test(password) },
  {
    id: 'common',
    label: 'Pas un mot de passe trop courant',
    test: password => password.length > 0 && !COMMON_PASSWORDS.has(password.toLowerCase()),
  },
];

export function failedPasswordRules(password: string): PasswordRule['id'][] {
  const value = password.trim();
  return PASSWORD_RULES.filter(rule => !rule.test(value)).map(rule => rule.id);
}

export const passwordPolicyValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const failed = failedPasswordRules(String(control.value ?? ''));
  return failed.length > 0 ? { passwordPolicy: failed } : null;
};
