import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="bg-primary text-primary-foreground">
      <div class="max-w-[1400px] mx-auto px-8 py-16">
        <div class="grid grid-cols-4 gap-12 mb-12">

          <div>
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                <span class="text-white font-bold">G</span>
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

        <div class="pt-8 border-t border-primary-foreground/10 flex items-center justify-between">
          <p class="text-primary-foreground/60 text-sm">© 2026 GoFounders. Tous droits réservés.</p>
          <div class="flex items-center gap-4">
            <a href="#" class="w-9 h-9 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
              </svg>
            </a>
            <a href="#" class="w-9 h-9 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                <rect x="2" y="9" width="4" height="12"/>
                <circle cx="4" cy="4" r="2"/>
              </svg>
            </a>
            <a href="#" class="w-9 h-9 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
              </svg>
            </a>
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
        { label: 'À propos', href: '#' },
        { label: 'Blog', href: '#' },
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
        { label: 'CGU', href: '#' },
        { label: 'Confidentialité', href: '#' },
        { label: 'Mentions légales', href: '#' },
      ]
    },
  ];
}
