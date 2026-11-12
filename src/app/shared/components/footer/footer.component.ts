import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FEATURES } from '../../../core/config/features';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="bg-primary text-primary-foreground">
      <div class="mx-auto max-w-[78rem] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div class="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div class="flex items-center gap-2.5">
              <div class="brand-logo-mark h-8 w-8">
                <img src="/assets/images/gofounders-logo-256.png" alt="" class="h-full w-full object-contain">
              </div>
              <span class="font-display text-xl font-semibold">GoFounders</span>
            </div>
            <p class="mt-4 max-w-sm text-sm leading-relaxed text-primary-foreground/70">
              Reprendre ou céder une entreprise en France, et trouver ses associés. Annonces anonymisées, sans commission sur la vente
            </p>
          </div>

          <!-- Téléphones : rubriques dépliables pour raccourcir la page. -->
          <div class="-mt-4 divide-y divide-primary-foreground/15 border-y border-primary-foreground/15 sm:hidden">
            @for (section of footerSections; track section.category) {
              <details class="group">
                <summary class="flex cursor-pointer list-none items-center justify-between py-3.5 text-sm font-semibold text-primary-foreground">
                  {{ section.category }}
                  <span class="text-lg leading-none text-primary-foreground/60 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <nav [attr.aria-label]="section.category">
                  <ul class="space-y-2.5 pb-4">
                    @for (link of section.links; track link.label) {
                      <li>
                        <a [routerLink]="link.href" class="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">{{ link.label }}</a>
                      </li>
                    }
                  </ul>
                </nav>
              </details>
            }
          </div>

          @for (section of footerSections; track section.category) {
            <nav class="hidden sm:block" [attr.aria-label]="section.category">
              <h2 class="font-sans text-sm font-semibold text-primary-foreground">{{ section.category }}</h2>
              <ul class="mt-3 space-y-2">
                @for (link of section.links; track link.label) {
                  <li>
                    <a [routerLink]="link.href" class="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">{{ link.label }}</a>
                  </li>
                }
              </ul>
            </nav>
          }
        </div>

        <div class="mt-6 text-sm text-primary-foreground/60 sm:mt-10 sm:border-t sm:border-primary-foreground/15 sm:pt-6">
          <p>© 2026 GoFounders. GoFounders met en relation et n'assure pas de conseil juridique ou financier</p>
        </div>
      </div>
    </footer>
  `
})
export class FooterComponent {
  readonly footerSections = [
    {
      category: 'Services',
      links: [
        { label: 'Entreprises à reprendre', href: '/ma' },
        { label: 'Céder mon entreprise', href: '/ma/deposer' },
        { label: 'Estimer mon entreprise', href: '/estimation' },
        ...(FEATURES.associates ? [{ label: 'Associés & équipe', href: '/associes' }] : []),
        ...(FEATURES.pros ? [{ label: 'Annuaire des professionnels', href: '/pros' }] : []),
        { label: 'Tarifs', href: '/tarifs' },
      ],
    },
    {
      category: 'Aide',
      links: [
        { label: 'Questions fréquentes', href: '/faq' },
        { label: 'Nous contacter', href: '/contact' },
      ],
    },
    {
      category: 'Informations légales',
      links: [
        { label: 'Conditions générales', href: '/conditions-generales' },
        { label: 'Confidentialité', href: '/confidentialite' },
        { label: 'Mentions légales', href: '/mentions-legales' },
      ],
    },
  ];
}
