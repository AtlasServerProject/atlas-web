import { Injectable, signal, DestroyRef, inject } from '@angular/core';
@Injectable({ providedIn: 'root' })
export class MotionService {
  readonly reduced = signal(false);
  readonly economical = signal(false);
  constructor() {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => this.reduced.set(query.matches);
    update();
    query.addEventListener('change', update);
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
    ).connection;
    this.economical.set(
      !!connection?.saveData || ['slow-2g', '2g', '3g'].includes(connection?.effectiveType || ''),
    );
    inject(DestroyRef).onDestroy(() => query.removeEventListener('change', update));
  }
}
