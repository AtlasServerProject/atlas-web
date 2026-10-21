import { Component, ElementRef, OnDestroy, effect, inject, input, signal, viewChild } from '@angular/core';
import { MotionService } from '../motion.service';
@Component({
  selector: 'app-background-video',
  standalone: true,
  template: `
    <div class="media" aria-hidden="true">
      <img [src]="poster()" alt="" loading="lazy" />
      @if (enabled() && !motion.reduced() && !motion.economical() && !failed()) {
        <video #video [src]="src()" [poster]="poster()" [muted]="true" loop playsinline preload="none"
          [class.loaded]="ready()" (playing)="ready.set(true)" (error)="failed.set(true)"></video>
      }
    </div>
    @if (ready() && !failed() && !motion.reduced() && !motion.economical()) {
      <button (click)="toggle()" [attr.aria-label]="paused() ? 'Reproduzir vídeo de fundo' : 'Pausar vídeo de fundo'">
        {{ paused() ? '▶ Reproduzir' : 'Ⅱ Pausar vídeo' }}
      </button>
    }`,
  styles: `:host{position:absolute;inset:0;display:block;pointer-events:none;}
    .media{position:absolute;inset:0;z-index:-2;overflow:hidden;}
    img,video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:var(--background-video-position,50% 50%);}
    video{opacity:0;transition:opacity .8s;}video.loaded{opacity:1;}
    button{position:absolute;right:24px;bottom:20px;z-index:3;pointer-events:auto;border:1px solid #9aafff55;
      border-radius:20px;background:#080f26cc;color:#e7edff;padding:8px 13px;font:inherit;font-size:11px;cursor:pointer;}
    button:focus-visible{outline:2px solid #72ddff;outline-offset:4px;}`,
})
export class BackgroundVideoComponent implements OnDestroy {
  readonly src = input.required<string>();
  readonly poster = input.required<string>();
  readonly motion = inject(MotionService);
  readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');
  readonly enabled = signal(false);
  readonly ready = signal(false);
  readonly failed = signal(false);
  readonly paused = signal(false);
  private readonly host = inject(ElementRef<HTMLElement>);
  private visible = false;
  private observer: IntersectionObserver;
  private readonly update = () => {
    const video = this.video()?.nativeElement;
    if (!video) return;
    if (this.visible && !document.hidden && !this.paused() && !this.motion.reduced() && !this.motion.economical())
      void video.play().catch(() => this.failed.set(true));
    else video.pause();
  };
  constructor() {
    this.observer = new IntersectionObserver(entries => {
      this.visible = entries.some(entry => entry.isIntersecting);
      if (this.visible) this.enabled.set(true);
      this.update();
    });
    this.observer.observe(this.host.nativeElement);
    effect(() => { this.video(); this.motion.reduced(); this.motion.economical(); this.update(); });
    document.addEventListener('visibilitychange', this.update);
  }
  toggle() { this.paused.update(value => !value); this.update(); }
  ngOnDestroy() { this.observer.disconnect(); document.removeEventListener('visibilitychange', this.update); }
}
