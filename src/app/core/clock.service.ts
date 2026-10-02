import { Injectable, signal, OnDestroy } from '@angular/core';
@Injectable({ providedIn: 'root' })
export class ClockService implements OnDestroy {
  readonly now = signal(Date.now());
  private readonly timer = setInterval(() => this.now.set(Date.now()), 1000);
  ngOnDestroy() {
    clearInterval(this.timer);
  }
}
