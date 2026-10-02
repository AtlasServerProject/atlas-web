import { Injectable, signal } from '@angular/core';
@Injectable({ providedIn: 'root' })
export class PlayModalService {
  readonly requested = signal(false);
  open() {
    this.requested.set(true);
  }
}
