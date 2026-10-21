import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommerceClient } from '../../core/commerce-client.service';
import { AtlasOrder, OrderService, OrderReceipt } from '../../core/order.service';
import { AuthService } from '../../core/auth.service';
interface Ticket {
  id: string;
  orderId: string;
  title: string;
  status: string;
  updatedAt: string;
}
interface Message {
  id: number;
  kind: string;
  body: string;
  createdAt: string;
}
interface Detail {
  ticket: Ticket;
  order: AtlasOrder;
  payments: OrderReceipt['payments'];
  messages: Message[];
  hasMore: boolean;
}
@Component({
  selector: 'app-tickets-page',
  standalone: true,
  imports: [FormsModule, DatePipe, CurrencyPipe, RouterLink],
  styles: [
    `
      input,
      textarea,
      select {
        width: 100%;
        box-sizing: border-box;
      }
      textarea {
        min-height: 8rem;
      }
      .message {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
      small,
      dd {
        overflow-wrap: anywhere;
      }
      .actions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin: 1rem 0;
      }
    `,
  ],
  template: `<section class="section">
    <h1>{{ admin ? 'Atendimento — equipe' : 'Meus tickets' }}</h1>
    <p>Suporte de compras do Atlas. O histórico fica vinculado ao pedido.</p>
    <div class="actions">
      <a
        class="button secondary"
        [routerLink]="admin ? (auth.isAdmin() ? '/admin' : '/conta') : '/minhas-compras'"
        >{{ admin ? 'Voltar ao painel' : 'Minhas compras' }}</a
      ><button class="button secondary" [disabled]="busy()" (click)="refresh()">Atualizar</button>
    </div>
    @if (error()) {
      <p role="alert">{{ error() }}</p>
    }
    @if (busy()) {
      <p role="status">Carregando atendimento…</p>
    }
    @if (newOrder(); as order) {
      <form class="card" (ngSubmit)="create()">
        <h2>Ajuda com {{ order.snapshot.productName }}</h2>
        <p>Pedido {{ order.id }} · {{ order.snapshot.nickname }}</p>
        <label>Assunto<input name="title" [(ngModel)]="title" required maxlength="120" /></label>
        <label
          >Descreva o problema<textarea
            name="body"
            [(ngModel)]="body"
            required
            maxlength="4000"
          ></textarea>
        </label>
        <p>
          Você pode incluir links HTTPS de prints ou vídeos na mensagem. Não envie senhas nem dados
          de cartão.
        </p>
        <button class="button" [disabled]="busy() || !title.trim() || !body.trim()">
          Abrir atendimento
        </button>
      </form>
    }
    @if (detail(); as d) {
      <article class="card">
        <h2>{{ d.ticket.title }}</h2>
        <p>{{ label(d.ticket.status) }}</p>
        <small>Ticket {{ d.ticket.id }}</small>
        <h3>Pedido vinculado</h3>
        <p>{{ d.order.id }}</p>
        <p>
          {{ d.order.snapshot.productName }} · {{ d.order.snapshot.nickname }} ·
          {{ d.order.snapshot.server }}
        </p>
        <p>
          {{ d.order.totalCents / 100 | currency: d.order.currency : 'symbol' : '1.2-2' : 'pt-BR' }}
          · {{ orders.paymentLabel(d.order.paymentStatus) }} ·
          {{ orders.deliveryLabel(d.order.deliveryStatus) }}
        </p>
        @for (payment of d.payments; track payment.id) {
          <p>
            Mercado Pago {{ payment.id }} · {{ payment.status }}
            @if (payment.duplicate) {
              <strong>Pagamento duplicado para revisão</strong>
            }
            @if (payment.mode === 'test') {
              <span> · Teste</span>
            }
          </p>
        }
        @if (admin) {
          <form (ngSubmit)="changeStatus()">
            <label
              >Status do ticket<select name="status" [(ngModel)]="status">
                <option value="OPEN">Aberto</option>
                <option value="IN_PROGRESS">Em atendimento</option>
                <option value="WAITING_CUSTOMER">Aguardando cliente</option>
                <option value="RESOLVED">Resolvido</option>
              </select></label
            ><button class="button secondary" [disabled]="busy()">Salvar status</button>
          </form>
        }
        <h3>Conversa</h3>
        @for (message of d.messages; track message.id) {
          <div class="card">
            <strong>{{
              message.kind === 'STAFF'
                ? 'Equipe Atlas'
                : message.kind === 'STATUS'
                  ? 'Atualização de status'
                  : 'Cliente'
            }}</strong>
            <p>{{ message.createdAt | date: 'dd/MM/yyyy HH:mm' : '-0300' }}</p>
            <p class="message">
              {{ message.kind === 'STATUS' ? label(message.body) : message.body }}
            </p>
          </div>
        }
        @if (d.hasMore) {
          <button class="button secondary" [disabled]="busy()" (click)="more()">
            Carregar mensagens seguintes
          </button>
        }
        <form (ngSubmit)="send()">
          <label
            >Mensagem<textarea
              name="message"
              [(ngModel)]="message"
              required
              maxlength="4000"
            ></textarea>
          </label>
          <p>
            Ao responder, o atendimento é retomado. Você pode incluir links HTTPS de evidências.
          </p>
          <button class="button" [disabled]="busy() || !message.trim()">Enviar mensagem</button>
        </form>
      </article>
    }
    <h2>{{ admin ? 'Fila de tickets' : 'Seus atendimentos' }}</h2>
    @for (ticket of tickets(); track ticket.id) {
      <article class="card">
        <h3>{{ ticket.title }}</h3>
        <p>
          {{ label(ticket.status) }} · {{ ticket.updatedAt | date: 'dd/MM/yyyy HH:mm' : '-0300' }}
        </p>
        <button class="button secondary" [disabled]="busy()" (click)="open(ticket.id)">
          Abrir conversa
        </button>
      </article>
    }
    @if (!busy() && !tickets().length) {
      <p>
        Nenhum ticket nesta página. Para abrir atendimento, escolha “Preciso de ajuda” em Minhas
        compras.
      </p>
    }
    <div class="actions">
      <button
        class="button secondary"
        [disabled]="busy() || page() === 0"
        (click)="list(page() - 1)"
      >
        Anterior</button
      ><span>Página {{ page() + 1 }}</span
      ><button
        class="button secondary"
        [disabled]="busy() || !hasNext()"
        (click)="list(page() + 1)"
      >
        Próxima
      </button>
    </div>
  </section>`,
})
export class TicketsPageComponent {
  private readonly api = inject(CommerceClient);
  private readonly route = inject(ActivatedRoute);
  readonly auth = inject(AuthService);
  readonly orders = inject(OrderService);
  readonly admin = this.route.snapshot.data['admin'] === true;
  readonly tickets = signal<Ticket[]>([]);
  readonly detail = signal<Detail | null>(null);
  readonly newOrder = signal<AtlasOrder | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly page = signal(0);
  readonly hasNext = signal(false);
  title = '';
  body = '';
  message = '';
  status = 'OPEN';
  private get base() {
    return this.admin ? 'admin/support/tickets' : 'support/tickets';
  }
  constructor() {
    void this.initialize();
  }
  private async run(action: () => Promise<void>) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    const owner = this.auth.currentUser()?.id;
    try {
      await action();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível carregar o atendimento.');
    } finally {
      if (owner !== this.auth.currentUser()?.id) {
        this.detail.set(null);
        this.tickets.set([]);
        this.newOrder.set(null);
      }
      this.busy.set(false);
    }
  }
  private async fetchList(page = this.page()) {
    const r = await this.api.get<{ items: Ticket[]; hasNext: boolean }>(
      this.base + '?page=' + page,
    );
    this.tickets.set(r.items);
    this.hasNext.set(r.hasNext);
    this.page.set(page);
  }
  private async fetchDetail(id: string) {
    const d = await this.api.get<Detail>(this.base + '/' + encodeURIComponent(id));
    this.detail.set(d);
    this.status = d.ticket.status;
  }
  private initialize() {
    return this.run(async () => {
      await this.fetchList(0);
      const order = this.route.snapshot.queryParamMap.get('pedido');
      if (order && !this.admin) this.newOrder.set(await this.orders.detail(order));
    });
  }
  list(page: number) {
    return this.run(() => this.fetchList(page));
  }
  refresh() {
    return this.run(async () => {
      await this.fetchList();
      if (this.detail()) await this.fetchDetail(this.detail()!.ticket.id);
    });
  }
  open(id: string) {
    this.message = '';
    return this.run(() => this.fetchDetail(id));
  }
  create() {
    return this.run(async () => {
      const order = this.newOrder();
      if (!order) return;
      const t = await this.api.post<Ticket>(this.base, {
        orderId: order.id,
        title: this.title,
        body: this.body,
      });
      this.newOrder.set(null);
      this.body = '';
      await this.fetchList(0);
      await this.fetchDetail(t.id);
    });
  }
  send() {
    return this.run(async () => {
      const d = this.detail();
      if (!d) return;
      await this.api.post(this.base + '/' + d.ticket.id + '/messages', { body: this.message });
      this.message = '';
      await this.fetchDetail(d.ticket.id);
      await this.fetchList();
    });
  }
  changeStatus() {
    return this.run(async () => {
      const d = this.detail();
      if (!d) return;
      await this.api.post(this.base + '/' + d.ticket.id + '/status', { status: this.status });
      await this.fetchDetail(d.ticket.id);
      await this.fetchList();
    });
  }
  more() {
    return this.run(async () => {
      const d = this.detail();
      if (!d) return;
      const after = d.messages.at(-1)?.id || 0;
      const next = await this.api.get<Detail>(this.base + '/' + d.ticket.id + '?after=' + after);
      this.detail.set({ ...next, messages: [...d.messages, ...next.messages] });
    });
  }
  label(status: string) {
    return (
      (
        {
          OPEN: 'Aberto',
          IN_PROGRESS: 'Em atendimento',
          WAITING_CUSTOMER: 'Aguardando cliente',
          RESOLVED: 'Resolvido',
        } as Record<string, string>
      )[status] || 'Em análise'
    );
  }
}
