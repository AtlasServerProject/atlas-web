import { Component, inject, signal, viewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DialogFocusDirective } from '../../shared/effects/dialog-focus.directive';
import { AuthService } from '../../core/auth.service';
@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [FormsModule, RouterLink, DialogFocusDirective],
  styleUrls: ['./account-message.scss', './auth-page.component.scss'],
  template: ` <section class="section page-intro auth-page">
    <div class="auth-heading">
      <span class="eyebrow">SUA JORNADA ATLAS</span>
      <h1>{{ register ? 'Criar conta' : 'Bem-vindo de volta.' }}</h1>
      <p>{{ register ? 'Faça parte da comunidade e comece sua história no Atlas.' : 'Entre para acompanhar sua conta e seus apoios ao Atlas.' }}</p>
    </div>
      @if (!auth.available()) {
        <div class="card auth-form">
          <p class="notice" role="status">
            Cadastro e acesso à conta estão temporariamente indisponíveis. Tente novamente mais
            tarde.
          </p>
          <a class="text-link" routerLink="/store">Voltar para a loja</a>
        </div>
      } @else {
        <form #authForm="ngForm" class="card auth-form" (ngSubmit)="submit()">
          <nav class="auth-tabs" aria-label="Acesso à conta">
            <a routerLink="/login" [class.selected]="!register" [attr.aria-current]="!register ? 'page' : null">Entrar</a>
            <a routerLink="/cadastro" [class.selected]="register" [attr.aria-current]="register ? 'page' : null">Criar conta</a>
          </nav>
          @if (register) {
            <label
              >Nickname<input
                name="nickname"
                autocomplete="nickname"
                required
                maxlength="32"
                placeholder="Como você quer ser chamado?"
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
              placeholder="voce@exemplo.com"
              [(ngModel)]="email"
          /></label>
          <label
            >Senha<span class="password-field"><input
              name="password"
              [type]="showPassword() ? 'text' : 'password'"
              [attr.autocomplete]="register ? 'new-password' : 'current-password'"
              required
              [minlength]="register ? 8 : 1"
              [placeholder]="register ? 'Crie uma senha com 8 ou mais caracteres' : 'Digite sua senha'"
              [(ngModel)]="password"
          /><button type="button" class="password-toggle" [attr.aria-label]="showPassword() ? 'Ocultar senha' : 'Mostrar senha'" [attr.aria-pressed]="showPassword()" (click)="showPassword.set(!showPassword())">{{ showPassword() ? 'Ocultar' : 'Mostrar' }}</button></span></label>
          @if (register) {
            <label
              >Confirmar senha<input
                name="confirm"
                type="password"
                autocomplete="new-password"
                required
                minlength="8"
                placeholder="Digite sua senha novamente"
                [(ngModel)]="confirm" /></label
            ><small>Use pelo menos 8 caracteres.</small>
          }
          @if (error()) {
            <p class="form-error" role="alert">{{ error() }}</p>
          }
          @if (!register) {
            <a class="text-link forgot-password" routerLink="/recuperar-senha">Esqueci minha senha</a>
          }
          <button type="submit" class="button submit-button" [disabled]="loading() || authForm.invalid">
            {{ loading() ? 'Aguarde…' : register ? 'Criar conta' : 'Entrar' }}
          </button>
          <p class="auth-switch">{{ register ? 'Já faz parte do Atlas?' : 'Ainda não tem uma conta?' }}
            <a class="text-link" [routerLink]="register ? '/login' : '/cadastro'">{{ register ? 'Entrar' : 'Criar conta' }}</a>
          </p>
          @if (feedback()) {
            <p class="auth-feedback" role="status">{{ feedback() }}</p>
          }
        </form>
      }
    </section>
    <dialog
      #emailDialog
      atlasDialogFocus
      class="commerce-dialog email-confirm-dialog"
      aria-labelledby="email-confirm-title"
      aria-describedby="email-confirm-description"
    >
      <button
        type="button"
        class="icon-button close-message"
        aria-label="Fechar aviso de confirmação"
        (click)="closeEmailDialog()"
      >
        ✕
      </button>
      <div class="message-symbol" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none">
          <rect x="4" y="7" width="24" height="18" rx="4" />
          <path d="m5 9 11 8L27 9" />
        </svg>
      </div>
      <span class="eyebrow">FALTA SÓ MAIS UM PASSO</span>
      <h2 id="email-confirm-title">Confira seu <em>email.</em></h2>
      <p id="email-confirm-description">
        Se o endereço puder ser cadastrado, você receberá um email de confirmação em
        <strong class="confirmation-address">{{ registeredEmail }}</strong
        >. Abra a mensagem do Atlas e clique em <strong>Confirmar meu email</strong>.
      </p>
      <div class="spam-tip">
        <span aria-hidden="true">✦</span>
        <p>
          Não encontrou? Verifique também a <strong>caixa de spam ou lixo eletrônico</strong>. A
          mensagem pode levar alguns minutos para chegar.
        </p>
      </div>
      <div class="message-actions">
        <a class="button" autofocus routerLink="/login" (click)="closeEmailDialog()"
          >Ir para login</a
        >
        <button type="button" class="button secondary" (click)="closeEmailDialog()">Entendi</button>
      </div>
      <small>Você pode reenviar a confirmação pela página Minha conta.</small>
    </dialog>`,
})
export class AuthPageComponent {
  readonly showPassword = signal(false);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly emailDialog = viewChild<ElementRef<HTMLDialogElement>>('emailDialog');
  registeredEmail = '';
  closeEmailDialog() {
    this.emailDialog()?.nativeElement.close();
  }
  readonly register = inject(ActivatedRoute).snapshot.data['register'] === true;
  nickname = '';
  email = '';
  password = '';
  confirm = '';
  readonly loading = signal(false);
  readonly error = signal('');
  readonly feedback = signal('');
  async submit() {
    if (this.loading() || !this.auth.available()) return;
    this.error.set('');
    if (this.register && this.password !== this.confirm) {
      this.error.set('As senhas precisam ser iguais.');
      return;
    }
    this.loading.set(true);
    try {
      if (this.register) {
        const email = this.email.trim();
        await this.auth.register(this.nickname, email, this.password);
        this.registeredEmail = email;
        this.password = this.confirm = '';
        this.feedback.set(
          'Se o endereço puder ser cadastrado, você receberá um email de confirmação. Verifique também a caixa de spam. Depois, faça login.',
        );
        this.emailDialog()?.nativeElement.showModal();
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
