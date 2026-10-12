import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Règle de mot de passe de l'inscription et de la réinitialisation.
// À garder alignée sur Supabase : Authentication > Sign In / Providers > Email (8 caractères minimum,
// lettres et chiffres), qui applique la règle côté serveur.

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

export interface PasswordRule {
  id: 'length' | 'letter' | 'digit' | 'common';
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', label: `${PASSWORD_MIN_LENGTH} caractères minimum`, test: password => password.length >= PASSWORD_MIN_LENGTH },
  { id: 'letter', label: 'Au moins une lettre', test: password => /\p{L}/u.test(password) },
  { id: 'digit', label: 'Au moins un chiffre', test: password => /\d/.test(password) },
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
