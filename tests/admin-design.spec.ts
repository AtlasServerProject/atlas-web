import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
test('dashboard responsivo, menu e formulário acessível', async ({ page }) => {
  await page.route('**/api/v1/users/me', r => r.fulfill({ json: { id: randomUUID(), username: 'Atlas', role: 'ADMIN', email: 'admin@example.invalid', emailVerified: true } }));
  await page.route('**/api/v1/admin/catalog', r => r.fulfill({ json: { serverTime: new Date().toISOString(), revision: 1, products: [1,2,3].map(id => ({ id, name: 'VIP '+id, slug: 'vip-'+id, description: 'Benefícios para sua jornada no Emerald.', category: 'VIPs', active: true, priceCents: id*2500, revision: 1 })), promotions: [] } }));
  await page.route('**/api/v1/admin/team?page=0', r => r.fulfill({ json: { items: [{id: randomUUID(), username: 'EquipeSuporte',role:'SUPPORT'},{id:randomUUID(),username:'EquipeModeracao',role:'MODERATOR'}],hasNext:false } }));
  await page.route('**/api/v1/admin/deliveries?page=0', r => r.fulfill({ json: [] }));
  await page.route(/\/api\/v1\/orders\?page=\d+$/, r => r.fulfill({ json: {items:[],page:0,hasNext:false} }));
  await page.goto('/admin');
  await expect(page.getByRole('heading', {name:'Visão geral'})).toBeVisible();
  await expect(page.locator('.admin-metric').first().locator('strong')).toHaveText('3');
  for (const section of ['team', 'products', 'deliveries', 'overview']) {
    await page.locator('.admin-nav a[ href="/admin#admin-' + section + '"]').click();
    await expect(page).toHaveURL(new RegExp('/admin#admin-' + section + '$'));
    await expect(page.locator('#admin-' + section)).toBeInViewport();
  }
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({width,height:1000});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width <= 760) {
      const menu = page.getByRole('button',{name:'Menu do painel'});
      await expect(menu).toHaveAttribute('aria-expanded','false');
      await menu.click();
      await expect(page.locator('.admin-nav')).toBeVisible();
      await menu.click();
      await expect(page.locator('.admin-nav')).toBeHidden();
    }
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.screenshot({path:'/tmp/atlas-admin-desktop.png',fullPage:true});
  await expect(page.getByRole('button',{name:'Criar produto',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Editar produto',exact:true}).first().click();
  const input=page.getByLabel('Nome',{exact:true});
  await expect(input).toBeVisible(); await input.focus();
  expect(await input.evaluate(el=>getComputedStyle(el).outlineStyle)).not.toBe('none');
  await input.fill('');
  await input.blur();
  await expect(input).toHaveClass(/ng-invalid/);
  await page.setViewportSize({width:390,height:1000});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path:'/tmp/atlas-admin-mobile.png',fullPage:true});
});
