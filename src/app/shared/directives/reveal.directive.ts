import { AfterViewInit, Directive, ElementRef, OnDestroy, inject, input } from '@angular/core';

// Apparition douce au défilement : l'élément glisse vers le haut en apparaissant quand il entre à l'écran.
// Délai facultatif (ms) pour décaler les cartes d'une même grille. Sans effet si l'utilisateur limite les animations.
@Directive({
  selector: '[appReveal]',
  standalone: true,
})
export class RevealDirective implements AfterViewInit, OnDestroy {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private observer: IntersectionObserver | null = null;
  private cleanup: ReturnType<typeof setTimeout> | undefined;

  readonly revealDelay = input(0);

  ngAfterViewInit(): void {
    const node = this.element.nativeElement;
    const reduced = typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof IntersectionObserver === 'undefined') {
      return;
    }

    node.classList.add('reveal');
    node.style.transitionDelay = `${this.revealDelay()}ms`;
    this.observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            node.classList.add('is-visible');
            this.observer?.disconnect();
            this.observer = null;
            // Animation terminée : on rend la main aux transitions de l'élément (survol des cartes).
            this.cleanup = setTimeout(() => {
              node.classList.remove('reveal', 'is-visible');
              node.style.transitionDelay = '';
            }, this.revealDelay() + 800);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );
    this.observer.observe(node);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    clearTimeout(this.cleanup);
  }
}
