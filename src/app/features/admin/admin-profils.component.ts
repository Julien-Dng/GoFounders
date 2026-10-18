import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PROFILE_TYPE_LABELS, ProfileType } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { PendingProfileVerification, VerificationService } from '../../core/services/verification.service';

// Admins : vérification manuelle des profils (badge « Profil vérifié »). Les droits sont contrôlés par
// Supabase (decide_profile_verification), cette page ne fait qu'afficher.
@Component({
  selector: 'app-admin-profils',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-4xl">
        <h1 class="text-3xl font-bold text-primary">Profils à vérifier</h1>

        @if (!isAdmin()) {
          <p class="mt-4 text-muted-foreground">Page réservée aux administrateurs.</p>
        } @else {
          <p class="mt-2 text-sm text-muted-foreground">
            Vérifiez que la personne existe et correspond à ce qu'elle annonce : profil LinkedIn cohérent avec le nom et le titre,
            site de l'entreprise, SIREN sur annuaire-entreprises.data.gouv.fr. Ne demandez jamais de pièce d'identité.
          </p>

          @if (message()) {
            <div class="mt-6 rounded-xl border px-5 py-4 text-sm" [class]="messageIsError() ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'" role="status">{{ message() }}</div>
          }

          @if (requests().length === 0) {
            <div class="mt-6 rounded-2xl border border-border bg-white p-10 text-center text-muted-foreground">Aucune demande en attente.</div>
          } @else {
            <ul class="mt-6 space-y-6">
              @for (request of requests(); track request.id) {
                <li class="rounded-2xl border border-border bg-white p-6 shadow-sm">
                  <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 class="font-bold">{{ request.display_name }}</h2>
                      <p class="text-sm text-muted-foreground">
                        {{ roleLabel(request.role) }}
                        @if (request.title) { · {{ request.title }} }
                        @if (request.location) { · {{ request.location }} }
                      </p>
                      <p class="text-xs text-muted-foreground">Demande du {{ formatDate(request.created_at) }}</p>
                    </div>
                    <a [routerLink]="['/profil', request.user_id]" class="text-sm font-semibold text-accent hover:underline">Voir le profil</a>
                  </div>
                  <div class="mt-3 flex flex-wrap gap-3 text-sm">
                    @if (request.linkedin_url) {
                      <a [href]="request.linkedin_url" target="_blank" rel="noopener noreferrer" class="font-semibold text-accent hover:underline">LinkedIn du profil</a>
                    }
                    @if (request.website_url) {
                      <a [href]="request.website_url" target="_blank" rel="noopener noreferrer" class="font-semibold text-accent hover:underline">Site web du profil</a>
                    }
                  </div>
                  <div class="mt-3 whitespace-pre-line rounded-lg bg-secondary/60 p-3 text-sm">{{ request.evidence }}</div>
                  <label class="mb-1 mt-4 block text-sm font-semibold" [attr.for]="'note-' + request.id">Note au membre (obligatoire en cas de refus)</label>
                  <input [id]="'note-' + request.id" type="text" maxlength="500" [value]="notes()[request.id] ?? ''" (input)="setNote(request.id, $any($event.target).value)" class="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent">
                  <div class="mt-3 flex gap-2">
                    <button type="button" (click)="decide(request, true)" [disabled]="busy()" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">Vérifier le profil</button>
                    <button type="button" (click)="decide(request, false)" [disabled]="busy() || !(notes()[request.id] ?? '').trim()" class="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:border-destructive hover:text-destructive disabled:opacity-50">Refuser</button>
                  </div>
                </li>
              }
            </ul>
          }
        }
      </div>
    </div>
  `,
})
export class AdminProfilsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly verification = inject(VerificationService);

  readonly isAdmin = this.auth.isAdmin;
  readonly requests = signal<PendingProfileVerification[]>([]);
  readonly notes = signal<Record<string, string | undefined>>({});
  readonly busy = signal(false);
  readonly message = signal('');
  readonly messageIsError = signal(false);

  ngOnInit(): void {
    void this.load();
  }

  setNote(requestId: string, value: string): void {
    this.notes.update(current => ({ ...current, [requestId]: value }));
  }

  async decide(request: PendingProfileVerification, approve: boolean): Promise<void> {
    this.busy.set(true);

    try {
      const result = await this.verification.decide(request.id, approve, this.notes()[request.id] ?? '');
      this.messageIsError.set(!result.success);
      this.message.set(result.message);

      if (result.success) {
        await this.load();
      }
    } finally {
      this.busy.set(false);
    }
  }

  roleLabel(role: string): string {
    return PROFILE_TYPE_LABELS[role as ProfileType] ?? role;
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  private async load(): Promise<void> {
    await this.auth.ensureSessionReady();

    if (this.isAdmin()) {
      this.requests.set(await this.verification.getPending());
    }
  }
}
