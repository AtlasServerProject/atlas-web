import { Component, DestroyRef, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { GoogleIdentityService } from '../../core/google-identity.service';
import { GoogleSignInComponent } from '../../shared/google-sign-in.component';
@Component({selector:'app-google-account',standalone:true,imports:[GoogleSignInComponent],template:`
@if(enabled()){
<section class="card"><h2>Conta Google</h2>
@if(linked()){
<p>Google vinculado à sua conta Atlas.</p><p>Para criar ou alterar sua senha do Atlas, solicite um link no seu email.</p><button type="button" class="button secondary" [disabled]="busy()" (click)="password()">Definir ou alterar senha</button>
}@else{
<p>Vincule a conta Google que usa o mesmo email do Atlas. Seu histórico e seus apoios serão mantidos.</p>
@if(open()){<app-google-sign-in [link]="true" (linked)="reload()"/>}@else{<button type="button" class="button secondary" (click)="open.set(true)">Vincular Google</button>}
}
@if(message()){<p role="status">{{message()}}</p>}
</section>}
`})
export class GoogleAccountComponent {
 private readonly auth=inject(AuthService);private readonly google=inject(GoogleIdentityService);readonly enabled=signal(false);readonly linked=signal(false);readonly open=signal(false);readonly busy=signal(false);readonly message=signal('');
 constructor(){void this.reload();const subscription=this.auth.sessionChanges.subscribe(()=>{this.enabled.set(false);this.linked.set(false);this.open.set(false);this.message.set('');});inject(DestroyRef).onDestroy(()=>subscription.unsubscribe());}
 async reload(){try{const result=await this.google.provider();this.enabled.set(result.enabled);this.linked.set(result.linked);this.open.set(false);}catch{this.enabled.set(false);}}
 async password(){const email=this.auth.currentUser()?.email;if(!email||this.busy())return;this.busy.set(true);try{await this.auth.forgotPassword(email);this.message.set('Confira seu email para definir ou alterar sua senha do Atlas.');}catch(e){this.message.set(e instanceof Error?e.message:'Tente novamente.');}finally{this.busy.set(false);}}
}
