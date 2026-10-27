const {test}=require('node:test'),fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ts=require('typescript'),rx=require('rxjs'),path=require('node:path');
class HttpClient{};class HttpErrorResponse{constructor(status,error){this.status=status;this.error=error;}};class AuthToken{};class ClockToken{};
const signal=value=>{const f=()=>value;f.set=v=>value=v;f.asReadonly=()=>f;return f;};
function load(file,inject){
 const source=fs.readFileSync(path.join(__dirname,'../src/app/core',file),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText;
 const mocks={'@angular/core':{Injectable:()=>x=>x,signal,computed:f=>f,inject},'@angular/common/http':{HttpClient,HttpErrorResponse},'@angular/core/rxjs-interop':{toObservable:()=>({})},'rxjs':rx,'./auth.service':{AuthService:AuthToken},'./clock.service':{ClockService:ClockToken},'./mock-data':{mockProducts:[]},'./mock-session':{readMock:(k,v)=>v,writeMock:()=>{}},'./models':{}};
 const exports={};vm.runInNewContext(js,{exports,require:k=>{if(!(k in mocks))throw Error(k);return mocks[k];},setInterval:()=>0,clearInterval:()=>{},document:{addEventListener:()=>{},removeEventListener:()=>{}},Date,console,Error});return exports;
}
test('logout discards delayed account response; stale 401 does not clear next login',async()=>{
 let me=new rx.Subject();const {AuthService}=load('auth.service.ts',()=>({get:()=>me}));const auth=new AuthService();auth.boundary({id:'A',role:'ADMIN'});const pending=auth.refresh();auth.post=async()=>{};await auth.logout();me.next({id:'A',role:'ADMIN'});await pending;assert.equal(auth.currentUser(),null);
 me=new rx.Subject();const old=auth.refresh();auth.boundary({id:'B',role:'USER'});me.error(new HttpErrorResponse(401));await old;assert.equal(auth.currentUser().id,'B');
});
test('catalog clears synchronously and ignores old administrative data after logout',async()=>{
 let admin=true,epoch=1,requests=[];const changes=new rx.Subject();const auth={isAdmin:()=>admin,sessionGeneration:()=>epoch,sessionChanges:changes};const http={get:url=>{const response=new rx.Subject();requests.push({url,response});return response;}};
 const {CatalogApiService}=load('catalog-api.service.ts',token=>token===HttpClient?http:token===AuthToken?auth:{synchronize:()=>{}});const catalog=new CatalogApiService();const snapshot={revision:1,serverTime:new Date().toISOString(),products:[{id:1,name:'PRIVATE_DRAFT',active:false,priceCents:100}],promotions:[]};
 const flight=catalog.refresh();requests[0].response.next(snapshot);await flight;assert.equal(catalog.products()[0].name,'PRIVATE_DRAFT');const late=catalog.refresh();admin=false;epoch++;changes.next();assert.equal(catalog.products().length,0);assert.equal(requests.at(-1).url,'/api/v1/catalog');requests[1].response.next(snapshot);await late;assert.equal(catalog.products().length,0);requests.at(-1).response.error(new HttpErrorResponse(503));await catalog.refresh();assert.equal(catalog.products().length,0);catalog.ngOnDestroy();
});
test('logout during CSRF acquisition prevents sensitive mutation',async()=>{
 let epoch=1,admin=true,sent=0;const csrf=new rx.Subject(),changes=new rx.Subject();const auth={isAdmin:()=>admin,sessionGeneration:()=>epoch,sessionChanges:changes};const http={get:()=>csrf,request:()=>{sent++;return rx.of({});}};
 const {CatalogApiService}=load('catalog-api.service.ts',token=>token===HttpClient?http:token===AuthToken?auth:{synchronize:()=>{}});const catalog=new CatalogApiService();const pending=catalog.mutate('PATCH','products/1/price',{});epoch++;admin=false;csrf.next({token:'fixture',headerName:'X-CSRF-TOKEN'});await assert.rejects(pending);assert.equal(sent,0);catalog.ngOnDestroy();
});
test('invalid MFA code preserves pending challenge for retry without logging in',async()=>{
 const http={get:()=>rx.of({token:'fixture',headerName:'X-CSRF-TOKEN'}),post:()=>rx.throwError(()=>new HttpErrorResponse(401,{code:'INVALID_MFA_CODE'}))};const {AuthService}=load('auth.service.ts',()=>http);const auth=new AuthService();auth.mfaChallenge.set({setupRequired:false});await assert.rejects(auth.verifyMfa('000000'));assert.equal(auth.mfaChallenge().setupRequired,false);assert.equal(auth.currentUser(),null);
});
test('revoked administrator role clears drafts as soon as catalog returns forbidden',async()=>{
 let admin=true,epoch=1,requests=[],refreshed=0;const changes=new rx.Subject();const auth={isAdmin:()=>admin,sessionGeneration:()=>epoch,sessionChanges:changes,expireSession(){admin=false;epoch++;changes.next();},refresh:async()=>{refreshed++;}};const http={get:url=>{const response=new rx.Subject();requests.push({url,response});return response;}};
 const {CatalogApiService}=load('catalog-api.service.ts',token=>token===HttpClient?http:token===AuthToken?auth:{synchronize:()=>{}});const catalog=new CatalogApiService();const first=catalog.refresh();requests[0].response.next({revision:1,serverTime:new Date().toISOString(),products:[{id:1,name:'PRIVATE',priceCents:100}],promotions:[]});await first;const next=catalog.refresh();requests[1].response.error(new HttpErrorResponse(403));await next;assert.equal(catalog.products().length,0);assert.equal(admin,false);assert.equal(refreshed,1);requests[2].response.next({revision:1,serverTime:new Date().toISOString(),products:[],promotions:[]});await catalog.refresh();catalog.ngOnDestroy();
});
test('late Google authentication response cannot replace a newer session',async()=>{
 const response=new rx.Subject();const http={get:()=>rx.of({token:'fixture',headerName:'X-CSRF-TOKEN'}),post:()=>response};const {AuthService}=load('auth.service.ts',()=>http);const auth=new AuthService();const pending=auth.loginGoogle('synthetic-google-id-token');await Promise.resolve();auth.boundary({id:'next-user',role:'USER'});response.next({id:'old-google-user',role:'USER'});await assert.rejects(pending);assert.equal(auth.currentUser().id,'next-user');
});
