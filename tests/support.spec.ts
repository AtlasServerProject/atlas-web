import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test('Suporte acessa tickets, sem acesso ao painel comercial', async ({ page }) => {
  const id = randomUUID(),
    orderId = randomUUID();
  const ticket = {
    id,
    orderId,
    title: 'Pagamento duplicado',
    status: 'OPEN',
    updatedAt: new Date().toISOString(),
  };
  await page.route('**/api/v1/users/me', (r) =>
    r.fulfill({
      json: {
        id: randomUUID(),
        username: 'Suporte',
        email: 'sup@example.invalid',
        role: 'SUPPORT',
        emailVerified: true,
      },
    }),
  );
  await page.route(/\/api\/v1\/orders\?page=\d+$/, (r) =>
    r.fulfill({ json: { items: [], page: 0, hasNext: false } }),
  );
  await page.route(/\/api\/v1\/admin\/support\/tickets\?page=\d+$/, (r) =>
    r.fulfill({ json: { items: [ticket], hasNext: false } }),
  );
  await page.route('**/api/v1/admin/support/tickets/' + id, (r) =>
    r.fulfill({
      json: {
        ticket,
        order: {
          id: orderId,
          snapshot: { productName: 'VIP 1', nickname: 'Player', server: 'emerald' },
          totalCents: 2500,
          currency: 'BRL',
          paymentStatus: 'PAID',
          deliveryStatus: 'PROCESSING',
        },
        payments: [{ id: '1234', status: 'approved', duplicate: true, mode: 'test' }],
        messages: [
          {
            id: 1,
            kind: 'CUSTOMER',
            body: '<script>não executar</script>',
            createdAt: new Date().toISOString(),
          },
        ],
        hasMore: false,
      },
    }),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin/tickets');
  await expect(page.getByRole('heading', { name: 'Atendimento — equipe' })).toBeVisible();
  await page.getByRole('button', { name: 'Abrir conversa' }).click();
  await expect(page.getByText('Pagamento duplicado para revisão')).toBeVisible();
  await expect(page.getByText('<script>não executar</script>', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('button', { name: 'Criar produto' })).toHaveCount(0);
});

test('cliente abre ticket a partir do próprio pedido', async ({ page }) => {
  const orderId = randomUUID(),
    id = randomUUID();
  const order = {
    id: orderId,
    snapshot: { productName: 'VIP 1', nickname: 'Player', server: 'emerald' },
    totalCents: 2500,
    currency: 'BRL',
    paymentStatus: 'PAID',
    deliveryStatus: 'PROCESSING',
  };
  const ticket = {
    id,
    orderId,
    title: 'Não recebi o VIP',
    status: 'OPEN',
    updatedAt: new Date().toISOString(),
  };
  await page.route('**/api/v1/users/me', (r) =>
    r.fulfill({
      json: {
        id: randomUUID(),
        username: 'Cliente',
        email: 'user@example.invalid',
        role: 'USER',
        emailVerified: true,
      },
    }),
  );
  await page.route(/\/api\/v1\/orders\?page=\d+$/, (r) =>
    r.fulfill({ json: { items: [order], page: 0, hasNext: false } }),
  );
  await page.route('**/api/v1/orders/' + orderId, (r) => r.fulfill({ json: order }));
  let created = false;
  await page.route(/\/api\/v1\/support\/tickets\?page=\d+$/, (r) =>
    r.fulfill({ json: { items: created ? [ticket] : [], hasNext: false } }),
  );
  await page.route('**/api/v1/auth/csrf', (r) =>
    r.fulfill({ json: { token: 'test', headerName: 'X-CSRF-TOKEN' } }),
  );
  await page.route('**/api/v1/support/tickets', (r) => {
    expect(r.request().postDataJSON().orderId).toBe(orderId);
    created = true;
    return r.fulfill({ json: ticket });
  });
  await page.route('**/api/v1/support/tickets/' + id, (r) =>
    r.fulfill({
      json: {
        ticket,
        order,
        payments: [],
        messages: [
          {
            id: 1,
            kind: 'CUSTOMER',
            body: 'Meu pagamento foi aprovado',
            createdAt: new Date().toISOString(),
          },
        ],
        hasMore: false,
      },
    }),
  );
  await page.goto('/minhas-compras');
  await page.getByRole('link', { name: 'Preciso de ajuda' }).click();
  await page.getByLabel('Assunto', { exact: true }).fill(ticket.title);
  await page.getByLabel('Descreva o problema').fill('Meu pagamento foi aprovado');
  await page.getByRole('button', { name: 'Abrir atendimento' }).click();
  await expect(page.getByRole('heading', { name: 'Conversa' })).toBeVisible();
  await expect(page.getByText('Meu pagamento foi aprovado', { exact: true })).toBeVisible();
});

test('ADM vê as contas SUP e MOD na lista da equipe', async ({ page }) => {
  await page.route('**/api/v1/users/me', r => r.fulfill({ json: { id: randomUUID(), username: 'Dono', email: 'owner@example.invalid', role: 'ADMIN', emailVerified: true } }));
  await page.route('**/api/v1/admin/team?page=0', r => r.fulfill({ json: { items: [
    { id: randomUUID(), username: 'EquipeSuporte', role: 'SUPPORT' },
    { id: randomUUID(), username: 'EquipeModeracao', role: 'MODERATOR' }
  ], hasNext: false } }));
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Equipe do site' })).toBeVisible();
  await expect(page.getByRole('row', { name: 'EquipeSuporte SUP' })).toBeVisible();
  await expect(page.getByRole('row', { name: 'EquipeModeracao MOD' })).toBeVisible();
});
