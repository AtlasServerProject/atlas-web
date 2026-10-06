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
  styleUrl: './catalog.component.scss',
  imports: [CurrencyPipe, CountdownComponent, ProductEditorComponent, CheckoutComponent],
  template: `
    <section class="section commerce-catalog" aria-label="Formas de apoio ao servidor">
      <div class="catalog-heading">
        <span class="eyebrow">FORMAS DE APOIO</span>
        <h2>Conheça os <em>benefícios.</em></h2>
      </div>
      @if (products.loading()) {
        <p class="catalog-loading" role="status">Atualizando catálogo…</p>
      }
      @if (products.error()) {
        <div class="catalog-feedback">
          <div>
            <strong>Catálogo indisponível no momento</strong>
            <p role="alert">{{ products.error() }}</p>
          </div>
          <button class="button secondary retry-button" [disabled]="products.loading()" (click)="products.refresh()">
            {{ products.loading() ? 'Atualizando…' : 'Tentar novamente' }}
          </button>
        </div>
      }
      <div class="catalog-filters">
        <span class="filter-label" id="catalog-category-label">Categorias de benefícios</span>
        <div class="category-tabs" role="group" aria-labelledby="catalog-category-label">
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
                    Revisar contribuição
                  </button>
                } @else {
                  <button class="button" disabled>Apoio indisponível</button>
                }
              </article>
            }
          }
        </div>
        @if (!hasProducts()) {
          <p class="notice">Não há benefícios disponíveis nesta categoria no momento.</p>
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
