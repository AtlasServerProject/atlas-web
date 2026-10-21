import { Component, inject, signal } from '@angular/core';
import { CommerceClient } from '../../core/commerce-client.service';
@Component({
  selector: 'app-team-directory',
  standalone: true,
  styles: [
    `
      table {
        width: 100%;
        border-collapse: collapse;
      }
      td,
      th {
        padding: 0.7rem;
        text-align: left;
        overflow-wrap: anywhere;
      }
      .actions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
    `,
  ],
  template: `<section class="section">
    <h2>Equipe do site</h2>
    <p>Contas com perfil SUP, MOD ou ADM. Os cargos do Minecraft são independentes.</p>
    <button class="button secondary" [disabled]="loading()" (click)="load()">
      Atualizar equipe
    </button>
    @if (error()) {
      <p role="alert">{{ error() }}</p>
    }
    @if (loading()) {
      <p role="status">Consultando equipe…</p>
    }
    <table>
      <thead>
        <tr>
          <th>Conta</th>
          <th>Cargo</th>
        </tr>
      </thead>
      <tbody>
        @for (member of members(); track member.id) {
          <tr>
            <td>{{ member.username }}</td>
            <td>{{ label(member.role) }}</td>
          </tr>
        }
      </tbody>
    </table>
    @if (!loading() && !error() && !members().length) {
      <p>Nenhuma conta nesta página.</p>
    }
    <div class="actions">
      <button
        class="button secondary"
        [disabled]="loading() || page() === 0"
        (click)="load(page() - 1)"
      >
        Anterior</button
      ><span>Página {{ page() + 1 }}</span
      ><button
        class="button secondary"
        [disabled]="loading() || !hasNext()"
        (click)="load(page() + 1)"
      >
        Próxima
      </button>
    </div>
  </section>`,
})
export class TeamDirectoryComponent {
  private readonly api = inject(CommerceClient);
  readonly members = signal<{ id: string; username: string; role: string }[]>([]);
  readonly page = signal(0);
  readonly hasNext = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');
  constructor() {
    void this.load();
  }
  async load(page = this.page()) {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const r = await this.api.get<{
        items: { id: string; username: string; role: string }[];
        hasNext: boolean;
      }>('admin/team?page=' + page);
      this.members.set(r.items);
      this.hasNext.set(r.hasNext);
      this.page.set(page);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível consultar a equipe.');
    } finally {
      this.loading.set(false);
    }
  }
  label(role: string) {
    return (
      ({ SUPPORT: 'SUP', MODERATOR: 'MOD', ADMIN: 'ADM' } as Record<string, string>)[role] || role
    );
  }
}
