import { Component, computed, inject, input } from '@angular/core';
import { ClockService } from '../../core/clock.service';
@Component({
  selector: 'app-countdown',
  standalone: true,
  template:
    '<span class="countdown" role="timer" aria-label="Tempo restante">{{ display() }}</span>',
})
export class CountdownComponent {
  readonly endsAt = input.required<string>();
  private readonly clock = inject(ClockService);
  readonly display = computed(() => {
    const seconds = Math.max(0, Math.floor((Date.parse(this.endsAt()) - this.clock.now()) / 1000));
    if (!Number.isFinite(seconds) || seconds === 0) return 'Encerrada';
    const d = Math.floor(seconds / 86400),
      h = Math.floor((seconds % 86400) / 3600),
      m = Math.floor((seconds % 3600) / 60),
      s = seconds % 60;
    return d ? `${d}d ${h}h ${m}m` : [h, m, s].map((v) => String(v).padStart(2, '0')).join(' : ');
  });
}
