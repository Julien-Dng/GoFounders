import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, HostListener, OnDestroy, OnInit, inject, input, output } from '@angular/core';

// Panneau qui monte du bas de l'écran (téléphones) : filtres et réglages ouverts à la demande.
// Placé dans <body>, comme les fenêtres, pour couvrir tout l'écran quelle que soit la page.
@Component({
  selector: 'app-bottom-sheet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-[200] bg-primary/50" (click)="closed.emit()" aria-hidden="true"></div>
    <div class="fixed inset-x-0 bottom-0 z-[201] flex max-h-[88dvh] flex-col rounded-t-2xl bg-white shadow-2xl" role="dialog" aria-modal="true" [attr.aria-label]="title()">
      <div class="mx-auto mt-2.5 h-1.5 w-12 flex-shrink-0 rounded-full bg-border" aria-hidden="true"></div>
      <div class="flex flex-shrink-0 items-center justify-between gap-4 px-5 pb-2 pt-3">
        <h2 class="text-xl text-primary">{{ title() }}</h2>
        <button type="button" (click)="closed.emit()" class="rounded-lg p-1 text-muted-foreground hover:text-primary" aria-label="Fermer">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
        <ng-content />
      </div>
      <div class="flex-shrink-0 border-t border-border px-5 py-3">
        <ng-content select="[sheetFooter]" />
      </div>
    </div>
  `,
})
export class BottomSheetComponent implements OnInit, OnDestroy {
  readonly title = input('');
  readonly closed = output<void>();
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly document = inject(DOCUMENT);

  ngOnInit(): void {
    this.document.body.appendChild(this.host.nativeElement);
    this.document.body.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    this.document.body.style.overflow = '';
    this.host.nativeElement.remove();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closed.emit();
  }
}
