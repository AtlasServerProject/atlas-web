import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
test('correio mostra compra disponível sem iniciar VIP e depois histórico ativado', async ({ page }) => {
 const file=process.env.ATLAS_E2E_ACCOUNTS_FILE;if(!file)throw new Error('Use verify-local.py --web-tests');const user=JSON.parse(readFileSync(file,'utf8')).USER[0];
 let status='AVAILABLE';await page.route('**/api/v1/users/me/purchases?page=0',route=>route.fulfill({json:[{id:'11111111-1111-4111-8111-111111111111',productName:'VIP 1',days:30,status,purchasedAt:'2026-10-07T12:00:00Z',activatedAt:status==='ACTIVATED'?'2026-10-08T12:00:00Z':null}]}));
 await page.setViewportSize({width:390,height:844});await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill(user.email);await page.getByLabel('Senha',{exact:true}).fill(user.password);await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page.getByRole('heading',{name:'Correio de compras'})).toBeVisible();await expect(page.getByText('Disponível para ativar no /compras',{exact:true})).toBeVisible();await expect(page.getByText(/Ativado em/)).toHaveCount(0);
 status='ACTIVATED';await page.getByRole('button',{name:'Atualizar',exact:true}).click();await expect(page.getByText('Ativado',{exact:true})).toBeVisible();await expect(page.getByText(/Ativado em/)).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
