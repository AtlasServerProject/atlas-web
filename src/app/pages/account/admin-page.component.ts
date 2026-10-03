import { DeliveryAdminComponent } from './delivery-admin.component';
import { FormsModule } from '@angular/forms';
import { Product } from '../../core/models';
import { Component, inject, signal } from '@angular/core';
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
    FormsModule,
    DeliveryAdminComponent,
    CurrencyPipe,
    DatePipe,
    ProductEditorComponent,
    CountdownComponent,
    DialogFocusDirective,
  ],
  template: ` <section class="section page-intro">
      <span class="eyebrow">ATLAS ADMIN</span>
      <h1>Cuide do próximo <em>capítulo.</em></h1>
      <p>Gerencie o catálogo e as ofertas do Atlas.</p>
    </section>
    <app-delivery-admin />
    <section class="section admin-section">
      <h2>Produtos</h2>
      @if (error()) {
        <p role="alert">{{ error() }}</p>
      }
      @if (products.error()) {
        <p role="alert">{{ products.error() }}</p>
        <button class="button" (click)="products.refresh()">Tentar novamente</button>
      }
      <button class="button" (click)="newProduct()">Criar produto</button>
      @if (draft; as d) {
        <form class="card" (ngSubmit)="saveProduct()">
          <label
            >Nome<input name="productName" required maxlength="100" [(ngModel)]="d.name"
          /></label>
          <label
            >Identificador<input
              name="slug"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              [(ngModel)]="d.slug"
          /></label>
          <label
            >Descrição<textarea
              name="description"
              maxlength="2000"
              [(ngModel)]="d.description"
            ></textarea>
          </label>
          <label
            >Categoria<select name="category" [(ngModel)]="d.category">
              <option>VIPs</option>
              <option>Chaves</option>
              <option>Pacotes</option>
              <option>Cosméticos</option>
            </select></label
          >
          <label
            >Preço (R$)<input
              name="basePrice"
              type="number"
              min="0.01"
              max="1000000"
              step="0.01"
              required
              [(ngModel)]="d.price"
          /></label>
          <label
            ><input name="active" type="checkbox" [(ngModel)]="d.active" />Exibir no catálogo
            Emerald</label
          >
          <p>Vendas permanecem fechadas durante a homologação da loja.</p>
          <button class="button" [disabled]="busy()">Salvar produto</button>
          <button type="button" class="button secondary" (click)="draft = undefined">Voltar</button>
          @if (error()) {
            <button type="button" class="button secondary" (click)="rebase()">
              Atualizar revisão e manter formulário
            </button>
          }
        </form>
      }
      <div class="cards">
        @for (product of products.products(); track product.id) {
          <article class="card">
            <h3>{{ product.name }}</h3>
            <p>{{ product.active ? 'Visível em Emerald' : 'Desativado' }}</p>
            <strong class="product-price">{{
              product.price | currency: 'BRL' : 'symbol' : '1.2-2' : 'pt-BR'
            }}</strong>
            <div class="actions">
              <button class="button secondary" (click)="draft = copy(product)">
                Editar produto
              </button>
              <button class="button secondary" [disabled]="busy()" (click)="toggle(product)">
                {{ product.active ? 'Desativar' : 'Ativar' }}
              </button>
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
      @if (error()) {
        <p role="alert">{{ error() }}</p>
      }
      <button class="button" (click)="end(confirm)" [disabled]="busy()">Confirmar</button
      ><button class="button secondary" (click)="confirm.close()">Voltar</button>
    </dialog>`,
})
export class AdminPageComponent {
  readonly products = inject(ProductService);
  readonly promotions = inject(PromotionService);
  pending?: Promotion;
  draft?: Product;
  readonly error = signal('');
  readonly busy = signal(false);
  constructor() {
    void this.products.refresh();
  }
  copy(product: Product) {
    return { ...product };
  }
  newProduct() {
    this.error.set('');
    this.draft = {
      id: 0,
      name: '',
      slug: '',
      description: '',
      price: 1,
      category: 'VIPs',
      active: true,
      revision: 0,
    };
  }
  rebase() {
    if (this.draft)
      this.draft.revision =
        this.products.products().find((p) => p.id === this.draft?.id)?.revision ?? 0;
    this.error.set('');
  }
  async saveProduct() {
    if (!this.draft || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.products.save(this.draft);
      this.draft = undefined;
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      this.busy.set(false);
    }
  }
  async toggle(product: Product) {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.products.setActive(product, !product.active);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      this.busy.set(false);
    }
  }

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
  async end(dialog: HTMLDialogElement) {
    if (!this.pending || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      if (this.pending.status === 'ACTIVE')
        await this.promotions.finish(this.pending.id, this.pending.revision);
      else await this.promotions.cancel(this.pending.id, this.pending.revision);
      dialog.close();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      this.busy.set(false);
    }
  }
}
