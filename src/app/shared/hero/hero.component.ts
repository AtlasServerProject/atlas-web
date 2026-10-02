import { Component, ElementRef, OnDestroy, inject, signal, viewChild, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteSettings } from '../site-settings.service';
import { MotionService } from '../motion.service';
import { PlayModalService } from '../play-modal/play-modal.service';
import { ParallaxDirective } from '../effects/parallax.directive';
@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [RouterLink, ParallaxDirective],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss',
})
export class HeroComponent implements OnDestroy {
  readonly settings = inject(SiteSettings);
  readonly motion = inject(MotionService);
  readonly play = inject(PlayModalService);
  readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');
  readonly failed = signal(false);
  readonly paused = signal(false);
  readonly ready = signal(false);
  private observer?: IntersectionObserver;
  private readonly visibility = () => {
    const v = this.video()?.nativeElement;
    if (!v) return;
    if (document.hidden) v.pause();
    else if (!this.paused() && !this.motion.reduced())
      void v.play().catch(() => this.failed.set(true));
  };
  constructor() {
    effect(() => {
      const v = this.video()?.nativeElement;
      this.observer?.disconnect();
      if (v) {
        this.observer = new IntersectionObserver((entries) => {
          if (entries[0]?.isIntersecting && !this.paused() && !document.hidden)
            void v.play().catch(() => this.failed.set(true));
          else v.pause();
        });
        this.observer.observe(v);
      }
    });
    document.addEventListener('visibilitychange', this.visibility);
  }
  toggle() {
    const v = this.video()?.nativeElement;
    if (!v) return;
    this.paused.set(!this.paused());
    if (this.paused()) v.pause();
    else void v.play().catch(() => this.failed.set(true));
  }
  ngOnDestroy() {
    this.observer?.disconnect();
    document.removeEventListener('visibilitychange', this.visibility);
  }
}
