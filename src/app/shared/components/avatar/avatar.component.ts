import { ChangeDetectionStrategy, Component, Input, signal } from '@angular/core';

// Photo de profil si elle existe et se charge, sinon les initiales sur fond dégradé.
// La taille et le texte se règlent depuis le parent : <app-avatar class="h-10 w-10 text-sm" ... />
@Component({
  selector: 'app-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative inline-flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-accent to-primary font-bold text-white',
  },
  template: `
    @if (showPhoto()) {
      <img [src]="photoUrl" [alt]="'Photo de ' + name" (error)="failedUrl.set(photoUrl)" class="absolute inset-0 h-full w-full object-cover">
    } @else {
      <span aria-hidden="true">{{ initials }}</span>
      <span class="sr-only">{{ name }}</span>
    }
  `,
})
export class AvatarComponent {
  @Input() photoUrl: string | null | undefined = null;
  @Input() initials = '';
  @Input() name = '';

  readonly failedUrl = signal<string | null | undefined>(null);

  showPhoto(): boolean {
    return !!this.photoUrl?.trim() && this.failedUrl() !== this.photoUrl;
  }
}
