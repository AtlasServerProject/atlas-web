import { Injectable, inject, signal, effect } from '@angular/core';
import { AuthService } from './auth.service';
import { CommerceClient } from './commerce-client.service';
export interface MinecraftLink {
  id: string;
  subject: string;
  corePlayerId: number;
  minecraftUuid: string;
  nickname: string;
  server: string;
  linkedAt: string;
}
export interface LinkChallenge {
  id: string;
  state: 'WAITING' | 'PROVED';
  expiresAt: string;
  subject: string | null;
  nickname: string | null;
  server: string | null;
}
export interface LinkStatus {
  current: MinecraftLink | null;
  pending: LinkChallenge | null;
}
@Injectable({ providedIn: 'root' })
export class MinecraftLinkService {
  private readonly auth = inject(AuthService);
  private readonly api = inject(CommerceClient);
  readonly status = signal<LinkStatus>({ current: null, pending: null });
  readonly code = signal('');
  readonly error = signal('');
  readonly busy = signal(false);
  private owner = '';
  private generation = 0;
  constructor() {
    effect(() => {
      const id = this.auth.currentUser()?.id || '';
      if (id !== this.owner) {
        this.owner = id;
        this.generation++;
        this.status.set({ current: null, pending: null });
        this.code.set('');
        this.error.set('');
        this.busy.set(false);
        if (id) void this.refresh();
      }
    });
  }
  async refresh() {
    const owner = this.owner;
    const generation = this.generation;
    if (!owner) return;
    try {
      const result = await this.api.get<LinkStatus>('users/me/minecraft-link');
      if (owner !== this.owner || generation !== this.generation) return;
      this.status.set(result);
      if (!result.pending) this.code.set('');
      this.error.set('');
    } catch (e) {
      if (owner === this.owner && generation === this.generation)
        this.error.set(e instanceof Error ? e.message : 'Não foi possível consultar o vínculo.');
    }
  }
  private async action(work: () => Promise<void>) {
    if (this.busy()) return;
    const generation = ++this.generation;
    this.busy.set(true);
    this.error.set('');
    try {
      await work();
    } catch (e) {
      if (generation === this.generation)
        this.error.set(e instanceof Error ? e.message : 'Não foi possível concluir o vínculo.');
    } finally {
      if (generation === this.generation) this.busy.set(false);
    }
  }
  async create() {
    const owner = this.owner;
    await this.action(async () => {
      const c = await this.api.post<{ id: string; code: string; expiresAt: string }>(
        'users/me/minecraft-link-challenges',
        {},
      );
      if (owner !== this.owner) return;
      this.code.set(c.code);
      this.status.set({
        current: null,
        pending: {
          id: c.id,
          state: 'WAITING',
          expiresAt: c.expiresAt,
          subject: null,
          nickname: null,
          server: null,
        },
      });
    });
  }
  async confirm() {
    const pending = this.status().pending;
    if (!pending?.subject) return;
    const owner = this.owner;
    await this.action(async () => {
      const current = await this.api.post<MinecraftLink>('users/me/minecraft-link-confirmations', {
        challengeId: pending.id,
        subject: pending.subject,
      });
      if (owner !== this.owner) return;
      this.status.set({ current, pending: null });
      this.code.set('');
    });
  }
  async unlink(password: string) {
    const owner = this.owner;
    await this.action(async () => {
      await this.api.post<void>('users/me/minecraft-unlink', { password });
      if (owner !== this.owner) return;
      this.status.set({ current: null, pending: null });
      this.code.set('');
    });
  }
}
