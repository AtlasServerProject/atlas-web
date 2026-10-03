import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CommerceClient } from '../../core/commerce-client.service';
interface VipStatus {
  linked: boolean;
  synchronizedWithCore: boolean;
  activeLevel: number;
  activeUntil: string | null;
  paused: { level: number; remainingSeconds: number }[];
}
@Component({
  selector: 'app-vip-status',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `<section aria-labelledby="vip-title" class="card">
    <h2 id="vip-title">Seu VIP no Emerald</h2>
    @if (status(); as vip) {
      @if (!vip.linked) {
        <p>Vincule sua conta Minecraft para consultar seu VIP.</p>
      } @else if (vip.activeLevel > 0) {
        <p class="pill">VIP {{ vip.activeLevel }} ativo</p>
        <p>Válido até {{ vip.activeUntil | date: 'dd/MM/yyyy HH:mm' : '-0300' }}.</p>
        @for (plan of vip.paused; track plan.level) {
          <p>VIP {{ plan.level }} pausado · {{ duration(plan.remainingSeconds) }} restantes.</p>
        }
        @if (vip.paused.length) {
          <p>Quando o plano superior terminar, o próximo VIP retoma o tempo que restava.</p>
        }
      } @else {
        <p>Você não possui um VIP da loja ativo neste momento.</p>
        <a class="text-link" routerLink="/minhas-compras">Acompanhar minhas compras →</a>
      }
    }
    @if (error()) { <p role="alert">{{ error() }}</p> }
    @if (loading()) { <p role="status">Consultando seu VIP…</p> }
    <button type="button" class="button secondary" [disabled]="loading()" (click)="load()">Atualizar VIP</button>
  </section>`,
})
export class VipStatusComponent implements OnInit {
  private readonly client = inject(CommerceClient);
  readonly status = signal<VipStatus | null>(null);
  readonly error = signal('');
  readonly loading = signal(false);
  private readonly destroyRef = inject(DestroyRef);
  ngOnInit() { void this.load(); const timer = setInterval(() => { void this.load(); }, 30000); this.destroyRef.onDestroy(() => clearInterval(timer)); }
  async load() {
    if (this.loading()) return;
    this.loading.set(true); this.error.set('');
    try { this.status.set(await this.client.get<VipStatus>('users/me/vip')); }
    catch (e) { this.status.set(null); this.error.set(e instanceof Error ? e.message : 'Não foi possível consultar seu VIP.'); }
    finally { this.loading.set(false); }
  }
  duration(seconds: number) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return days ? `${days} dia${days === 1 ? '' : 's'}${hours ? ` e ${hours}h` : ''}` : `${Math.max(1, Math.ceil(seconds / 60))} min`;
  }
}
