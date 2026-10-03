import { Injectable, computed, inject, effect } from '@angular/core';
import { ClockService } from './clock.service';
import { CatalogApiService } from './catalog-api.service';
import { Promotion } from './models';
@Injectable({ providedIn: 'root' })
export class PromotionService {
  private readonly clock = inject(ClockService);
  private readonly api = inject(CatalogApiService);
  readonly promotions = this.api.promotions.asReadonly();
  private readonly boundary = computed(() =>
    this.promotions()
      .filter((p) => ['SCHEDULED', 'ACTIVE'].includes(p.status))
      .map((p) => (p.status === 'ACTIVE' ? Date.parse(p.endsAt) : Date.parse(p.startsAt)))
      .filter((t) => Number.isFinite(t)),
  );
  private lastBoundary = 0;
  constructor() {
    effect(() => {
      const now = this.clock.now();
      const boundary = this.boundary()
        .filter((t) => t <= now)
        .sort((a, b) => b - a)[0];
      if (boundary && boundary !== this.lastBoundary) {
        this.lastBoundary = boundary;
        void this.api.refresh();
      }
    });
  }
  activeFor(id: number) {
    return this.promotions().find((p) => p.productId === id && p.status === 'ACTIVE');
  }
  save(
    input: Omit<Promotion, 'id' | 'status' | 'originalPrice'>,
    id?: number,
    discountBasisPoints?: number,
    revision?: number,
    productRevision?: number,
  ) {
    const product = this.api.products().find((p) => p.id === input.productId);
    const body = {
      productId: input.productId,
      server: 'emerald',
      name: input.name,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      revision: revision ?? 0,
      productRevision: productRevision ?? product?.revision,
      finalCents:
        discountBasisPoints === undefined ? Math.round(input.promotionalPrice * 100) : null,
      discountBasisPoints: discountBasisPoints ?? null,
    };
    return this.api.mutate(id ? 'PATCH' : 'POST', id ? `promotions/${id}` : 'promotions', body);
  }
  cancel(id: number, revision?: number) {
    return this.end(id, 'CANCELLED', revision);
  }
  finish(id: number, revision?: number) {
    return this.end(id, 'FINISHED', revision);
  }
  private end(id: number, status: string, revision?: number) {
    return this.api.mutate('PATCH', `promotions/${id}/status`, {
      status,
      revision: revision ?? this.promotions().find((p) => p.id === id)?.revision,
    });
  }
}
