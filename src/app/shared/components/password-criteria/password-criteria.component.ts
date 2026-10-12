import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { PASSWORD_RULES, PasswordRule } from '../../../core/validators/password-policy.validator';

// Critères du mot de passe, cochés au fur et à mesure de la saisie.
@Component({
  selector: 'app-password-criteria',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="mt-2 grid gap-1 text-xs sm:grid-cols-2" aria-live="polite" aria-label="Critères du mot de passe">
      @for (rule of rules; track rule.id) {
        <li class="flex items-center gap-1.5" [class.text-success]="isMet(rule)" [class.text-muted-foreground]="!isMet(rule)">
          <span aria-hidden="true">{{ isMet(rule) ? '✓' : '○' }}</span>
          <span>{{ rule.label }}</span>
          <span class="sr-only">{{ isMet(rule) ? '(respecté)' : '(non respecté)' }}</span>
        </li>
      }
    </ul>
  `,
})
export class PasswordCriteriaComponent {
  @Input() password = '';

  readonly rules = PASSWORD_RULES;

  isMet(rule: PasswordRule): boolean {
    return rule.test(this.password.trim());
  }
}
