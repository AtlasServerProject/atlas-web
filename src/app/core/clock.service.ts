import { Injectable, signal, OnDestroy } from '@angular/core';
@Injectable({ providedIn: 'root' })
export class ClockService implements OnDestroy {
  private offset = 0;
  synchronize(serverTime: string, startedAt: number) {
    this.offset = Date.parse(serverTime) - (startedAt + Date.now()) / 2;
    this.now.set(Date.now() + this.offset);
  }
  readonly now = signal(Date.now());
  private readonly timer = setInterval(() => this.now.set(Date.now() + this.offset), 1000);
  ngOnDestroy() {
    clearInterval(this.timer);
  }
}
