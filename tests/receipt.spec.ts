import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test('comprovante mostra transações duplicadas, texto seguro e impressão', async ({ page }) => {
  const id = randomUUID();
  const user = { id: randomUUID(), username: 'Cliente', email: 'cliente@example.invalid', role: 'USER', emailVerified: true, createdAt: new Date().toISOString() };
  const order = { id, snapshot: { productName: 'VIP 1', nickname: '<img src=x onerror=alert(1)>', server: 'emerald', durationDays: 30 }, totalCents: 2500, currency: 'BRL', createdAt: new Date().toISOString(), paymentStatus: 'PAID', deliveryStatus: 'PROCESSING' };
  await page.route('**/api/v1/users/me', route => route.fulfill({ json: user }));
  await page.route(/\/api\/v1\/orders\?page=\d+$/, route => route.fulfill({ json: { items: [order], page: 0, size: 20, hasNext: false } }));
  await page.route('**/api/v1/orders/*/receipt', route => route.fulfill({ json: { order, payments: [
    { id: '12345', status: 'approved', updatedAt: new Date().toISOString(), mode: 'test', duplicate: false },
    { id: '12346', status: 'approved', updatedAt: new Date().toISOString(), mode: 'test', duplicate: true }
  ] } }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/minhas-compras');
  await page.getByRole('link', { name: 'Ver comprovante' }).click();
  await expect(page.getByRole('heading', { name: 'Comprovante da compra' })).toBeVisible();
  await expect(page.getByText('Mercado Pago · 12346')).toBeVisible();
  await expect(page.getByText(/Pagamento duplicado registrado/)).toBeVisible();
  await expect(page.getByText('<img src=x onerror=alert(1)>', { exact: false })).toBeVisible();
  expect(await page.locator('app-order-receipt img').count()).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => { window.print = () => { document.title = 'impressão chamada'; }; });
  await page.getByRole('button', { name: 'Imprimir / salvar PDF' }).click();
  await expect(page).toHaveTitle('impressão chamada');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('app-navbar')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Imprimir / salvar PDF' })).toBeHidden();
});
