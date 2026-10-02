import { Component, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ProductService } from '../../core/product.service';
import { PromotionService } from '../../core/promotion.service';
import { Promotion, PromotionStatus } from '../../core/models';
import { ProductEditorComponent } from '../../shared/commerce/product-editor.component';
import { DialogFocusDirective } from '../../shared/effects/dialog-focus.directive';
import { CountdownComponent } from '../../shared/commerce/countdown.component';
@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    ProductEditorComponent,
    CountdownComponent,
    DialogFocusDirective,
  ],
  template: ` <section class="section page-intro">
      <span class="eyebrow">ATLAS ADMIN</span>
      <h1>Cuide do próximo <em>capítulo.</em></h1>
      <p>Gerencie o catálogo e as ofertas desta demonstração.</p>
    </section>
    <section class="section admin-section">
      <h2>Produtos</h2>
      <div class="cards">
        @for (product of products.products(); track product.id) {
          <article class="card">
            <h3>{{ product.name }}</h3>
            <strong class="product-price">{{
              product.price | currency: 'BRL' : 'symbol' : '1.2-2' : 'pt-BR'
            }}</strong>
            <div class="actions">
              <button class="button secondary" (click)="editor.open(product, 'price')">
                Editar preço</button
              ><button class="button secondary" (click)="editor.open(product, 'promotion')">
                Criar promoção
              </button>
            </div>
          </article>
        }
      </div>
      @for (group of groups; track group.status) {
        <h2 class="promotion-heading">{{ group.label }}</h2>
        <div class="cards">
          @for (p of list(group.status); track p.id) {
            <article class="card">
              <span class="eyebrow">{{ group.label }}</span>
              <h3>{{ p.name }}</h3>
              <p>{{ productName(p.productId) }}</p>
              <strong class="product-price">{{
                p.promotionalPrice | currency: 'BRL' : 'symbol' : '1.2-2' : 'pt-BR'
              }}</strong>
              <p>
                {{ p.startsAt | date: 'dd/MM/yyyy HH:mm' }} →
                {{ p.endsAt | date: 'dd/MM/yyyy HH:mm' }}
              </p>
              @if (p.status === 'ACTIVE') {
                <app-countdown [endsAt]="p.endsAt" />
              }
              @if (p.status === 'ACTIVE' || p.status === 'SCHEDULED') {
                <div class="actions">
                  <button class="button secondary" (click)="edit(editor, p)">Editar promoção</button
                  ><button class="button secondary" (click)="pending = p; confirm.showModal()">
                    {{ p.status === 'ACTIVE' ? 'Encerrar' : 'Cancelar promoção' }}
                  </button>
                </div>
              }
            </article>
          }
        </div>
        @if (!list(group.status).length) {
          <p>Nenhuma promoção nesta seção.</p>
        }
      }
    </section>
    <app-product-editor #editor />
    <dialog #confirm atlasDialogFocus class="commerce-dialog" aria-labelledby="confirm-title">
      <h2 id="confirm-title">
        {{ pending?.status === 'ACTIVE' ? 'Encerrar' : 'Cancelar' }} promoção?
      </h2>
      <p>{{ pending?.name }}</p>
      <button class="button" (click)="end(); confirm.close()">Confirmar</button
      ><button class="button secondary" (click)="confirm.close()">Voltar</button>
    </dialog>`,
})
export class AdminPageComponent {
  readonly products = inject(ProductService);
  readonly promotions = inject(PromotionService);
  pending?: Promotion;
  readonly groups: { status: PromotionStatus; label: string }[] = [
    { status: 'ACTIVE', label: 'Promoções ativas' },
    { status: 'SCHEDULED', label: 'Promoções agendadas' },
    { status: 'FINISHED', label: 'Promoções encerradas' },
    { status: 'CANCELLED', label: 'Promoções canceladas' },
  ];
  list(status: PromotionStatus) {
    return this.promotions.promotions().filter((p) => p.status === status);
  }
  productName(id: number) {
    return this.products.products().find((p) => p.id === id)?.name;
  }
  edit(editor: ProductEditorComponent, p: Promotion) {
    const product = this.products.products().find((item) => item.id === p.productId);
    if (product) editor.open(product, 'promotion', p);
  }
  end() {
    if (this.pending) {
      if (this.pending.status === 'ACTIVE') this.promotions.finish(this.pending.id);
      else this.promotions.cancel(this.pending.id);
    }
  }
}
