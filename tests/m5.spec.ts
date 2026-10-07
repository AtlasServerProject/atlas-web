import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

test('M5: checkout pendente, erro recuperável, redirect restrito e confirmação consultada', async ({
  page,
}) => {
  const file = process.env.ATLAS_E2E_ACCOUNTS_FILE;
  if (!file) throw new Error('Execute verify-local.py --web-tests com ambiente isolado.');
  const account = JSON.parse(readFileSync(file, 'utf8')).USER[0];
  const order = {
    id: randomUUID(),
    snapshot: {
      productName: 'VIP 1',
      nickname: 'PlayerTest',
      server: 'emerald',
      durationDays: 30,
      unitCents: 2500,
    },
    totalCents: 2500,
    currency: 'BRL',
    quantity: 1,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 1800000).toISOString(),
    paymentStatus: 'PENDING',
    deliveryStatus: 'WAITING',
  };
  await page.route(/\/api\/v1\/orders\?page=\d+$/, (route) =>
    route.fulfill({ json: { items: [order], page: 0, size: 20, hasNext: false } }),
  );
  let result: unknown = { state: 'UNKNOWN', checkoutUrl: null, mode: 'test' };
  await page.route('**/api/v1/orders/*/payment', (route) => route.fulfill({ json: result }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(account.email);
  await page.getByLabel('Senha', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/conta/);
  await page.goto('/minhas-compras?collection_status=approved&payment_id=999');
  await expect(page.getByText('Aguardando pagamento', { exact: true })).toBeVisible();
  const pay = page.getByRole('button', { name: 'Pagar com Mercado Pago' });
  await pay.click();
  await expect(page.getByRole('alert')).toContainText('sendo verificado');
  await expect(pay).toBeEnabled();
  result = { state: 'READY', checkoutUrl: 'https://evil.invalid/checkout', mode: 'test' };
  await pay.click();
  await expect(page.getByRole('alert')).toContainText('Não foi possível abrir');
  await expect(page).toHaveURL(/minhas-compras/);
  order.paymentStatus = 'PAID';
  order.deliveryStatus = 'PROCESSING';
  await page.getByRole('button', { name: 'Atualizar status', exact: true }).click();
  await expect(page.getByText('Pagamento confirmado', { exact: true })).toBeVisible();
  await expect(page.getByText('Compra no correio; consulte /compras', { exact: true })).toBeVisible();
  await expect(pay).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  order.paymentStatus = 'PENDING';
  order.deliveryStatus = 'WAITING';
  await page.getByRole('button', { name: 'Atualizar status', exact: true }).click();
  result = {
    state: 'READY',
    checkoutUrl: 'https://sandbox.mercadopago.com.br/checkout/isolated',
    mode: 'test',
  };
  await page.route('https://sandbox.mercadopago.com.br/checkout/isolated', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<h1>Checkout isolado</h1>' }),
  );
  await pay.click();
  await expect(page).toHaveURL('https://sandbox.mercadopago.com.br/checkout/isolated');
  await expect(page.getByRole('heading', { name: 'Checkout isolado' })).toBeVisible();
});
