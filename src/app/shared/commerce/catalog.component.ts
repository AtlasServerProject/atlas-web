import { Component, inject, signal, viewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ProductService } from '../../core/product.service';
import { PromotionService } from '../../core/promotion.service';
import { OrderService } from '../../core/order.service';
import { Product, productCategories } from '../../core/models';
import { CountdownComponent } from './countdown.component';
import { ProductEditorComponent } from './product-editor.component';
import { DialogFocusDirective } from '../effects/dialog-focus.directive';
@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [
    CurrencyPipe,
    RouterLink,
    CountdownComponent,
    ProductEditorComponent,
    DialogFocusDirective,
  ],
  template: ` <section class="section commerce-catalog" aria-label="Catálogo da loja">
      <span class="eyebrow">EXPLORE A LOJA</span>
      <h2>Escolha sua próxima <em>conquista.</em></h2>
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
      @if (category() !== 'VIPs') {
        <div class="cards">
          @for (product of products.products(); track product.id) {
            @if (product.active && product.category === category()) {
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
                <button class="button" (click)="selected = product; purchase.showModal()">
                  Comprar
                </button>
              </article>
            }
          }
        </div>
        @if (!hasProducts()) {
          <p class="notice">Novos produtos desta categoria chegarão em breve.</p>
        }
      }
      <ng-content select="[vip-content]" />
      <p role="status">{{ feedback() }}</p>
    </section>
    <app-product-editor #editor />
    <dialog #purchase atlasDialogFocus class="commerce-dialog" aria-labelledby="purchase-title">
      <h2 id="purchase-title">{{ selected?.name }}</h2>
      <p>Compra demonstrativa. Nenhum pagamento ou benefício será entregue.</p>
      @if (auth.isAuthenticated()) {
        <button class="button" (click)="simulate(); purchase.close()">Simular compra</button>
      } @else {
        <a class="button" routerLink="/login" (click)="purchase.close()">Entrar para continuar</a>
      }
      <button class="button secondary" (click)="purchase.close()">Cancelar</button>
    </dialog>`,
})
export class CatalogComponent {
  private readonly changeDetector = inject(ChangeDetectorRef);
  readonly auth = inject(AuthService);
  readonly products = inject(ProductService);
  readonly promotions = inject(PromotionService);
  private readonly orders = inject(OrderService);
  readonly categories = productCategories;
  readonly category = signal<string>('VIPs');
  readonly feedback = signal('');
  selected?: Product;
  private readonly editor = viewChild<ProductEditorComponent>('editor');
  private readonly purchase = viewChild<ElementRef<HTMLDialogElement>>('purchase');
  openEditor(product: Product, kind: 'price' | 'promotion') {
    this.editor()?.open(product, kind);
  }
  buy(product: Product) {
    this.selected = product;
    this.changeDetector.detectChanges();
    this.purchase()?.nativeElement.showModal();
  }
  hasProducts() {
    return this.products.products().some((p) => p.active && p.category === this.category());
  }
  discount(original: number, price: number) {
    return Math.round((1 - price / original) * 100);
  }
  simulate() {
    if (this.selected) {
      this.orders.simulate(this.selected);
      this.feedback.set('Compra simulada registrada em Minhas compras.');
    }
  }
}
