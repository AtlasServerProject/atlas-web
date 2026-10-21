import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrderReceipt, OrderService } from '../../core/order.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-order-receipt',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink],
  styles: [
    `
      :host {
        display: block;
      }
      dd {
        margin: 0 0 1rem;
        overflow-wrap: anywhere;
      }
      dt {
        font-weight: bold;
      }
      .actions {
        margin: 1rem 0;
      }
      @media print {
        .actions {
          display: none;
        }
        .card {
          color: #000;
          background: #fff;
          border: 1px solid #999;
          break-inside: avoid;
        }
      }
    `,
  ],
  template: `<section class="section">
    <h1>Comprovante da compra</h1>
    <div class="actions">
      <a class="button secondary" routerLink="/minhas-compras">Voltar às compras</a>
      @if (visibleReceipt()) {
        <button class="button" [disabled]="downloading()" (click)="download()">
          {{ downloading() ? 'Preparando PDF…' : 'Baixar comprovante (PDF)' }}
        </button>
        <button class="button secondary" (click)="print()">Imprimir / salvar PDF</button>
      }
    </div>
    @if (loading()) {
      <p role="status">Consultando comprovante…</p>
    }
    @if (error()) {
      <p role="alert">{{ error() }}</p>
      <button class="button secondary" (click)="load()">Tentar novamente</button>
    }
    @if (visibleReceipt(); as receipt) {
      <article class="card">
        <h2>Atlas Cobblemon</h2>
        <dl>
          <dt>Pedido</dt>
          <dd>{{ receipt.order.id }}</dd>
          <dt>Produto</dt>
          <dd>
            {{ receipt.order.snapshot.productName }} ·
            {{ receipt.order.snapshot.durationDays }} dias
          </dd>
          <dt>Destinatário</dt>
          <dd>{{ receipt.order.snapshot.nickname }} · {{ receipt.order.snapshot.server }}</dd>
          <dt>Valor do pedido</dt>
          <dd>
            {{
              receipt.order.totalCents / 100
                | currency: receipt.order.currency : 'symbol' : '1.2-2' : 'pt-BR'
            }}
          </dd>
          <dt>Data do pedido (Brasília)</dt>
          <dd>{{ receipt.order.createdAt | date: 'dd/MM/yyyy HH:mm:ss' : '-0300' }}</dd>
          <dt>Pagamento</dt>
          <dd>{{ orders.paymentLabel(receipt.order.paymentStatus) }}</dd>
          <dt>Entrega</dt>
          <dd>{{ orders.deliveryLabel(receipt.order.deliveryStatus) }}</dd>
        </dl>
        <h2>Pagamentos associados</h2>
        @for (payment of receipt.payments; track payment.id) {
          <div class="card">
            <h3>Mercado Pago · {{ payment.id }}</h3>
            @if (payment.mode === 'test') {
              <p class="notice">Compra de teste — sem cobrança real.</p>
            }
            <p>{{ transactionLabel(payment.status) }}</p>
            <p>
              Valor:
              {{
                receipt.order.totalCents / 100
                  | currency: receipt.order.currency : 'symbol' : '1.2-2' : 'pt-BR'
              }}
            </p>
            <p>
              Última atualização (Brasília):
              {{ payment.updatedAt | date: 'dd/MM/yyyy HH:mm:ss' : '-0300' }}
            </p>
            @if (payment.duplicate) {
              <p class="notice">
                Pagamento duplicado registrado para revisão. Não representa uma segunda entrega. O
                reembolso depende de atendimento.
              </p>
            }
          </div>
        }
        <p>
          Comprovante de compra do Atlas. Não é uma nota fiscal. Para atendimento no Discord,
          informe o número do pedido e do pagamento. A equipe confere o histórico no sistema.
        </p>
      </article>
    }
  </section>`,
})
export class OrderReceiptComponent {
  readonly orders = inject(OrderService);
  private readonly auth = inject(AuthService);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') || '';
  private owner = '';
  readonly receipt = signal<OrderReceipt | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly downloading = signal(false);
  async download() {
    if (!this.visibleReceipt() || this.downloading()) return;
    this.downloading.set(true);
    this.error.set('');
    try {
      await this.orders.downloadReceipt(this.id);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível baixar o comprovante.');
    } finally {
      this.downloading.set(false);
    }
  }
  constructor() {
    void this.load();
  }
  visibleReceipt() {
    return this.owner === this.auth.currentUser()?.id ? this.receipt() : null;
  }
  async load() {
    if (this.loading()) return;
    this.owner = this.auth.currentUser()?.id || '';
    this.receipt.set(null);
    this.error.set('');
    this.loading.set(true);
    try {
      this.receipt.set(await this.orders.receipt(this.id));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível consultar o comprovante.');
    } finally {
      this.loading.set(false);
    }
  }
  print() {
    if (this.visibleReceipt()) window.print();
  }
  transactionLabel(status: string) {
    return (
      (
        {
          approved: 'Pagamento aprovado',
          refunded: 'Pagamento reembolsado',
          charged_back: 'Pagamento contestado',
        } as Record<string, string>
      )[status] || 'Em análise'
    );
  }
}
