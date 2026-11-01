import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

// Adresse inconnue : on le dit clairement au lieu de renvoyer en silence vers l'accueil.
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative flex min-h-screen items-center overflow-hidden bg-primary px-4 pb-16 pt-28 text-white sm:px-6 lg:px-8">
      <div class="pointer-events-none absolute inset-0" aria-hidden="true">
        <div class="absolute -right-10 top-24 h-64 w-72 rounded-3xl bg-white/[0.04]"></div>
        <div class="absolute bottom-10 right-[22%] h-40 w-64 rounded-3xl bg-white/[0.04]"></div>
        <div class="absolute -left-16 bottom-[-4rem] h-72 w-80 rounded-3xl bg-white/[0.04]"></div>
      </div>
      <div class="relative mx-auto w-full max-w-[78rem]">
        <p class="tabular text-lg font-bold text-white/50">Erreur 404</p>
        <h1 class="mt-3 max-w-[18ch] text-[2.6rem] leading-[1.08] sm:text-6xl">Cette page n'existe pas ou n'existe plus</h1>
        <p class="mt-5 max-w-[52ch] text-lg leading-relaxed text-white/70">
          L'adresse <span class="break-all font-semibold text-white">{{ path }}</span> ne mène nulle part. Si vous cherchiez une annonce, elle a peut-être été vendue ou retirée.
        </p>
        <div class="mt-9 flex flex-col gap-3 sm:flex-row">
          <a routerLink="/ma" class="rounded-lg bg-accent px-6 py-3.5 text-center font-semibold text-white transition-colors hover:bg-accent/90">Voir les annonces</a>
          <a routerLink="/" class="rounded-lg border border-white/30 px-6 py-3.5 text-center font-semibold text-white transition-colors hover:border-white/70">Retour à l'accueil</a>
          <a routerLink="/contact" [queryParams]="{ sujet: 'probleme' }" class="px-2 py-3.5 text-center font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">Signaler un lien cassé</a>
        </div>
      </div>
    </div>
  `,
})
export class NotFoundComponent {
  readonly path = inject(Router).url.split(/[?#]/)[0];
}
