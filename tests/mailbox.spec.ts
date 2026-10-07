import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
test('correio mostra compra disponível sem iniciar VIP e depois histórico ativado', async ({ page }) => {
 const file=process.env.ATLAS_E2E_ACCOUNTS_FILE;
 const user=file?JSON.parse(readFileSync(file,'utf8')).USER[0]:{email:'mailbox@example.invalid',password:'BrowserFixtureOnly'};
 if(!file){
  let loggedIn=false;
  const account={id:'22222222-2222-4222-8222-222222222222',username:'Correio teste',email:user.email,role:'USER',emailVerified:true,createdAt:'2026-10-07T12:00:00Z'};
  await page.route('**/api/v1/**',route=>{
   const path=new URL(route.request().url()).pathname;
   if(path==='/api/v1/auth/csrf')return route.fulfill({json:{token:'browser-fixture',headerName:'X-CSRF-TOKEN'}});
   if(path==='/api/v1/auth/login'){loggedIn=true;return route.fulfill({json:account});}
   if(path==='/api/v1/users/me')return route.fulfill(loggedIn?{json:account}:{status:401,json:{}});
   return route.fulfill({status:503,json:{message:'Fixture sem integração externa'}});
  });
 }
 let status='AVAILABLE';await page.route('**/api/v1/users/me/purchases?page=0',route=>route.fulfill({json:[{id:'11111111-1111-4111-8111-111111111111',productName:'VIP 1',days:30,status,purchasedAt:'2026-10-07T12:00:00Z',activatedAt:status==='ACTIVATED'?'2026-10-08T12:00:00Z':null}]}));
 await page.setViewportSize({width:390,height:844});await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill(user.email);await page.getByLabel('Senha',{exact:true}).fill(user.password);await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page.getByRole('heading',{name:'Correio de compras'})).toBeVisible();await expect(page.getByText('Disponível para ativar no /compras',{exact:true})).toBeVisible();await expect(page.getByText(/Ativado em/)).toHaveCount(0);
 status='ACTIVATED';await page.getByRole('button',{name:'Atualizar',exact:true}).click();await expect(page.getByText('Ativado',{exact:true})).toBeVisible();await expect(page.getByText(/Ativado em/)).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
