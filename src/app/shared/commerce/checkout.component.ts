import { Component, inject, viewChild, ElementRef, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { DialogFocusDirective } from '../effects/dialog-focus.directive';
import { AuthService } from '../../core/auth.service';
import { CatalogApiService } from '../../core/catalog-api.service';
import { PromotionService } from '../../core/promotion.service';
import { MinecraftLinkService } from '../../core/minecraft-link.service';
import { OrderService, CheckoutInput } from '../../core/order.service';
@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CurrencyPipe, RouterLink, DialogFocusDirective],
  template: `<dialog
    #dialog
    atlasDialogFocus
    class="commerce-dialog"
    aria-labelledby="checkout-title"
  >
    <h2 id="checkout-title">Confira seu pedido</h2>
    @if (input) {
      <h3>{{ name }}</h3>
      <p>Emerald · 30 dias · 1 período</p>
      <p>
        Jogador: <strong>{{ nickname }}</strong>
      </p>
      <strong class="product-price">{{
        input.expectedCents / 100 | currency: 'BRL' : 'symbol' : '1.2-2' : 'pt-BR'
      }}</strong>
      <p>
        O prazo do VIP começa quando ele for ativado no servidor. A entrega depende da confirmação
        do pagamento.
      </p>
    }
    @if (error()) {
      <p role="alert">{{ error() }}</p>
      <a class="text-link" routerLink="/conta" (click)="close()">Conferir minha conta</a>
    }
    <div class="actions">
      <button autofocus class="button secondary" [disabled]="busy()" (click)="close()">
        Cancelar
      </button>
      @if (input) {
        <button class="button" [disabled]="busy()" (click)="submit()">
          {{ busy() ? 'Criando pedido…' : 'Confirmar pedido' }}</button
        ><button class="button secondary" [disabled]="busy()" (click)="open(input.productId)">
          Atualizar valor e revisar
        </button>
      }
    </div>
  </dialog>`,
})
export class CheckoutComponent {
  private readonly auth = inject(AuthService);
  private readonly catalog = inject(CatalogApiService);
  private readonly promotions = inject(PromotionService);
  private readonly links = inject(MinecraftLinkService);
  private readonly orders = inject(OrderService);
  private readonly router = inject(Router);
  readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  readonly busy = signal(false);
  readonly error = signal('');
  input: CheckoutInput | null = null;
  name = '';
  nickname = '';
  private key = '';
  private owner = '';
  close() {
    this.dialog()?.nativeElement.close();
  }
  async open(id: number) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.input = null;
    this.owner = this.auth.currentUser()?.id || '';
    if (!this.dialog()?.nativeElement.open) this.dialog()?.nativeElement.showModal();
    try {
      if (!this.owner) throw new Error('Entre na sua conta para criar um pedido.');
      if (!this.auth.currentUser()?.emailVerified)
        throw new Error('Confirme seu email antes de criar um pedido.');
      await this.links.refresh();
      await this.catalog.refresh();
      if (this.catalog.error()) throw new Error(this.catalog.error());
      if (this.owner !== this.auth.currentUser()?.id)
        throw new Error('Sua sessão mudou. Entre novamente.');
      const link = this.links.status().current;
      if (!link || this.links.error())
        throw new Error('Vincule sua conta Minecraft antes de criar um pedido.');
      const product = this.catalog.products().find((p) => p.id === id);
      if (!product?.active || !product.purchasable || product.category !== 'VIPs')
        throw new Error('As vendas deste produto ainda estão fechadas.');
      this.name = product.name;
      this.nickname = link.nickname;
      this.key = crypto.randomUUID();
      this.input = {
        productId: id,
        server: 'emerald',
        quantity: 1,
        productRevision: product.revision!,
        catalogRevision: this.catalog.revision(),
        expectedCents: Math.round(
          (this.promotions.activeFor(id)?.promotionalPrice ?? product.price) * 100,
        ),
      };
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível preparar o pedido.');
    } finally {
      this.busy.set(false);
    }
  }
  async submit() {
    if (this.busy() || !this.input) return;
    this.busy.set(true);
    this.error.set('');
    try {
      if (this.owner !== this.auth.currentUser()?.id)
        throw new Error('Sua sessão mudou. Entre novamente.');
      await this.orders.checkout(this.input, this.key);
      await this.orders.load(0);
      this.close();
      await this.router.navigateByUrl('/minhas-compras');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível criar o pedido.');
    } finally {
      this.busy.set(false);
    }
  }
}
