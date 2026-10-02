import { Directive, ElementRef, OnDestroy, AfterViewInit, inject, input } from '@angular/core';
import { MotionService } from '../motion.service';
@Directive({ selector: '[atlasReveal]', standalone: true })
export class ScrollRevealDirective implements AfterViewInit, OnDestroy {
  readonly atlasReveal = input('up');
  readonly revealDelay = input(0);
  private readonly element = inject(ElementRef<HTMLElement>).nativeElement;
  private readonly motion = inject(MotionService);
  private observer?: IntersectionObserver;
  ngAfterViewInit() {
    if (this.motion.reduced() || !('IntersectionObserver' in window)) return;
    this.element.classList.add('reveal', `reveal-${this.atlasReveal()}`);
    this.element.style.setProperty('--reveal-delay', `${Math.min(this.revealDelay(), 200)}ms`);
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.element.classList.add('is-visible');
          this.observer?.disconnect();
        }
      },
      { threshold: 0.08 },
    );
    this.observer.observe(this.element);
  }
  ngOnDestroy() {
    this.observer?.disconnect();
  }
}
