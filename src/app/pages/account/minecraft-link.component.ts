import { Component, inject, viewChild, ElementRef, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../core/auth.service';
import { MinecraftLinkService } from '../../core/minecraft-link.service';
import { DialogFocusDirective } from '../../shared/effects/dialog-focus.directive';
@Component({
  selector: 'app-minecraft-link',
  standalone: true,
  imports: [FormsModule, DatePipe, DialogFocusDirective],
  styles: [
    `
      :host {
        display: block;
        margin-top: 24px;
      }
      .link-command {
        display: block;
        width: 100%;
        padding: 16px;
        margin: 16px 0;
        border: 1px solid #c9ef8d38;
        border-radius: 12px;
        overflow-wrap: anywhere;
        white-space: normal;
        background: #07140f;
        color: var(--accent);
      }
      .link-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin: 16px 0;
      }
      .minecraft-name {
        color: var(--accent);
        overflow-wrap: anywhere;
      }
      dialog p {
        line-height: 1.7;
      }
      input {
        width: 100%;
      }
    `,
  ],
  template: `<section aria-labelledby="minecraft-link-title">
      <h3 id="minecraft-link-title">Sua conta Minecraft</h3>
      @if (links.status().current; as linked) {
        <p>
          Vinculado a <strong class="minecraft-name">{{ linked.nickname }}</strong> · Emerald
        </p>
        <p>Seus próximos pedidos serão destinados a este jogador.</p>
        <button class="button secondary" (click)="openUnlink()">Desvincular jogador</button>
      } @else if (!auth.currentUser()?.emailVerified) {
        <p class="notice">Confirme seu email para vincular sua conta Minecraft.</p>
      } @else {
        @if (links.status().pending; as pending) {
          @if (pending.state === 'PROVED') {
            <p>
              O servidor comprovou o jogador
              <strong class="minecraft-name">{{ pending.nickname }}</strong
              >.
            </p>
            <p>Confira o nickname. Confirme somente se este for o seu jogador.</p>
            <button
              class="button"
              [disabled]="links.busy()"
              (click)="confirmDialog()?.nativeElement.showModal()"
            >
              Confirmar vínculo
            </button>
          } @else {
            <p>
              Seu código tem 6 dígitos. Entre no Emerald, faça login no jogo e execute este comando:
            </p>
            @if (links.code()) {
              <code class="link-command">/site vincular {{ links.code() }}</code
              ><button class="button secondary" (click)="copy()">Copiar comando</button>
            } @else {
              <p class="notice">
                O código só é exibido quando é gerado. Gere um novo caso tenha fechado a página.
              </p>
            }
            <p>
              Válido até {{ pending.expiresAt | date: 'HH:mm' : '-0300' }}. Não compartilhe este
              código.
            </p>
            <p>Depois, volte aqui para conferir e confirmar o jogador.</p>
            <div class="link-actions">
              <button class="button secondary" (click)="links.refresh()">Já executei no jogo</button
              ><button class="button secondary" [disabled]="links.busy()" (click)="links.create()">
                Gerar novo código
              </button>
            </div>
          }
        } @else {
          <p>Comprove seu jogador no servidor e confirme o vínculo aqui.</p>
          <button class="button secondary" [disabled]="links.busy()" (click)="links.create()">
            Vincular conta Minecraft
          </button>
        }
      }
      @if (links.error()) {
        <p role="alert">{{ links.error() }}</p>
        <button class="text-link" (click)="links.refresh()">Atualizar vínculo</button>
      }
      <p role="status">{{ feedback }}</p>
    </section>
    <dialog
      #confirmationWindow
      atlasDialogFocus
      class="commerce-dialog"
      aria-labelledby="confirm-link-title"
    >
      <h2 id="confirm-link-title">Confirmar vínculo Minecraft</h2>
      <p>
        Vincular sua conta ao jogador
        <strong class="minecraft-name">{{ links.status().pending?.nickname }}</strong> no Emerald?
      </p>
      <p>
        Confirme apenas se você executou o comando nesse jogador. Ele será o destinatário dos seus
        próximos pedidos.
      </p>
      <div class="link-actions">
        <button
          autofocus
          class="button secondary"
          [disabled]="links.busy()"
          (click)="confirmDialog()?.nativeElement.close()"
        >
          Cancelar</button
        ><button class="button" [disabled]="links.busy()" (click)="confirm()">
          Sim, este é meu jogador
        </button>
      </div>
      @if (links.error()) {
        <p role="alert">{{ links.error() }}</p>
      }
    </dialog>
    <dialog #unlinkDialog atlasDialogFocus class="commerce-dialog" aria-labelledby="unlink-title">
      <h2 id="unlink-title">Desvincular jogador</h2>
      <p>
        Os pedidos anteriores continuarão destinados ao jogador registrado na compra. Para vincular
        outro jogador, será necessário comprová-lo no jogo.
      </p>
      <form (ngSubmit)="unlink()">
        <label
          >Senha da conta do site<input
            autofocus
            name="unlinkPassword"
            type="password"
            autocomplete="current-password"
            required
            maxlength="128"
            [(ngModel)]="password"
        /></label>
        <div class="link-actions">
          <button
            type="button"
            class="button secondary"
            [disabled]="links.busy()"
            (click)="closeUnlink()"
          >
            Cancelar</button
          ><button class="button" [disabled]="links.busy()">Confirmar desvinculação</button>
        </div>
        @if (links.error()) {
          <p role="alert">{{ links.error() }}</p>
        }
      </form>
    </dialog>`,
})
export class MinecraftLinkComponent implements OnDestroy {
  readonly auth = inject(AuthService);
  readonly links = inject(MinecraftLinkService);
  readonly confirmDialog = viewChild<ElementRef<HTMLDialogElement>>('confirmationWindow');
  readonly unlinkDialog = viewChild<ElementRef<HTMLDialogElement>>('unlinkDialog');
  password = '';
  feedback = '';
  private readonly timer = setInterval(() => {
    if (this.links.status().pending && !this.links.busy()) void this.links.refresh();
  }, 5000);
  ngOnDestroy() {
    clearInterval(this.timer);
    this.password = '';
  }
  async copy() {
    try {
      await navigator.clipboard.writeText('/site vincular ' + this.links.code());
      this.feedback = 'Comando copiado. Execute no jogo, sem compartilhar com outras pessoas.';
    } catch {
      this.feedback = 'Selecione o comando acima e copie manualmente.';
    }
  }
  async confirm() {
    await this.links.confirm();
    if (!this.links.error()) this.confirmDialog()?.nativeElement.close();
  }
  openUnlink() {
    this.password = '';
    this.links.error.set('');
    this.unlinkDialog()?.nativeElement.showModal();
  }
  closeUnlink() {
    this.password = '';
    this.unlinkDialog()?.nativeElement.close();
  }
  async unlink() {
    const password = this.password;
    this.password = '';
    await this.links.unlink(password);
    if (!this.links.error()) this.closeUnlink();
  }
}
