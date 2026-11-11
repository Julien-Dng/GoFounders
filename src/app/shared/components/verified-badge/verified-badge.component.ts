import { ChangeDetectionStrategy, Component, input } from '@angular/core';

// Badge « vérifié » façon réseaux sociaux : sceau bleu dentelé et coche blanche, placé juste après un titre.
// Le libellé sert d'info-bulle et de texte pour les lecteurs d'écran.
@Component({
  selector: 'app-verified-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex flex-shrink-0 align-[-0.12em]' },
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" role="img" [attr.aria-label]="label()">
      <title>{{ label() }}</title>
      <path fill="#1D9BF0" d="M21.60 12.00Q23.90 15.19 20.31 16.80Q20.71 20.71 16.80 20.31Q15.19 23.90 12.00 21.60Q8.81 23.90 7.20 20.31Q3.29 20.71 3.69 16.80Q0.10 15.19 2.40 12.00Q0.10 8.81 3.69 7.20Q3.29 3.29 7.20 3.69Q8.81 0.10 12.00 2.40Q15.19 0.10 16.80 3.69Q20.71 3.29 20.31 7.20Q23.90 8.81 21.60 12.00Z"/>
      <path d="M7.6 12.3l3 3 5.8-6.2" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,
})
export class VerifiedBadgeComponent {
  readonly size = input<number>(22);
  readonly label = input<string>('Dossier vérifié par GoFounders');
}
