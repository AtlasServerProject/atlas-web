import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
@Component({
  selector: 'app-recovery-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `<section class="section page-intro">
    <span class="eyebrow">SUA CONTA ATLAS</span>
    <h1>
      {{
        mode === 'verify' ? 'Confirmar email' : mode === 'reset' ? 'Nova senha' : 'Recuperar senha'
      }}
    </h1>
    @if (!auth.available()) {
      <div class="card auth-form">
        <p class="notice" role="status">
          Cadastro e acesso à conta estão temporariamente indisponíveis. Tente novamente mais tarde.
        </p>
        <a class="text-link" routerLink="/loja">Voltar para a loja</a>
      </div>
    } @else {
      <form class="card auth-form" (ngSubmit)="submit()">
        @if (mode === 'forgot') {
          <label
            >Email<input
              name="email"
              type="email"
              autocomplete="email"
              required
              maxlength="254"
              [(ngModel)]="email"
          /></label>
        } @else if (mode === 'reset' && !done()) {
          <label
            >Nova senha<input
              name="password"
              type="password"
              autocomplete="new-password"
              required
              minlength="8"
              maxlength="128"
              [(ngModel)]="password"
          /></label>
          <label
            >Confirmar senha<input
              name="confirm"
              type="password"
              autocomplete="new-password"
              required
              minlength="8"
              maxlength="128"
              [(ngModel)]="confirm"
          /></label>
        }
        @if (error()) {
          <p class="form-error" role="alert">{{ error() }}</p>
        }
        <p role="status">{{ feedback() }}</p>
        @if (!done()) {
          <button class="button" [disabled]="loading() || (mode !== 'forgot' && !token)">
            {{
              loading()
                ? 'Aguarde…'
                : mode === 'verify'
                  ? 'Confirmar email'
                  : mode === 'reset'
                    ? 'Salvar nova senha'
                    : 'Enviar link'
            }}
          </button>
        }
        <a class="text-link" routerLink="/login">Voltar para login</a>
      </form>
    }
  </section>`,
})
export class RecoveryPageComponent {
  readonly auth = inject(AuthService);
  readonly mode = inject(ActivatedRoute).snapshot.data['mode'] as 'verify' | 'reset' | 'forgot';
  readonly token = new URLSearchParams(location.hash.slice(1)).get('token') || '';
  email = '';
  password = '';
  confirm = '';
  readonly loading = signal(false);
  readonly error = signal('');
  readonly feedback = signal('');
  readonly done = signal(false);
  constructor() {
    if (this.mode !== 'forgot') {
      history.replaceState(history.state, '', location.pathname + location.search);
      if (!this.token) this.error.set('Link incompleto. Solicite um novo email.');
    }
  }
  async submit() {
    if (this.loading() || this.done()) return;
    this.error.set('');
    if (this.mode === 'reset' && this.password !== this.confirm) {
      this.error.set('As senhas precisam ser iguais.');
      return;
    }
    this.loading.set(true);
    try {
      if (this.mode === 'forgot') await this.auth.forgotPassword(this.email);
      else if (this.mode === 'verify') await this.auth.verifyEmail(this.token);
      else await this.auth.resetPassword(this.token, this.password);
      this.password = this.confirm = '';
      this.done.set(true);
      this.feedback.set(
        this.mode === 'forgot'
          ? 'Se existir uma conta com esse email, enviaremos um link de recuperação.'
          : this.mode === 'verify'
            ? 'Email confirmado.'
            : 'Senha atualizada. Faça login novamente.',
      );
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Não foi possível concluir.');
    } finally {
      this.loading.set(false);
    }
  }
}
