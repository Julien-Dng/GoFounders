import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { ProfileVerificationRequest, VerificationService } from '../../../core/services/verification.service';

// Demande du badge « Profil vérifié » (page Modifier mon profil). Vérification manuelle par l'équipe.
@Component({
  selector: 'app-profile-verification-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rounded-3xl border border-border bg-white p-6 shadow-lg sm:p-8" aria-labelledby="verification-title">
      <div class="flex items-start gap-3">
        <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>
          </svg>
        </span>
        <div class="min-w-0 flex-1">
          <h2 id="verification-title" class="text-xl font-bold text-primary">Profil vérifié</h2>

          @if (verifiedAt()) {
            <p class="mt-1 text-sm text-emerald-700">Votre profil affiche le badge « Profil vérifié » depuis le {{ formatDate(verifiedAt()!) }}.</p>
          } @else if (request()?.status === 'pending') {
            <p class="mt-1 text-sm text-foreground/80">Demande envoyée le {{ formatDate(request()!.created_at) }}, en cours d'examen par l'équipe.</p>
          } @else {
            <p class="mt-1 text-sm text-muted-foreground">
              Le badge rassure les personnes qui découvrent votre profil. L'équipe vérifie que vous êtes bien la personne
              que vous présentez : lien LinkedIn, site de votre entreprise, numéro SIREN… Aucune pièce d'identité n'est demandée.
            </p>
            @if (request()?.status === 'rejected') {
              <p class="mt-2 text-xs text-destructive">Précédente demande non validée{{ request()!.admin_note ? ' : ' + request()!.admin_note : '.' }}</p>
            }
            <label class="sr-only" for="verification-evidence">Éléments de vérification</label>
            <textarea
              id="verification-evidence"
              rows="3"
              maxlength="3000"
              [value]="evidence()"
              (input)="evidence.set($any($event.target).value)"
              class="mt-3 w-full resize-y rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
              placeholder="Ex. https://www.linkedin.com/in/votre-profil, site de votre entreprise, SIREN"
            ></textarea>
            <button
              type="button"
              (click)="submit()"
              [disabled]="busy() || evidence().trim().length < 20"
              class="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            >Demander la vérification</button>
          }

          @if (message()) {
            <p class="mt-3 text-sm" [class]="messageIsError() ? 'text-destructive' : 'text-emerald-700'" role="status">{{ message() }}</p>
          }
        </div>
      </div>
    </section>
  `,
})
export class ProfileVerificationCardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly verification = inject(VerificationService);

  readonly verifiedAt = computed(() => this.auth.currentUser()?.profileVerifiedAt ?? null);
  readonly request = signal<ProfileVerificationRequest | null>(null);
  readonly evidence = signal('');
  readonly busy = signal(false);
  readonly message = signal('');
  readonly messageIsError = signal(false);

  ngOnInit(): void {
    void this.load();
  }

  async submit(): Promise<void> {
    this.busy.set(true);

    try {
      const result = await this.verification.requestVerification(this.evidence());
      this.messageIsError.set(!result.success);
      this.message.set(result.message);

      if (result.success) {
        this.evidence.set('');
        await this.load();
      }
    } finally {
      this.busy.set(false);
    }
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  private async load(): Promise<void> {
    this.request.set(await this.verification.getMyLatestRequest());
  }
}
