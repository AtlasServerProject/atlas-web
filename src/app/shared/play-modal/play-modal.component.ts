import { DialogFocusDirective } from '../effects/dialog-focus.directive';
import { Component, ElementRef, effect, inject, signal, viewChild, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PlayModalService } from './play-modal.service';
import { SiteSettings } from '../site-settings.service';
import { MotionService } from '../motion.service';
@Component({
  selector: 'app-play-modal',
  standalone: true,
  imports: [DialogFocusDirective, RouterLink],
  templateUrl: './play-modal.component.html',
  styleUrl: './play-modal.component.scss',
})
export class PlayModalComponent implements OnDestroy {
  readonly state = inject(PlayModalService);
  readonly settings = inject(SiteSettings);
  readonly motion = inject(MotionService);
  readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  readonly copied = signal('');
  readonly closing = signal(false);
  private timer?: ReturnType<typeof setTimeout>;
  constructor() {
    effect(() => {
      const element = this.dialog()?.nativeElement;
      if (this.state.requested() && element && !element.open) {
        this.copied.set('');
        element.showModal();
      }
    });
  }
  close() {
    if (this.closing()) return;
    this.closing.set(true);
    this.timer = setTimeout(
      () => {
        this.dialog()?.nativeElement.close();
        this.state.requested.set(false);
        this.closing.set(false);
      },
      this.motion.reduced() ? 0 : 160,
    );
  }
  cancel(event: Event) {
    event.preventDefault();
    this.close();
  }
  backdrop(event: MouseEvent) {
    if (event.target === this.dialog()?.nativeElement) this.close();
  }
  async copy() {
    const address = this.settings.serverAddress();
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      this.copied.set('✓ IP copiado!');
    } catch {
      this.copied.set('Não foi possível copiar. Selecione o endereço acima e copie manualmente.');
    }
  }
  ngOnDestroy() {
    clearTimeout(this.timer);
  }
}
