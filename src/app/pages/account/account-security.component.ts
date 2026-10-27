import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
@Component({selector:'app-account-security',standalone:true,imports:[FormsModule],template:`
<section class="card">
<h2>Segurança da conta</h2>
@if (auth.currentUser()?.mfaEnabled) { <p>Autenticação em duas etapas ativada.</p> }
@else {
<p>Proteja sua conta com um aplicativo autenticador.</p>
@if (!secret()) {
<form (ngSubmit)="setup()"><label>Confirme sua senha<input type="password" name="mfa-password" autocomplete="current-password" required [(ngModel)]="password" /></label><button class="button" [disabled]="busy()">Ativar proteção</button></form>
} @else {
<p>Adicione esta chave manualmente ao autenticador (TOTP, 6 dígitos, 30 segundos):</p><code>{{ secret() }}</code>
<form (ngSubmit)="verify()"><label>Código<input name="enrollment-code" autocomplete="one-time-code" required maxlength="6" [(ngModel)]="code" /></label><button class="button" [disabled]="busy()">Confirmar autenticador</button></form>
}}
@if (auth.recoveryCodes().length) {
<p>Salve estes códigos em um local seguro. Cada um pode ser usado apenas uma vez.</p>
@for (recovery of auth.recoveryCodes(); track recovery) { <code>{{ recovery }}</code><br /> }
<button class="button secondary" (click)="auth.recoveryCodes.set([])">Já guardei</button>
}
@if (error()) { <p role="alert">{{ error() }}</p> }
</section>`})
export class AccountSecurityComponent {
 readonly auth=inject(AuthService);readonly secret=signal('');readonly busy=signal(false);readonly error=signal('');password='';code='';
 constructor(){const subscription=this.auth.sessionChanges.subscribe(()=>{this.secret.set('');this.password='';this.code='';this.error.set('');});inject(DestroyRef).onDestroy(()=>subscription.unsubscribe());}
 async setup(){if(this.busy())return;this.busy.set(true);this.error.set('');try{this.secret.set((await this.auth.setupMfa(this.password)).secret);}catch(e){this.error.set(e instanceof Error?e.message:'Não foi possível configurar.');}finally{this.password='';this.busy.set(false);}}
 async verify(){if(this.busy())return;this.busy.set(true);this.error.set('');try{await this.auth.verifyMfa(this.code);this.secret.set('');}catch(e){this.error.set(e instanceof Error?e.message:'Confira o código.');}finally{this.code='';this.busy.set(false);}}
}
