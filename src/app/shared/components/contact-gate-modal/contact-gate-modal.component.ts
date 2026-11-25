import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, HostListener, OnDestroy, OnInit, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

export type ContactGateKind = 'projet' | 'associe';

const CONTENT: Record<ContactGateKind, { title: string; text: string; points: string[]; cta: string; path: string }> = {
  projet: {
    title: 'Finalisez d’abord votre projet',
    text: 'Pour écrire à un associé, votre projet doit être présenté. Il peut rester en brouillon : seuls les associés à qui vous écrivez le liront',
    points: ['Un titre', 'Une présentation d’au moins 50 caractères', 'Au moins une compétence recherchée'],
    cta: 'Finaliser mon projet',
    path: '/mon-projet',
  },
  associe: {
    title: 'Complétez d’abord votre profil d’associé',
    text: 'Pour écrire à un porteur de projet, votre profil d’associé doit être complété. Il n’a pas besoin d’être visible dans la recherche',
    points: ['Un intitulé', 'Au moins une compétence', 'Une présentation d’au moins 50 caractères'],
    cta: 'Compléter mon profil d’associé',
    path: '/profil/associe',
  },
};

// Fenêtre affichée quand on veut écrire sans avoir encore présenté son projet (vers un associé) ou complété son
// profil d'associé (vers un porteur). Mêmes règles que Supabase (2026-11-17-visibilite-contact.sql).
@Component({
  selector: 'app-contact-gate-modal',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-[200] flex items-center justify-center bg-primary/50 p-4" (click)="closed.emit()">
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8" role="dialog" aria-modal="true" aria-labelledby="gate-modal-title" (click)="$event.stopPropagation()">
        <div class="flex items-start justify-between gap-4">
          <h2 id="gate-modal-title" class="text-2xl text-primary">{{ content().title }}</h2>
          <button type="button" (click)="closed.emit()" class="rounded-lg p-1 text-muted-foreground hover:text-primary" aria-label="Fermer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </div>
        <p class="mt-3 text-base leading-relaxed text-muted-foreground">{{ content().text }}</p>
        <ul class="mt-4 space-y-2">
          @for (point of content().points; track point) {
            <li class="flex items-center gap-2 text-sm font-medium text-primary"><span class="text-accent" aria-hidden="true">✓</span>{{ point }}</li>
          }
        </ul>
        <a [routerLink]="content().path" [queryParams]="returnTo() ? { retour: returnTo(), pour: returnName() } : null" (click)="closed.emit()" class="mt-6 block rounded-lg bg-accent px-4 py-3 text-center font-semibold text-white transition-colors hover:bg-accent/90">{{ content().cta }}</a>
        <button type="button" (click)="closed.emit()" class="mt-3 w-full rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-primary hover:border-primary">Plus tard</button>
      </div>
    </div>
  `,
})
export class ContactGateModalComponent implements OnInit, OnDestroy {
  readonly kind = input<ContactGateKind>('projet');
  // Page à retrouver une fois le projet ou le profil complété (fiche de la personne ou conversation) et son nom.
  readonly returnTo = input<string | null>(null);
  readonly returnName = input<string | null>(null);
  readonly closed = output<void>();
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly document = inject(DOCUMENT);

  content(): (typeof CONTENT)[ContactGateKind] {
    return CONTENT[this.kind()];
  }

  // Placée dans <body> : centrée sur tout l'écran, au-dessus du bandeau et de la barre haute.
  ngOnInit(): void {
    this.document.body.appendChild(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    this.host.nativeElement.remove();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closed.emit();
  }
}
