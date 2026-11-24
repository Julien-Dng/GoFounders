import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

// Champ d'étiquettes (compétences, profils recherchés) : Entrée, virgule ou « + Ajouter » ajoutent une étiquette,
// × la retire. La valeur du formulaire reste un texte séparé par des virgules, comme avant.
@Component({
  selector: 'app-tag-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TagInputComponent), multi: true }],
  template: `
    <div class="flex min-h-[3.25rem] flex-wrap items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 transition-colors focus-within:border-accent"
         [class.opacity-60]="disabled()">
      @for (tag of tags(); track tag) {
        <span class="inline-flex items-center gap-1 rounded-lg bg-secondary py-1 pl-2.5 pr-1 text-sm font-medium text-foreground">
          {{ tag }}
          <button type="button" (click)="remove(tag)" [disabled]="disabled()" class="rounded p-0.5 text-muted-foreground hover:bg-white hover:text-primary" [attr.aria-label]="'Retirer ' + tag">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </span>
      }
      @if (tags().length < max()) {
        <input [id]="inputId()" type="text" [value]="draft()" (input)="onInput($any($event.target).value)" (keydown)="onKeydown($event)" (blur)="commit(); touched()"
               [placeholder]="tags().length ? '' : placeholder()" [disabled]="disabled()" [attr.aria-describedby]="describedBy() || null"
               class="min-w-[8rem] flex-1 border-0 bg-transparent py-1 text-base outline-none">
        <button type="button" (click)="commit()" [disabled]="disabled() || !draft().trim()"
                class="inline-flex items-center gap-1 rounded-lg border border-accent/40 px-2.5 py-1 text-sm font-semibold text-accent transition-colors hover:bg-accent/5 disabled:opacity-40">
          <span aria-hidden="true">+</span> Ajouter
        </button>
      }
    </div>
  `,
})
export class TagInputComponent implements ControlValueAccessor {
  readonly inputId = input<string>('');
  readonly placeholder = input('');
  readonly describedBy = input('');
  readonly max = input(12);

  readonly tags = signal<string[]>([]);
  readonly draft = signal('');
  readonly disabled = signal(false);
  private onChange: (value: string) => void = () => undefined;
  touched: () => void = () => undefined;

  writeValue(value: string | null): void {
    this.tags.set(this.split(value ?? ''));
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.touched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  onInput(value: string): void {
    // Une virgule tapée ou collée sépare les étiquettes.
    if (value.includes(',')) {
      const parts = value.split(',');
      this.draft.set(parts.pop() ?? '');
      this.add(parts);
      return;
    }
    this.draft.set(value);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.commit();
    } else if (event.key === 'Backspace' && !this.draft() && this.tags().length) {
      this.remove(this.tags()[this.tags().length - 1]);
    }
  }

  commit(): void {
    if (this.draft().trim()) {
      this.add([this.draft()]);
      this.draft.set('');
    }
  }

  remove(tag: string): void {
    this.tags.update(tags => tags.filter(item => item !== tag));
    this.onChange(this.tags().join(', '));
  }

  private add(values: string[]): void {
    const next = [...this.tags()];
    for (const value of values.map(item => item.trim().slice(0, 40)).filter(Boolean)) {
      if (next.length < this.max() && !next.some(tag => tag.toLowerCase() === value.toLowerCase())) {
        next.push(value);
      }
    }
    this.tags.set(next);
    this.onChange(next.join(', '));
  }

  private split(value: string): string[] {
    return value.split(',').map(item => item.trim()).filter(Boolean);
  }
}
