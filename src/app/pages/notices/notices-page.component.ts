import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteSettings } from '../../shared/site-settings.service';
import { patchNotes, PatchCategory } from './patch-notes';
@Component({
  selector: 'app-notices-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './notices-page.component.html',
  styleUrls: ['./notices-page.component.scss'],
})
export class NoticesPageComponent {
  readonly settings = inject(SiteSettings);
  readonly category = signal<PatchCategory | 'Todas'>('Todas');
  readonly categories = ['Todas', 'Gameplay', 'Conta e apoio', 'Comunidade'] as const;
  readonly notes = computed(() =>
    patchNotes.filter((note) => this.category() === 'Todas' || note.category === this.category()),
  );
}
