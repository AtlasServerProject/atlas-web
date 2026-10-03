import { Injectable, inject, signal, effect } from '@angular/core';
import { AuthService } from './auth.service';
import { CommerceClient } from './commerce-client.service';
export interface CheckoutInput {
  productId: number;
  server: string;
  quantity: number;
  productRevision: number;
  catalogRevision: number;
  expectedCents: number;
}
export interface AtlasOrder {
  id: string;
  snapshot: {
    productName: string;
    nickname: string;
    subject: string;
    server: string;
    durationDays: number;
    unitCents: number;
  };
  totalCents: number;
  currency: string;
  quantity: number;
  createdAt: string;
  expiresAt: string;
  paymentStatus: string;
  deliveryStatus: string;
}
interface OrdersPage {
  items: AtlasOrder[];
  page: number;
  size: number;
  hasNext: boolean;
}
@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly auth = inject(AuthService);
  private readonly api = inject(CommerceClient);
  private owner = '';
  private generation = 0;
  readonly mine = signal<AtlasOrder[]>([]);
  readonly page = signal(0);
  readonly hasNext = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');
  constructor() {
    effect(() => {
      const id = this.auth.currentUser()?.id || '';
      if (id !== this.owner) {
        this.owner = id;
        this.generation++;
        this.mine.set([]);
        this.page.set(0);
        this.hasNext.set(false);
        this.error.set('');
        this.loading.set(false);
        if (id) void this.load(0);
      }
    });
  }
  async load(page = this.page()) {
    const owner = this.owner;
    const generation = ++this.generation;
    if (!owner) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.api.get<OrdersPage>('orders?page=' + page);
      if (owner !== this.owner || generation !== this.generation) return;
      this.mine.set(result.items);
      this.page.set(result.page);
      this.hasNext.set(result.hasNext);
    } catch (e) {
      if (owner === this.owner && generation === this.generation)
        this.error.set(e instanceof Error ? e.message : 'Não foi possível consultar seus pedidos.');
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }
  async checkout(input: CheckoutInput, key: string) {
    return this.api.post<AtlasOrder>('orders/checkout', input, { 'Idempotency-Key': key });
  }
  async detail(id: string) {
    return this.api.get<AtlasOrder>('orders/' + encodeURIComponent(id));
  }
  paymentLabel(status: string) {
    return (
      (
        {
          PENDING: 'Aguardando pagamento',
          PAID: 'Pagamento confirmado',
          FAILED: 'Pagamento não concluído',
          CANCELLED: 'Pedido cancelado',
          EXPIRED: 'Prazo do pedido encerrado',
          REFUNDED: 'Reembolsado',
          CHARGEBACK: 'Pagamento contestado',
        } as Record<string, string>
      )[status] || 'Em análise'
    );
  }
  deliveryLabel(status: string) {
    return (
      (
        {
          WAITING: 'Aguardando confirmação do pagamento',
          PROCESSING: 'Preparando entrega',
          DELIVERED: 'Entregue',
          RETRY: 'Nova tentativa de entrega',
          REVIEW: 'Entrega em análise',
        } as Record<string, string>
      )[status] || 'Em análise'
    );
  }
}
