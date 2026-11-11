import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SUPPORT_EMAIL } from '../../core/config/offers';
import { AuthService } from '../../core/services/auth.service';
import { CONTACT_TOPICS, ContactService, ContactTopic } from '../../core/services/contact.service';
import { FooterComponent } from '../../shared/components/footer/footer.component';

// Page contact publique. Les messages arrivent dans /admin/messages (supabase/2026-10-25-contact.sql).
@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, FooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary">
      <section class="px-4 pb-16 pt-28 sm:px-6 lg:px-8 lg:pt-36">
        <div class="mx-auto max-w-[78rem]">
          <header class="mx-auto max-w-[60ch] text-center">
            <h1 class="text-[2.25rem] leading-tight text-primary sm:text-5xl">Contactez-nous</h1>
            <p class="mt-4 text-lg leading-relaxed text-muted-foreground">
              Une question sur une annonce, un paiement ou la vente de votre entreprise ? Écrivez-nous, nous vous répondons par email
            </p>
          </header>

          <div class="mt-12 grid gap-6 lg:grid-cols-12">
            <div class="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-border sm:p-8 lg:col-span-8">
              @if (sent()) {
                <div class="py-10 text-center" role="status">
                  <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700" aria-hidden="true">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </span>
                  <h2 class="mt-5 text-2xl text-primary">Message envoyé</h2>
                  <p class="mx-auto mt-2 max-w-[44ch] text-base text-muted-foreground">{{ resultMessage() }}</p>
                  <button type="button" (click)="reset()" class="mt-6 font-semibold text-accent underline-offset-4 hover:underline">Envoyer un autre message</button>
                </div>
              } @else {
                <div [formGroup]="form" class="space-y-5">
                  <div class="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label for="contact-name" class="mb-1.5 block font-semibold text-primary">Nom</label>
                      <input id="contact-name" type="text" formControlName="name" autocomplete="name" maxlength="120" class="w-full rounded-lg border border-input bg-white px-4 py-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" [attr.aria-invalid]="showError('name')">
                      @if (showError('name')) {
                        <p class="mt-1 text-sm text-destructive">Indiquez votre nom</p>
                      }
                    </div>
                    <div>
                      <label for="contact-email" class="mb-1.5 block font-semibold text-primary">Email</label>
                      <input id="contact-email" type="email" formControlName="email" autocomplete="email" maxlength="200" class="w-full rounded-lg border border-input bg-white px-4 py-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" [attr.aria-invalid]="showError('email')">
                      @if (showError('email')) {
                        <p class="mt-1 text-sm text-destructive">Indiquez une adresse email valide, nous vous répondrons à cette adresse</p>
                      }
                    </div>
                  </div>

                  <div>
                    <label for="contact-topic" class="mb-1.5 block font-semibold text-primary">Sujet</label>
                    <select id="contact-topic" formControlName="topic" class="w-full rounded-lg border border-input bg-white px-4 py-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20">
                      @for (topic of topics; track topic.value) {
                        <option [value]="topic.value">{{ topic.label }}</option>
                      }
                    </select>
                  </div>

                  <div>
                    <label for="contact-message" class="mb-1.5 block font-semibold text-primary">Message</label>
                    <textarea id="contact-message" formControlName="message" rows="6" maxlength="3000" class="w-full resize-y rounded-lg border border-input bg-white px-4 py-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" placeholder="Décrivez votre demande. Pour une annonce, indiquez son secteur et sa région." [attr.aria-invalid]="showError('message')"></textarea>
                    <div class="mt-1 flex justify-between gap-4 text-sm">
                      <span [class]="showError('message') ? 'text-destructive' : 'text-muted-foreground'">20 caractères minimum</span>
                      <span class="tabular text-muted-foreground">{{ form.controls.message.value.length }} / 3000</span>
                    </div>
                  </div>

                  <!-- Champ piège pour les robots : invisible pour les personnes, ignoré s'il est rempli. -->
                  <div class="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
                    <label for="contact-website">Site web</label>
                    <input id="contact-website" type="text" tabindex="-1" autocomplete="off" formControlName="website">
                  </div>

                  @if (error()) {
                    <p class="rounded-lg bg-red-50 px-4 py-3 text-base text-red-800" role="alert">{{ error() }}</p>
                  }

                  <div class="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <p class="text-sm text-muted-foreground">
                      Vos coordonnées servent uniquement à vous répondre.
                      <a routerLink="/confidentialite" class="font-semibold text-accent underline-offset-4 hover:underline">Confidentialité</a>
                    </p>
                    <button type="button" (click)="submit()" [disabled]="sending()" class="rounded-lg bg-accent px-7 py-3.5 font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-wait disabled:opacity-60">
                      {{ sending() ? 'Envoi…' : 'Envoyer le message' }}
                    </button>
                  </div>
                </div>
              }
            </div>

            <aside class="space-y-6 lg:col-span-4">
              <div class="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-border">
                <h2 class="text-lg font-bold text-primary">Une réponse tout de suite ?</h2>
                <ul class="mt-4 space-y-3 text-base">
                  <li><a routerLink="/faq" class="font-semibold text-accent underline-offset-4 hover:underline">Questions fréquentes</a></li>
                  <li><a routerLink="/tarifs" class="font-semibold text-accent underline-offset-4 hover:underline">Tarifs et offres</a></li>
                  <li><a routerLink="/estimation" class="font-semibold text-accent underline-offset-4 hover:underline">Estimer la valeur de mon entreprise</a></li>
                </ul>
              </div>
              <div class="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-border">
                <h2 class="text-lg font-bold text-primary">Être accompagné</h2>
                <p class="mt-2 text-base leading-relaxed text-muted-foreground">
                  Pour préparer une cession ou une reprise avec nos experts partenaires, demandez un devis gratuit
                </p>
                <a routerLink="/tarifs" fragment="premium" class="mt-4 inline-block rounded-lg bg-primary px-5 py-3 font-semibold text-white transition-colors hover:bg-primary/90">Demander un devis</a>
              </div>
              <div class="rounded-2xl bg-primary p-6 text-white shadow-lg">
                <h2 class="text-lg font-bold">Par email</h2>
                <a [href]="'mailto:' + supportEmail" class="mt-2 inline-block break-all text-lg font-semibold underline decoration-white/40 underline-offset-4 hover:decoration-white">{{ supportEmail }}</a>
                <p class="mt-3 text-sm text-white/65">GoFounders met en relation et n'assure pas de conseil juridique ou financier</p>
              </div>
            </aside>
          </div>
        </div>
      </section>
      <app-footer />
    </div>
  `,
})
export class ContactComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly contact = inject(ContactService);

  readonly topics = CONTACT_TOPICS;
  readonly supportEmail = SUPPORT_EMAIL;
  readonly sending = signal(false);
  readonly sent = signal(false);
  readonly error = signal('');
  readonly resultMessage = signal('');
  private readonly submitted = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: [this.auth.currentUser()?.displayName ?? '', [Validators.required, Validators.minLength(2)]],
    email: [this.auth.currentUser()?.email ?? '', [Validators.required, Validators.email]],
    topic: [this.initialTopic(), Validators.required],
    message: ['', [Validators.required, Validators.minLength(20)]],
    website: [''],
  });

  showError(control: 'name' | 'email' | 'message'): boolean {
    const field = this.form.controls[control];
    return field.invalid && (field.touched || this.submitted());
  }

  async submit(): Promise<void> {
    this.submitted.set(true);
    this.error.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    // Robot : on fait comme si tout s'était bien passé, sans rien envoyer.
    if (value.website.trim()) {
      this.resultMessage.set('Message envoyé. Nous vous répondons par email.');
      this.sent.set(true);
      return;
    }

    this.sending.set(true);

    try {
      const result = await this.contact.send(value.name.trim(), value.email.trim(), value.topic, value.message.trim());

      if (result.success) {
        this.resultMessage.set(result.message);
        this.sent.set(true);
      } else {
        this.error.set(result.message);
      }
    } finally {
      this.sending.set(false);
    }
  }

  reset(): void {
    this.form.controls.message.reset('');
    this.submitted.set(false);
    this.sent.set(false);
  }

  private initialTopic(): ContactTopic {
    const requested = this.route.snapshot.queryParamMap.get('sujet');
    return CONTACT_TOPICS.find(topic => topic.value === requested)?.value ?? 'question';
  }
}
