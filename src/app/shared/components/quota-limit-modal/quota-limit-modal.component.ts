import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, HostListener, OnDestroy, OnInit, inject, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FREE_CONTACTS_PER_MONTH, OFFER_PRICES } from '../../../core/config/offers';

// Fenêtre affichée quand un porteur de projet en FREE a utilisé ses nouveaux contacts du mois
// (free_quota_limits côté Supabase). Les réponses et les conversations en cours restent illimitées.
@Component({
  selector: 'app-quota-limit-modal',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-[200] flex items-center justify-center bg-primary/50 p-4" (click)="closed.emit()">
      <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-8" role="dialog" aria-modal="true" aria-labelledby="quota-modal-title" (click)="$event.stopPropagation()">
        <div class="flex items-start justify-between gap-4">
          <h2 id="quota-modal-title" class="text-2xl text-primary">Vous avez atteint votre limite de contacts</h2>
          <button type="button" (click)="closed.emit()" class="rounded-lg p-1 text-muted-foreground hover:text-primary" aria-label="Fermer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </div>
        <p class="mt-3 text-base leading-relaxed text-muted-foreground">
          Avec l'offre gratuite, vous pouvez écrire à {{ freeContacts }} nouveaux associés par mois. Le compteur repart à zéro le 1er du mois.
          Vos conversations en cours et vos réponses restent illimitées
        </p>

        <div class="mt-6 space-y-3">
          <div class="rounded-xl bg-accent/[0.06] p-4 ring-1 ring-accent/20">
            <div class="flex items-center justify-between gap-3">
              <p class="font-semibold text-primary">PRO · {{ proPrice }}</p>
              <span class="rounded-md bg-accent px-2 py-0.5 text-xs font-bold text-white">Sans engagement</span>
            </div>
            <p class="mt-1 text-sm text-foreground/80">Nouveaux contacts illimités, raisons détaillées des scores, recherche avancée et projet mis en avant</p>
            <a routerLink="/abonnement" (click)="closed.emit()" class="mt-3 block rounded-lg bg-accent px-4 py-2.5 text-center font-semibold text-white transition-colors hover:bg-accent/90">Passer en PRO</a>
          </div>
          <div class="rounded-xl p-4 ring-1 ring-border">
            <p class="font-semibold text-primary">PREMIUM · sur devis</p>
            <p class="mt-1 text-sm text-foreground/80">Un interlocuteur dédié vous présente des associés qualifiés</p>
            <a routerLink="/tarifs" fragment="associes" (click)="closed.emit()" class="mt-2 inline-block text-sm font-semibold text-accent hover:underline">Découvrir les offres <span aria-hidden="true">→</span></a>
          </div>
        </div>

        <button type="button" (click)="closed.emit()" class="mt-5 w-full rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-primary hover:border-primary">Plus tard</button>
      </div>
    </div>
  `,
})
export class QuotaLimitModalComponent implements OnInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly document = inject(DOCUMENT);

  // Placée directement dans <body> : centrée sur tout l'écran, au-dessus du bandeau et de la barre haute.
  ngOnInit(): void {
    this.document.body.appendChild(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    this.host.nativeElement.remove();
  }

  readonly closed = output<void>();
  readonly freeContacts = FREE_CONTACTS_PER_MONTH;
  readonly proPrice = OFFER_PRICES.PRO.label;

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closed.emit();
  }
}
