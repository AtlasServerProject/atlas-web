import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { GoogleIdentityService } from '../core/google-identity.service';
interface GoogleSdk { accounts:{id:{initialize(options:Record<string,unknown>):void;renderButton(element:HTMLElement,options:Record<string,unknown>):void;cancel():void;}}; }
declare global { interface Window {google?:GoogleSdk;} }
let sdkPromise:Promise<GoogleSdk>|undefined;
function sdk():Promise<GoogleSdk>{
 if(window.google?.accounts?.id)return Promise.resolve(window.google);
 if(sdkPromise)return sdkPromise;
 sdkPromise=new Promise<GoogleSdk>((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.defer=true;
  const timer=setTimeout(()=>{script.remove();sdkPromise=undefined;reject(new Error('O Google não respondeu. Tente novamente.'));},10000);
  script.onload=()=>{clearTimeout(timer);if(window.google?.accounts?.id)resolve(window.google);else{sdkPromise=undefined;reject(new Error('Não foi possível carregar o Google.'));}};
  script.onerror=()=>{clearTimeout(timer);script.remove();sdkPromise=undefined;reject(new Error('Não foi possível carregar o Google.'));};document.head.appendChild(script);
 });return sdkPromise;
}
@Component({selector:'app-google-sign-in',standalone:true,styles:`
:host{display:block;width:100%;min-width:0;margin:0}
.google-shell{width:100%;padding:5px;border:1px solid #78ddff38;border-radius:14px;background:linear-gradient(135deg,#78ddff16,#0d1730);box-shadow:0 6px 20px #0002;transition:border-color .18s,box-shadow .18s}
.google-shell:hover,.google-shell:focus-within{border-color:var(--accent,#78ddff);box-shadow:0 0 0 3px #78ddff12,0 8px 24px #0003}
.google-button{min-height:40px;display:flex;justify-content:center;overflow:hidden;border-radius:10px}
p{font-size:.9rem;margin:10px 0 0;color:var(--muted)}
p[role=alert]{color:var(--text)}
`,template:`
<div class="google-shell" [hidden]="!visible()"><div #button class="google-button"></div></div>
@if (busy()) {<p role="status">Confirmando sua conta Google…</p>}
@if (error()) {<p role="alert">{{error()}}</p><button type="button" class="button secondary" (click)="render()">Tentar Google novamente</button>}
`})
export class GoogleSignInComponent implements AfterViewInit,OnDestroy {
 @Input() link=false;@Output() linked=new EventEmitter<void>();@ViewChild('button',{static:true})button!:ElementRef<HTMLElement>;
 private readonly auth=inject(AuthService);private readonly google=inject(GoogleIdentityService);private readonly router=inject(Router);private destroyed=false;private renderSequence=0;
 readonly visible=signal(false);readonly busy=signal(false);readonly error=signal('');
 ngAfterViewInit(){void this.render();}
 async render(){
  const sequence=++this.renderSequence,epoch=this.auth.sessionGeneration();this.error.set('');this.visible.set(false);this.button.nativeElement.replaceChildren();
  try{
   const provider=await this.google.provider();if(!provider.enabled||!provider.clientId||this.destroyed||epoch!==this.auth.sessionGeneration())return;
   const api=await sdk();const challenge=await this.google.challenge(this.link);
   if(this.destroyed||epoch!==this.auth.sessionGeneration()||sequence!==this.renderSequence)return;
   api.accounts.id.initialize({client_id:provider.clientId,nonce:challenge.nonce,auto_select:false,ux_mode:'popup',use_fedcm_for_button:false,callback:(response:{credential?:string})=>{if(!this.destroyed&&epoch===this.auth.sessionGeneration()&&sequence===this.renderSequence&&response.credential)void this.complete(response.credential);}});
   this.visible.set(true);
   const width=Math.max(200,Math.min(400,Math.floor(this.button.nativeElement.closest('app-google-sign-in')!.getBoundingClientRect().width-12)));
   api.accounts.id.renderButton(this.button.nativeElement,{type:'standard',theme:'filled_black',size:'large',text:this.link?'continue_with':'signin_with',shape:'rectangular',width,locale:'pt-BR'});
  }catch(e){if(!this.destroyed&&epoch===this.auth.sessionGeneration())this.error.set(e instanceof Error?e.message:'O Google está indisponível.');}
 }
 private async complete(credential:string){if(this.busy())return;this.busy.set(true);this.error.set('');try{if(this.link){await this.google.link(credential);await this.auth.refresh();this.linked.emit();}else{await this.auth.loginGoogle(credential);if(!this.auth.mfaChallenge())await this.router.navigateByUrl('/conta');}}catch(e){this.button.nativeElement.replaceChildren();this.error.set(e instanceof Error?e.message:'Não foi possível entrar com o Google.');}finally{this.busy.set(false);}}
 ngOnDestroy(){this.destroyed=true;this.renderSequence++;}
}
