import { Directive, ElementRef, inject, NgZone, OnDestroy, AfterViewInit } from '@angular/core';
import { MotionService } from '../motion.service';
@Directive({ selector: '[atlasParallax]', standalone: true })
export class ParallaxDirective implements AfterViewInit, OnDestroy {
  private readonly element = inject(ElementRef<HTMLElement>).nativeElement;
  private readonly motion = inject(MotionService);
  private readonly zone = inject(NgZone);
  private frame = 0;
  private readonly update = () => {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      if (this.motion.reduced() || this.motion.economical() || innerWidth < 1024) {
        this.element.style.removeProperty('--parallax');
        return;
      }
      const rect = this.element.getBoundingClientRect();
      if (rect.bottom >= 0 && rect.top <= innerHeight)
        this.element.style.setProperty(
          '--parallax',
          `${Math.max(-22, Math.min(22, -rect.top * 0.035))}px`,
        );
    });
  };
  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => {
      addEventListener('scroll', this.update, { passive: true });
      addEventListener('resize', this.update, { passive: true });
    });
  }
  ngOnDestroy() {
    removeEventListener('scroll', this.update);
    removeEventListener('resize', this.update);
    cancelAnimationFrame(this.frame);
  }
}
