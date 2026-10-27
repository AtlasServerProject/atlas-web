import { Component, inject, signal, effect, viewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/auth.service';
import { DialogFocusDirective } from './effects/dialog-focus.directive';
@Component({
  selector: 'app-security-dialog', standalone: true, imports: [FormsModule, DialogFocusDirective],
  template: `<dialog #dialog atlasDialogFocus class="commerce-dialog" (cancel)="cancel($event)">
    <form (ngSubmit)="submit()">
      <h2>Confirme sua identidade</h2>
      <p>Esta alteração precisa de uma confirmação recente.</p>
      <label>Senha<input type="password" name="reauth-password" autocomplete="current-password" required [(ngModel)]="password" /></label>
      @if (auth.currentUser()?.mfaEnabled) {
        <label>Código do autenticador<input name="reauth-code" autocomplete="one-time-code" maxlength="32" required [(ngModel)]="code" /></label>
      }
      @if (error()) { <p role="alert">{{ error() }}</p> }
      <button class="button" type="submit" [disabled]="busy()">Confirmar</button>
      <button class="button secondary" type="button" (click)="cancel()">Cancelar</button>
    </form>
  </dialog>`,
})
export class SecurityDialogComponent {
  readonly auth = inject(AuthService);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  password = ''; code = ''; readonly error = signal(''); readonly busy = signal(false);
  constructor() { effect(() => {
    const open = this.auth.reauthenticationRequired(), dialog = this.dialog()?.nativeElement;
    if (!dialog) return;
    if (open && !dialog.open) { this.password = this.code = ''; this.error.set(''); dialog.showModal(); }
    else if (!open && dialog.open) { dialog.close(); this.password = this.code = ''; }
  }); }
  cancel(event?: Event) { event?.preventDefault(); this.auth.cancelReauthentication(); this.password = this.code = ''; }
  async submit() {
    if (this.busy()) return;
    this.busy.set(true); this.error.set('');
    try { await this.auth.approveReauthentication(this.password, this.code); }
    catch (e) { this.error.set(e instanceof Error ? e.message : 'Não foi possível confirmar.'); }
    finally { this.password = this.code = ''; this.busy.set(false); }
  }
}
