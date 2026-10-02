import { Component, inject, viewChild, ElementRef, signal, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { Product, Promotion } from '../../core/models';
import { ProductService } from '../../core/product.service';
import { PromotionService } from '../../core/promotion.service';
import { AuthService } from '../../core/auth.service';
import { DialogFocusDirective } from '../effects/dialog-focus.directive';
@Component({
  selector: 'app-product-editor',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DialogFocusDirective],
  template: ` <dialog
    #dialog
    atlasDialogFocus
    class="commerce-dialog"
    aria-labelledby="editor-title"
    (click)="backdrop($event)"
  >
    <form (ngSubmit)="save()">
      <div class="dialog-heading">
        <h2 id="editor-title">{{ kind === 'price' ? 'Editar preço' : '⚡ Promoção' }}</h2>
        <button type="button" class="icon-button" aria-label="Fechar edição" (click)="close()">
          ✕
        </button>
      </div>
      <p>
        {{ product?.name }} · Preço atual
        {{ product?.price | currency: 'BRL' : 'symbol' : '1.2-2' : 'pt-BR' }}
      </p>
      @if (kind === 'price') {
        <label
          >Novo preço (R$)<input
            autofocus
            name="price"
            type="number"
            min="0.01"
            max="1000000"
            step="0.01"
            required
            [(ngModel)]="price"
        /></label>
      } @else {
        <label
          >Nome da promoção<input autofocus name="name" required maxlength="100" [(ngModel)]="name"
        /></label>
        <label
          >Tipo<select name="type" [(ngModel)]="type">
            <option value="percent">Porcentagem</option>
            <option value="price">Novo preço</option>
          </select></label
        >
        @if (type === 'percent') {
          <label
            >Desconto (%)<input
              name="discount"
              type="number"
              min="0.01"
              max="99.99"
              step="0.01"
              required
              [(ngModel)]="discount"
          /></label>
        } @else {
          <label
            >Preço promocional (R$)<input
              name="promotionPrice"
              type="number"
              min="0.01"
              step="0.01"
              required
              [(ngModel)]="price"
          /></label>
        }
        <p>
          Preço final
          <strong>{{ finalPrice | currency: 'BRL' : 'symbol' : '1.2-2' : 'pt-BR' }}</strong>
        </p>
        <label
          >Início<input name="start" type="datetime-local" required [(ngModel)]="startsAt"
        /></label>
        <label
          >Término<input name="end" type="datetime-local" required [(ngModel)]="endsAt"
        /></label>
        <small>Datas no fuso local do navegador.</small>
      }
      @if (error()) {
        <p role="alert" class="form-error">{{ error() }}</p>
      }
      <div class="actions">
        <button type="button" class="button secondary" (click)="close()">Cancelar</button
        ><button class="button" [disabled]="busy()">
          {{ busy() ? 'Salvando…' : kind === 'price' || promotionId ? 'Salvar' : 'Criar promoção' }}
        </button>
      </div>
    </form>
  </dialog>`,
})
export class ProductEditorComponent {
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly products = inject(ProductService);
  private readonly promotions = inject(PromotionService);
  private readonly auth = inject(AuthService);
  readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  readonly error = signal('');
  readonly busy = signal(false);
  product?: Product;
  kind: 'price' | 'promotion' = 'price';
  promotionId?: number;
  price = 0;
  name = '';
  type = 'percent';
  discount = 30;
  startsAt = '';
  endsAt = '';
  get finalPrice() {
    return this.type === 'percent'
      ? Math.round((this.product?.price ?? 0) * (1 - this.discount / 100) * 100) / 100
      : this.price;
  }
  private local(date: Date) {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
  open(product: Product, kind: 'price' | 'promotion', promotion?: Promotion) {
    if (!this.auth.isAdmin()) return;
    this.product = product;
    this.kind = kind;
    this.promotionId = promotion?.id;
    this.price = promotion?.promotionalPrice ?? product.price;
    this.name = promotion?.name ?? `Oferta ${product.name}`;
    this.type = promotion ? 'price' : 'percent';
    this.discount = 30;
    this.startsAt = this.local(new Date(promotion?.startsAt ?? Date.now()));
    this.endsAt = this.local(new Date(promotion?.endsAt ?? Date.now() + 86400000));
    this.error.set('');
    this.changeDetector.detectChanges();
    this.dialog()?.nativeElement.showModal();
  }
  close() {
    this.dialog()?.nativeElement.close();
  }
  backdrop(event: MouseEvent) {
    if (event.target === this.dialog()?.nativeElement) this.close();
  }
  async save() {
    if (!this.product || !this.auth.isAdmin() || this.busy()) return;
    this.error.set('');
    this.busy.set(true);
    try {
      if (this.kind === 'price') await this.products.updatePrice(this.product.id, this.price);
      else {
        if (
          this.type === 'percent' &&
          (!Number.isFinite(this.discount) || this.discount <= 0 || this.discount >= 100)
        )
          throw new Error('O desconto deve ser maior que 0 e menor que 100%.');
        await this.promotions.save(
          {
            name: this.name,
            productId: this.product.id,
            promotionalPrice: this.finalPrice,
            startsAt: new Date(this.startsAt).toISOString(),
            endsAt: new Date(this.endsAt).toISOString(),
          },
          this.promotionId,
        );
      }
      this.close();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      this.busy.set(false);
    }
  }
}
