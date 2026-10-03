import { Injectable, inject } from '@angular/core';
import { CatalogApiService } from './catalog-api.service';
import { vipPlans } from './mock-data';
import { Product } from './models';
@Injectable({ providedIn: 'root' })
export class ProductService {
  readonly api = inject(CatalogApiService);
  readonly products = this.api.products.asReadonly();
  readonly plans = vipPlans;
  readonly loading = this.api.loading.asReadonly();
  readonly error = this.api.error.asReadonly();
  refresh() {
    return this.api.refresh();
  }
  updatePrice(id: number, price: number, revision?: number) {
    if (
      !Number.isFinite(price) ||
      price <= 0 ||
      price > 1000000 ||
      Math.abs(price * 100 - Math.round(price * 100)) > 0.00001
    )
      throw new Error('Informe um preço positivo com até duas casas decimais.');
    return this.api.mutate('PATCH', `products/${id}/price`, {
      priceCents: Math.round(price * 100),
      revision: revision ?? this.products().find((p) => p.id === id)?.revision,
    });
  }
  save(product: Product) {
    if (
      !Number.isFinite(product.price) ||
      product.price <= 0 ||
      product.price > 1000000 ||
      Math.abs(product.price * 100 - Math.round(product.price * 100)) > 0.00001
    )
      throw new Error('Informe preço positivo com até duas casas decimais.');
    const body = {
      slug: product.slug,
      name: product.name,
      description: product.description,
      category: product.category,
      active: product.active,
      server: 'emerald',
      priceCents: Math.round(product.price * 100),
      revision: product.revision ?? 0,
    };
    return this.api.mutate(
      product.id ? 'PATCH' : 'POST',
      product.id ? `products/${product.id}` : 'products',
      body,
    );
  }
  setActive(product: Product, active: boolean) {
    return this.api.mutate('PATCH', `products/${product.id}/offer`, {
      active,
      revision: product.revision,
    });
  }
}
