import { Component, inject, signal } from '@angular/core';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { OrderService } from '../../core/order.service';
@Component({
  selector: 'app-account-page',
  standalone: true,
  imports: [DatePipe, CurrencyPipe, RouterLink],
  template: ` <section class="section page-intro">
    <span class="eyebrow">SEU UNIVERSO ATLAS</span>
    <h1>{{ purchases ? 'Minhas compras' : 'Minha conta' }}</h1>
    @if (purchases) {
      <p>Histórico demonstrativo desta sessão. Pagamento e entrega não são reais.</p>
      <div class="cards">
        @for (order of orders.mine(); track order.id) {
          <article class="card">
            <h3>{{ order.productName }}</h3>
            <strong class="product-price">{{
              order.price | currency: 'BRL' : 'symbol' : '1.2-2' : 'pt-BR'
            }}</strong>
            <p>{{ order.purchasedAt | date: 'dd/MM/yyyy HH:mm' : '-0300' }}</p>
            <span class="pill">Compra simulada · Sem entrega real</span>
          </article>
        }
      </div>
      @if (!orders.mine().length) {
        <p class="notice">Você ainda não tem compras demonstrativas.</p>
        <a class="button" routerLink="/loja">Explorar a loja</a>
      }
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
            <dt>Minecraft</dt>
            <dd>{{ user.minecraftNickname || 'Não vinculado' }}</dd>
          </dl>
          <button
            class="button secondary"
            (click)="
              feedback.set(
                'A vinculação com Minecraft estará disponível após a integração com o servidor.'
              )
            "
          >
            Vincular conta
          </button>
          <p role="status">{{ feedback() }}</p>
          <a class="text-link" routerLink="/minhas-compras">Minhas compras →</a>
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
