import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="bg-primary text-primary-foreground">
      <div class="mx-auto max-w-[78rem] px-4 py-12 sm:px-6 lg:px-8">
        <div class="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div class="flex items-center gap-2.5">
              <div class="brand-logo-mark h-8 w-8">
                <img src="/assets/images/gofounders-logo-256.png" alt="" class="h-full w-full object-contain">
              </div>
              <span class="font-display text-xl font-semibold">GoFounders</span>
            </div>
            <p class="mt-4 max-w-sm text-sm leading-relaxed text-primary-foreground/70">
              Reprendre ou céder une entreprise numérique en France, et trouver ses associés. Annonces anonymisées, sans commission sur la vente.
            </p>
          </div>

          @for (section of footerSections; track section.category) {
            <nav [attr.aria-label]="section.category">
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

        <div class="mt-10 border-t border-primary-foreground/15 pt-6 text-sm text-primary-foreground/60">
          <p>© 2026 GoFounders. GoFounders met en relation et n'assure pas de conseil juridique ou financier.</p>
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
        { label: 'Trouver un associé', href: '/associes' },
        { label: 'Annuaire des professionnels', href: '/pros' },
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
