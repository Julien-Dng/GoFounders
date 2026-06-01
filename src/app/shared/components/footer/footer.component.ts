import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="bg-primary text-primary-foreground">
      <div class="max-w-[1400px] mx-auto px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div class="grid grid-cols-1 gap-10 mb-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">

          <div class="sm:col-span-2 lg:col-span-1">
            <div class="flex items-center gap-3 mb-4">
              <div class="brand-logo-mark h-11 w-11">
                <img
                  src="/assets/images/gofounders-logo.png"
                  alt="Logo GoFounders"
                  class="h-full w-full object-contain"
                >
              </div>
              <span class="text-2xl font-bold">GoFounders</span>
            </div>
            <p class="text-primary-foreground/70 text-sm leading-relaxed">
              La plateforme qui connecte entrepreneurs, talents et opportunités business.
            </p>
          </div>

          @for (section of footerSections; track section.category) {
            <div>
              <h3 class="font-semibold mb-4">{{ section.category }}</h3>
              <ul class="space-y-2">
                @for (link of section.links; track link.label) {
                  <li>
                    <a [routerLink]="link.href" class="text-primary-foreground/70 hover:text-primary-foreground text-sm transition-colors">
                      {{ link.label }}
                    </a>
                  </li>
                }
              </ul>
            </div>
          }

        </div>

        <div class="pt-8 border-t border-primary-foreground/10 flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-primary-foreground/60 text-sm">© 2026 GoFounders. Tous droits réservés.</p>
          <div class="flex items-center gap-4" aria-label="Réseaux sociaux bientôt disponibles">
            <span class="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-full bg-primary-foreground/10 opacity-60" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
              </svg>
            </span>
            <span class="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-full bg-primary-foreground/10 opacity-60" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                <rect x="2" y="9" width="4" height="12"/>
                <circle cx="4" cy="4" r="2"/>
              </svg>
            </span>
            <span class="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-full bg-primary-foreground/10 opacity-60" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
              </svg>
            </span>
          </div>
        </div>
      </div>
    </footer>
  `
})
export class FooterComponent {
  readonly footerSections = [
    {
      category: 'Entreprise',
      links: [
        { label: 'Tarifs', href: '/tarifs' },
      ]
    },
    {
      category: 'Services',
      links: [
        { label: 'M&A', href: '/ma' },
        { label: 'Recherche', href: '/recherche' },
        { label: 'Pitch IA', href: '/generateur-pitch' },
      ]
    },
    {
      category: 'Légal',
      links: [
        { label: 'CGU', href: '/conditions-generales' },
        { label: 'Confidentialité', href: '/confidentialite' },
        { label: 'Mentions légales', href: '/mentions-legales' },
      ]
    },
  ];
}
