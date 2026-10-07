import { Component, inject, signal } from '@angular/core';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { OrderService } from '../../core/order.service';
import { PurchaseMailboxComponent } from './purchase-mailbox.component';
import { VipStatusComponent } from './vip-status.component';
import { MinecraftLinkComponent } from './minecraft-link.component';
@Component({
  selector: 'app-account-page',
  standalone: true,
  imports: [DatePipe, CurrencyPipe, RouterLink, MinecraftLinkComponent, VipStatusComponent, PurchaseMailboxComponent],
  template: ` <section class="section page-intro">
    <span class="eyebrow">SEU UNIVERSO ATLAS</span>
    <h1>{{ purchases ? 'Meus apoios' : 'Minha conta' }}</h1>
    @if (purchases) {
      <app-purchase-mailbox />
      <p>Acompanhe suas contribuições, pagamentos e a ativação dos benefícios VIP.</p>
      <p class="notice">
        O pagamento é confirmado após a verificação do Mercado Pago. Voltar ao site não confirma a
        contribuição.
      </p>
      <button class="button secondary" [disabled]="orders.loading()" (click)="orders.load()">
        Atualizar status
      </button>
      @if (paymentError()) {
        <p role="alert">{{ paymentError() }}</p>
      }
      <div class="cards">
        @for (order of orders.mine(); track order.id) {
          <article class="card">
            <h3>{{ order.snapshot.productName }}</h3>
            <strong class="product-price">{{
              order.totalCents / 100 | currency: 'BRL' : 'symbol' : '1.2-2' : 'pt-BR'
            }}</strong>
            <p>{{ order.createdAt | date: 'dd/MM/yyyy HH:mm' : '-0300' }}</p>
            <p>
              Jogador: <strong>{{ order.snapshot.nickname }}</strong> · Emerald
            </p>
            <p class="pill">{{ orders.paymentLabel(order.paymentStatus) }}</p>
            <p>{{ orders.deliveryLabel(order.deliveryStatus) }}</p>
            <small>Registro de apoio {{ order.id }}</small>
            @if (order.paymentStatus === 'PENDING') {
              <p>PIX ou cartão na página do Mercado Pago.</p>
              <button class="button" [disabled]="paying() !== ''" (click)="pay(order.id)">
                {{ paying() === order.id ? 'Preparando pagamento…' : 'Pagar com Mercado Pago' }}
              </button>
            }
          </article>
        }
      </div>
      @if (orders.loading()) {
        <p role="status">Consultando contribuições…</p>
      }
      @if (orders.error()) {
        <p role="alert">{{ orders.error() }}</p>
        <button class="button secondary" (click)="orders.load()">Tentar novamente</button>
      }
      @if (!orders.loading() && !orders.error() && !orders.mine().length) {
        <p class="notice">Você ainda não tem contribuições registradas.</p>
        <a class="button" routerLink="/store">Conhecer as formas de apoio</a>
      }
      <div class="actions">
        <button
          class="button secondary"
          [disabled]="orders.loading() || orders.page() === 0"
          (click)="orders.load(orders.page() - 1)"
        >
          Anterior</button
        ><span>Página {{ orders.page() + 1 }}</span
        ><button
          class="button secondary"
          [disabled]="orders.loading() || !orders.hasNext()"
          (click)="orders.load(orders.page() + 1)"
        >
          Próxima
        </button>
      </div>
    } @else {
      @if (auth.currentUser(); as user) {
        <article class="card account-card">
          <h2>{{ user.username }}</h2>
          @if (!user.emailVerified) {
            <p class="notice">Confirme seu email pelo link enviado para sua caixa de entrada.</p>
            <button class="button secondary" [disabled]="sending()" (click)="resend()">
              Reenviar confirmação
            </button>
          }
          <dl>
            <dt>Email</dt>
            <dd>{{ user.email }}</dd>
            <dt>Data da conta</dt>
            <dd>{{ user.createdAt | date: 'dd/MM/yyyy' }}</dd>
            @if (auth.isAdmin()) {
              <dt>Perfil</dt>
              <dd>ADMIN</dd>
            }
          </dl>
          <app-minecraft-link />
          <app-vip-status /><app-purchase-mailbox />
          <p role="status">{{ feedback() }}</p>
          <a class="text-link" routerLink="/minhas-compras">Meus apoios →</a>
        </article>
      }
    }
  </section>`,
})
export class AccountPageComponent {
  readonly auth = inject(AuthService);
  readonly orders = inject(OrderService);
  readonly purchases = inject(ActivatedRoute).snapshot.data['purchases'] === true;
  readonly feedback = signal('');
  readonly sending = signal(false);
  readonly paying = signal('');
  readonly paymentError = signal('');
  async pay(id: string) {
    if (this.paying()) return;
    this.paying.set(id);
    this.paymentError.set('');
    try {
      await this.orders.pay(id);
    } catch (e) {
      this.paymentError.set(e instanceof Error ? e.message : 'Não foi possível abrir o pagamento.');
    } finally {
      this.paying.set('');
    }
  }
  async resend() {
    if (this.sending()) return;
    this.sending.set(true);
    try {
      await this.auth.resendVerification();
      this.feedback.set('Se houver uma confirmação pendente, enviaremos um novo email.');
    } catch (e) {
      this.feedback.set(e instanceof Error ? e.message : 'Não foi possível reenviar.');
    } finally {
      this.sending.set(false);
    }
  }
}
