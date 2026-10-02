import { readMock, writeMock } from './mock-session';
import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { Order, Product } from './models';
import { PromotionService } from './promotion.service';
@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly auth = inject(AuthService);
  private readonly promotions = inject(PromotionService);
  private readonly orders = signal<Order[]>(readMock<Order[]>('orders', []));
  readonly mine = computed(() =>
    this.orders().filter((o) => o.userId === this.auth.currentUser()?.id),
  );
  simulate(product: Product) {
    const user = this.auth.currentUser();
    if (!user) throw new Error('Entre na sua conta para simular uma compra.');
    // Mock only: real checkout must calculate prices on the backend, never trust browser amounts.
    this.orders.update((os) => [
      {
        id: Date.now(),
        userId: user.id,
        productName: product.name,
        price: this.promotions.activeFor(product.id)?.promotionalPrice ?? product.price,
        purchasedAt: new Date().toISOString(),
        paymentStatus: 'SIMULATED',
        deliveryStatus: 'SIMULATED',
      },
      ...os,
    ]);
    writeMock('orders', this.orders());
  }
}
