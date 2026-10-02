import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: ` <section class="section page-intro">
    <span class="eyebrow">SUA JORNADA ATLAS</span>
    <h1>{{ register ? 'Criar conta' : 'Bem-vindo de volta.' }}</h1>
    <p>Seu próximo capítulo começa aqui.</p>
    @if (!auth.available()) {
      <div class="card auth-form">
        <p class="notice" role="status">
          Cadastro e acesso à conta estão temporariamente indisponíveis. Tente novamente mais tarde.
        </p>
        <a class="text-link" routerLink="/loja">Voltar para a loja</a>
      </div>
    } @else {
      <form class="card auth-form" (ngSubmit)="submit()">
        @if (register) {
          <label
            >Nickname<input
              name="nickname"
              autocomplete="nickname"
              required
              maxlength="32"
              [(ngModel)]="nickname"
          /></label>
        }
        <label
          >Email<input
            name="email"
            type="email"
            autocomplete="email"
            required
            maxlength="254"
            [(ngModel)]="email"
        /></label>
        <label
          >Senha<input
            name="password"
            type="password"
            [attr.autocomplete]="register ? 'new-password' : 'current-password'"
            required
            [minlength]="register ? 8 : 1"
            [(ngModel)]="password"
        /></label>
        @if (register) {
          <label
            >Confirmar senha<input
              name="confirm"
              type="password"
              autocomplete="new-password"
              required
              minlength="8"
              [(ngModel)]="confirm" /></label
          ><small>Use pelo menos 8 caracteres.</small>
        }
        @if (error()) {
          <p class="form-error" role="alert">{{ error() }}</p>
        }
        <button class="button" [disabled]="loading()">
          {{ loading() ? 'Aguarde…' : register ? 'Criar conta' : 'Entrar' }}
        </button>
        <a class="text-link" [routerLink]="register ? '/login' : '/cadastro'">{{
          register ? 'Já tenho uma conta' : 'Criar conta'
        }}</a>
        @if (!register) {
          <a class="text-link" routerLink="/recuperar-senha">Esqueci minha senha</a>
        }
        <p role="status">{{ feedback() }}</p>
      </form>
    }
  </section>`,
})
export class AuthPageComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly register = inject(ActivatedRoute).snapshot.data['register'] === true;
  nickname = '';
  email = '';
  password = '';
  confirm = '';
  readonly loading = signal(false);
  readonly error = signal('');
  readonly feedback = signal('');
  async submit() {
    if (this.loading()) return;
    this.error.set('');
    if (this.register && this.password !== this.confirm) {
      this.error.set('As senhas precisam ser iguais.');
      return;
    }
    this.loading.set(true);
    try {
      if (this.register) {
        await this.auth.register(this.nickname, this.email, this.password);
        this.password = this.confirm = '';
        this.feedback.set(
          'Se o endereço puder ser cadastrado, você receberá um email de confirmação. Depois, faça login.',
        );
      } else {
        await this.auth.login(this.email, this.password);
        await this.router.navigateByUrl('/conta');
      }
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível entrar.');
    } finally {
      this.loading.set(false);
    }
  }
}
