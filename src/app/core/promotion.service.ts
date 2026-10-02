import { readMock, writeMock } from './mock-session';
import { Injectable, computed, inject, signal } from '@angular/core';
import { ClockService } from './clock.service';
import { ProductService } from './product.service';
import { Promotion, PromotionStatus } from './models';
@Injectable({ providedIn: 'root' })
export class PromotionService {
  private readonly clock = inject(ClockService);
  private readonly products = inject(ProductService);
  private readonly state = signal<Promotion[]>(readMock<Promotion[]>('promotions', []));
  readonly promotions = computed(() => this.state().map((p) => ({ ...p, status: this.status(p) })));
  private status(p: Promotion): PromotionStatus {
    if (p.status === 'CANCELLED' || p.status === 'FINISHED') return p.status;
    const now = this.clock.now();
    return now >= Date.parse(p.endsAt)
      ? 'FINISHED'
      : now >= Date.parse(p.startsAt)
        ? 'ACTIVE'
        : 'SCHEDULED';
  }
  activeFor(id: number) {
    return this.promotions().find((p) => p.productId === id && p.status === 'ACTIVE');
  }
  async save(input: Omit<Promotion, 'id' | 'status' | 'originalPrice'>, id?: number) {
    const product = this.products.products().find((p) => p.id === input.productId);
    const start = Date.parse(input.startsAt),
      end = Date.parse(input.endsAt);
    if (
      !product ||
      !input.name.trim() ||
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      end <= start ||
      end <= Date.now()
    )
      throw new Error(
        'Informe nome e datas válidas; o término deve ser futuro e posterior ao início.',
      );
    if (
      !Number.isFinite(input.promotionalPrice) ||
      input.promotionalPrice <= 0 ||
      input.promotionalPrice >= product.price ||
      Math.abs(input.promotionalPrice * 100 - Math.round(input.promotionalPrice * 100)) > 0.00001
    )
      throw new Error(
        'O preço promocional deve ser positivo e menor que o preço atual, com até duas casas decimais.',
      );
    if (
      this.promotions().some(
        (p) =>
          p.id !== id &&
          p.productId === product.id &&
          ['ACTIVE', 'SCHEDULED'].includes(p.status) &&
          start < Date.parse(p.endsAt) &&
          end > Date.parse(p.startsAt),
      )
    )
      throw new Error('Já existe uma promoção neste intervalo para o produto.');
    const promotion: Promotion = {
      ...input,
      name: input.name.trim(),
      id: id ?? Date.now(),
      originalPrice: product.price,
      status: 'SCHEDULED',
    };
    this.state.update((ps) => [...ps.filter((p) => p.id !== id), promotion]);
    writeMock('promotions', this.state());
  }
  cancel(id: number) {
    this.state.update((ps) => ps.map((p) => (p.id === id ? { ...p, status: 'CANCELLED' } : p)));
    writeMock('promotions', this.state());
  }
  finish(id: number) {
    this.state.update((ps) => ps.map((p) => (p.id === id ? { ...p, status: 'FINISHED' } : p)));
    writeMock('promotions', this.state());
  }
}
