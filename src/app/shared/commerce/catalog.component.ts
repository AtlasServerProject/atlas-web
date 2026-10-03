import { CheckoutComponent } from './checkout.component';
import { Component, inject, signal, viewChild } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { AuthService } from '../../core/auth.service';
import { ProductService } from '../../core/product.service';
import { PromotionService } from '../../core/promotion.service';
import { Product, productCategories } from '../../core/models';
import { CountdownComponent } from './countdown.component';
import { ProductEditorComponent } from './product-editor.component';
@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CurrencyPipe, CountdownComponent, ProductEditorComponent, CheckoutComponent],
  template: `
    <section class="section commerce-catalog" aria-label="Catálogo da loja">
      <span class="eyebrow">EXPLORE A LOJA</span>
      <h2>Escolha sua próxima <em>conquista.</em></h2>
      @if (products.loading()) {
        <p role="status">Atualizando catálogo…</p>
      }
      @if (products.error()) {
        <p role="alert">{{ products.error() }}</p>
        <button class="button secondary" (click)="products.refresh()">Tentar novamente</button>
      }
      <div class="category-tabs" aria-label="Categorias">
        @for (cat of categories; track cat) {
          <button
            class="button secondary"
            [attr.aria-pressed]="category() === cat"
            (click)="category.set(cat)"
          >
            {{ cat }}
          </button>
        }
      </div>
      @if (category() !== 'VIPs' || extraVips()) {
        <div class="cards">
          @for (product of products.products(); track product.id) {
            @if (
              product.active &&
              product.category === category() &&
              (product.category !== 'VIPs' || product.id > 3)
            ) {
              <article class="card product-card">
                <img
                  [src]="product.imageUrl"
                  [alt]="product.name"
                  width="334"
                  height="163"
                  loading="lazy"
                />
                <span class="eyebrow">{{ product.category }}</span>
                <h3>{{ product.name }}</h3>
                <p>{{ product.description }}</p>
                @if (promotions.activeFor(product.id); as offer) {
                  <span class="pill"
                    >⚡ Oferta · -{{ discount(offer.originalPrice, offer.promotionalPrice) }}%</span
                  >
                  <div class="product-price">
                    <del>{{
                      offer.originalPrice | currency: 'BRL' : 'symbol' : '1.2-2' : 'pt-BR'
                    }}</del
                    ><strong>{{
                      offer.promotionalPrice | currency: 'BRL' : 'symbol' : '1.2-2' : 'pt-BR'
                    }}</strong>
                  </div>
                  <small>TERMINA EM</small><app-countdown [endsAt]="offer.endsAt" />
                } @else {
                  <strong class="product-price">{{
                    product.price | currency: 'BRL' : 'symbol' : '1.2-2' : 'pt-BR'
                  }}</strong>
                }
                @if (auth.adminMode()) {
                  <div class="actions admin-controls">
                    <button class="button secondary" (click)="editor.open(product, 'price')">
                      ✎ Preço</button
                    ><button class="button secondary" (click)="editor.open(product, 'promotion')">
                      ⚡ Promoção
                    </button>
                  </div>
                }
                @if (product.purchasable && product.category === 'VIPs') {
                  <button class="button" (click)="checkout.open(product.id)">
                    Preparar pedido
                  </button>
                } @else {
                  <button class="button" disabled>Vendas em breve</button>
                }
              </article>
            }
          }
        </div>
        @if (!hasProducts()) {
          <p class="notice">Novos produtos desta categoria chegarão em breve.</p>
        }
      }
      <ng-content select="[vip-content]" />
    </section>
    <app-product-editor #editor />
    <app-checkout #checkout />
  `,
})
export class CatalogComponent {
  readonly auth = inject(AuthService);
  readonly products = inject(ProductService);
  readonly promotions = inject(PromotionService);
  readonly categories = productCategories;
  readonly category = signal<string>('VIPs');
  private readonly editor = viewChild<ProductEditorComponent>('editor');
  openEditor(product: Product, kind: 'price' | 'promotion') {
    this.editor()?.open(product, kind);
  }
  extraVips() {
    return this.products.products().some((p) => p.active && p.category === 'VIPs' && p.id > 3);
  }
  hasProducts() {
    return this.products.products().some((p) => p.active && p.category === this.category());
  }
  discount(original: number, price: number) {
    return Math.round((1 - price / original) * 100);
  }
}
