import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommerceClient } from '../../core/commerce-client.service';
interface DeliveryAttempt { id: string; orderId: string; nickname: string; state: string; attempts: number; leaseUntil: string | null; nextAttempt: string; lastError: string | null; createdAt: string; }
@Component({
  selector: 'app-delivery-admin', standalone: true, imports: [DatePipe, FormsModule],
  template: `<section class="section admin-section" aria-labelledby="delivery-title">
    <h2 id="delivery-title">Entregas de VIP</h2>
    <p>Acompanhe as tentativas e solicite uma nova verificação quando necessário.</p>
    <button type="button" class="button secondary" [disabled]="busy()" (click)="load()">Atualizar entregas</button>
    @if (error()) { <p role="alert">{{ error() }}</p> }
    @if (feedback()) { <p role="status">{{ feedback() }}</p> }
    @if (busy()) { <p role="status">Consultando entregas…</p> }
    @for (delivery of items(); track delivery.id) {
      <article class="card">
        <h3>{{ delivery.nickname }}</h3>
        <p>{{ label(delivery.state) }} · {{ delivery.attempts }} tentativa(s)</p>
        <p>Criada em {{ delivery.createdAt | date: 'dd/MM/yyyy HH:mm' : '-0300' }}</p>
        @if (delivery.lastError) { <p>{{ issue(delivery.lastError) }}</p> }
        <small>Pedido {{ delivery.orderId }}</small>
        @if (delivery.state !== 'DELIVERED') {
          <form (ngSubmit)="retry(delivery.id)">
            <label>Justificativa<textarea [name]="'reason-' + delivery.id" required minlength="10" maxlength="500" [(ngModel)]="reasons[delivery.id]"></textarea></label>
            <button class="button secondary" [disabled]="busy()">Solicitar reprocessamento</button>
          </form>
        }
      </article>
    }
    @if (!busy() && !error() && !items().length) { <p>Nenhuma entrega registrada.</p> }
    <div class="actions">
      <button class="button secondary" [disabled]="busy() || page() === 0" (click)="load(page() - 1)">Anterior</button>
      <span>Página {{ page() + 1 }}</span>
      <button class="button secondary" [disabled]="busy() || !hasNext()" (click)="load(page() + 1)">Próxima</button>
    </div>
  </section>`,
})
export class DeliveryAdminComponent implements OnInit {
  private readonly client = inject(CommerceClient);
  readonly items = signal<DeliveryAttempt[]>([]); readonly page = signal(0); readonly hasNext = signal(false);
  readonly busy = signal(false); readonly error = signal(''); readonly feedback = signal('');
  reasons: Record<string, string> = {};
  ngOnInit() { void this.load(); }
  async load(page = this.page()) {
    if (this.busy()) return; this.busy.set(true); this.error.set('');
    try { const rows = await this.client.get<DeliveryAttempt[]>('admin/deliveries?page=' + page); this.items.set(rows.slice(0,20)); this.hasNext.set(rows.length > 20); this.page.set(page); }
    catch(e) { this.error.set(e instanceof Error ? e.message : 'Não foi possível consultar entregas.'); }
    finally { this.busy.set(false); }
  }
  async retry(id: string) {
    if(this.busy()) return; const reason = (this.reasons[id] || '').trim();
    if(reason.length < 10) { this.error.set('Descreva a justificativa com pelo menos 10 caracteres.'); return; }
    this.busy.set(true); this.error.set(''); this.feedback.set('');
    try { await this.client.post('admin/deliveries/' + id + '/retry', { reason }); this.feedback.set('Reprocessamento solicitado. A entrega mantém o mesmo identificador.'); delete this.reasons[id]; }
    catch(e) { this.error.set(e instanceof Error ? e.message : 'Não foi possível solicitar reprocessamento.'); }
    finally { this.busy.set(false); }
    if(!this.error()) await this.load();
  }
  label(state:string) { return ({ WAITING:'Aguardando entrega',REVIEW:'Requer revisão',DELIVERED:'Entregue' } as Record<string,string>)[state] || state; }
  issue(code:string) { return ({ IDENTITY_MISMATCH:'A identidade do jogador precisa ser conferida.',UNSUPPORTED_PLAN:'O plano precisa ser conferido.',RETRY_LIMIT:'Limite de tentativas atingido.',CORE_UNAVAILABLE:'O servidor estava indisponível.' } as Record<string,string>)[code] || 'A entrega precisa de revisão.'; }
}
