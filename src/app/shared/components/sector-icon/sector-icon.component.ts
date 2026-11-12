import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

type SectorKind = 'shop' | 'tech' | 'food' | 'craft' | 'services' | 'health' | 'industry' | 'media' | 'training' | 'other';

// Pictogramme et teinte d'un secteur d'activité : donne une identité visuelle aux cartes (annonces, projets).
// Le secteur est un texte libre : on reconnaît les familles courantes, sinon un pictogramme générique.
const RULES: Array<[RegExp, SectorKind]> = [
  [/saas|logiciel|tech|numérique|app|développement|data|ia\b/i, 'tech'],
  [/e-?commerce|commerce|boutique|épicerie|retail|marketplace|place de marché/i, 'shop'],
  [/restaura|boulang|café|traiteur|food|bar\b|hôtel/i, 'food'],
  [/artisan|bâtiment|menuis|btp|garage|atelier/i, 'craft'],
  [/santé|médic|kiné|pharma|bien-être|beauté/i, 'health'],
  [/industri|fabrication|usine|production/i, 'industry'],
  [/contenu|média|site|blog|édition|presse/i, 'media'],
  [/formation|éducation|cours|école/i, 'training'],
  [/service|agence|conseil|cabinet|rh\b/i, 'services'],
];

const TINTS: Record<SectorKind, string> = {
  tech: 'bg-blue-50 text-blue-700',
  shop: 'bg-amber-50 text-amber-700',
  food: 'bg-orange-50 text-orange-700',
  craft: 'bg-stone-100 text-stone-700',
  health: 'bg-rose-50 text-rose-700',
  industry: 'bg-slate-100 text-slate-700',
  media: 'bg-violet-50 text-violet-700',
  training: 'bg-teal-50 text-teal-700',
  services: 'bg-indigo-50 text-indigo-700',
  other: 'bg-secondary text-primary',
};

@Component({
  selector: 'app-sector-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex flex-shrink-0' },
  template: `
    <span class="flex items-center justify-center rounded-xl" [class]="tint()" [style.width.px]="size()" [style.height.px]="size()" aria-hidden="true">
      <svg [attr.width]="size() * 0.5" [attr.height]="size() * 0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        @switch (kind()) {
          @case ('tech') { <rect x="3" y="4" width="18" height="13" rx="2"/><path d="M9 21h6M12 17v4M9.5 9l-2 1.8 2 1.7M14.5 9l2 1.8-2 1.7"/> }
          @case ('shop') { <path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/> }
          @case ('food') { <path d="M7 3v8a2 2 0 0 0 2 2v8M11 3v6M7 3v6M17 3c-1.7 1.3-2.5 3.6-2.5 6.5 0 1.7.9 2.5 2.5 2.5v9"/> }
          @case ('craft') { <path d="M14.5 6.5l3 3M4 20l9.5-9.5M15 4l5 5-2.5 2.5-5-5z"/> }
          @case ('health') { <path d="M20.8 8.6a5 5 0 0 0-8.8-3.2 5 5 0 0 0-8.8 3.2c0 5.3 8.8 11.4 8.8 11.4s8.8-6.1 8.8-11.4z"/><path d="M8 11h2.5l1.5-2.5 2 5 1.5-2.5H16"/> }
          @case ('industry') { <path d="M3 21V10l6 3.5V10l6 3.5V5h6v16z"/><path d="M7 17h2M12 17h2M17 17h1"/> }
          @case ('media') { <rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/> }
          @case ('training') { <path d="M2.5 9L12 4.5 21.5 9 12 13.5z"/><path d="M6.5 11v4.5c1.5 1.5 3.4 2.2 5.5 2.2s4-.7 5.5-2.2V11"/> }
          @case ('services') { <rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/> }
          @default { <path d="M4 21V8l8-5 8 5v13"/><path d="M9 21v-6h6v6"/> }
        }
      </svg>
    </span>
  `,
})
export class SectorIconComponent {
  readonly sector = input<string>('');
  readonly size = input(40);

  readonly kind = computed<SectorKind>(() => RULES.find(([pattern]) => pattern.test(this.sector() ?? ''))?.[1] ?? 'other');
  readonly tint = computed(() => TINTS[this.kind()]);
}
