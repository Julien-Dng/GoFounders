import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export type EmailPolicyErrorCode = 'emailAlias' | 'temporaryEmail' | 'invalidEmail';

export interface EmailPolicyResult {
  valid: boolean;
  code?: EmailPolicyErrorCode;
  message?: string;
}

export const EMAIL_POLICY_MESSAGES: Record<EmailPolicyErrorCode, string> = {
  emailAlias: 'Les alias email avec + ne sont pas acceptes.',
  temporaryEmail: 'Les adresses email temporaires ne sont pas acceptees.',
  invalidEmail: 'Utilisez une adresse email valide.',
};

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  '10minutemail.com',
  '10minutemail.net',
  '20minutemail.com',
  'burnermail.io',
  'dispostable.com',
  'emailondeck.com',
  'fakeinbox.com',
  'getnada.com',
  'grr.la',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamailblock.com',
  'inboxkitten.com',
  'maildrop.cc',
  'mailinator.com',
  'mintemail.com',
  'moakt.com',
  'mytemp.email',
  'sharklasers.com',
  'temp-mail.org',
  'tempail.com',
  'tempmail.com',
  'tempmailo.com',
  'throwawaymail.com',
  'tmail.io',
  'trashmail.com',
  'yopmail.com',
  'yopmail.fr',
]);

export function validateRegistrationEmail(rawEmail: string): EmailPolicyResult {
  const email = rawEmail.trim().toLowerCase();

  if (!email) {
    return { valid: true };
  }

  const atIndex = email.lastIndexOf('@');

  if (atIndex <= 0 || atIndex === email.length - 1) {
    return {
      valid: false,
      code: 'invalidEmail',
      message: EMAIL_POLICY_MESSAGES.invalidEmail,
    };
  }

  const localPart = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);

  if (localPart.includes('+')) {
    return {
      valid: false,
      code: 'emailAlias',
      message: EMAIL_POLICY_MESSAGES.emailAlias,
    };
  }

  if (isDisposableDomain(domain)) {
    return {
      valid: false,
      code: 'temporaryEmail',
      message: EMAIL_POLICY_MESSAGES.temporaryEmail,
    };
  }

  return { valid: true };
}

export function registrationEmailValidator(): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    const result = validateRegistrationEmail(control.value ?? '');

    if (result.valid || !result.code) {
      return null;
    }

    return { [result.code]: true };
  };
}

function isDisposableDomain(domain: string): boolean {
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return true;
  }

  return Array.from(DISPOSABLE_EMAIL_DOMAINS).some(blockedDomain =>
    domain.endsWith(`.${blockedDomain}`)
  );
}
