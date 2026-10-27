import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
try{
 for(const scenario of ['mfa','existing-account']){
  const context=await browser.newContext(),page=await context.newPage();const errors=[];let nonce=0,posted=false;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({contentType:'text/javascript',body:`window.google={accounts:{id:{initialize(options){window.syntheticGoogle=options;},renderButton(element){const b=document.createElement('button');b.type='button';b.textContent='Entrar com Google';b.onclick=()=>window.syntheticGoogle.callback({credential:'synthetic-id-token'});element.appendChild(b);},cancel(){}}}};`}));
  await page.route('**/api/v1/**',async route=>{
   const path=new URL(route.request().url()).pathname;let status=200,body={};
   if(path.endsWith('/users/me')){status=401;body={code:'AUTHENTICATION_REQUIRED'};}
   else if(path.endsWith('/auth/csrf'))body={token:'synthetic-csrf',headerName:'X-CSRF-TOKEN'};
   else if(path.endsWith('/catalog'))body={revision:1,serverTime:new Date().toISOString(),products:[],promotions:[]};
   else if(path.endsWith('/google/provider'))body={enabled:true,clientId:'synthetic-google.apps.googleusercontent.com',linked:false};
   else if(path.endsWith('/google/challenge'))body={nonce:'synthetic-nonce-'+(++nonce)};
   else if(path.endsWith('/google/complete')){
    assert.equal(route.request().headers()['x-csrf-token'],'synthetic-csrf');assert.equal(route.request().postDataJSON().credential,'synthetic-id-token');posted=true;
    if(scenario==='mfa')body={mfaRequired:true,setupRequired:true};else{status=409;body={code:'GOOGLE_ACCOUNT_EXISTS',message:'Este email já possui uma conta Atlas. Entre com sua senha e vincule o Google em Minha conta.'};}
   }
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto('http://127.0.0.1:4206/login');await page.getByRole('button',{name:'Entrar com Google',exact:true}).click();
  if(scenario==='mfa'){await page.getByRole('heading',{name:'Proteção em duas etapas'}).waitFor();await page.getByRole('button',{name:'Configurar autenticador'}).waitFor();assert.match(page.url(),/\/login$/);}
  else{await page.getByRole('alert').filter({hasText:'Este email já possui'}).waitFor();await page.getByRole('button',{name:'Tentar Google novamente'}).click();await page.getByRole('button',{name:'Entrar com Google',exact:true}).waitFor();assert.equal(nonce,2);}
  assert.equal(posted,true);assert.deepEqual(errors,[]);console.log('PASS Google UI:',scenario);await context.close();
 }
}finally{await browser.close();}
