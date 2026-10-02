import { readMock, writeMock } from './mock-session';
import { Injectable, signal } from '@angular/core';
import { Product } from './models';
import { mockProducts, vipPlans } from './mock-data';
@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly state = signal<Product[]>(
    readMock<Product[]>(
      'products',
      mockProducts.map((p) => ({ ...p })),
    ),
  );
  readonly products = this.state.asReadonly();
  readonly plans = vipPlans;
  async updatePrice(id: number, price: number) {
    if (
      !Number.isFinite(price) ||
      price <= 0 ||
      price > 1000000 ||
      Math.abs(price * 100 - Math.round(price * 100)) > 0.00001
    )
      throw new Error(
        'Informe um preço positivo com até duas casas decimais (máximo R$ 1.000.000).',
      );
    if (!this.state().some((p) => p.id === id)) throw new Error('Produto não encontrado.');
    this.state.update((ps) => ps.map((p) => (p.id === id ? { ...p, price } : p)));
    writeMock('products', this.state());
  }
}
