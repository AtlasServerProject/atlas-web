import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { test, expect, Page } from '@playwright/test';
const accountFile = process.env.ATLAS_E2E_ACCOUNTS_FILE;
function account(admin = false) {
  if (!accountFile)
    throw new Error('Execute verify-local.py --web-tests para criar contas isoladas.');
  const accounts = JSON.parse(readFileSync(accountFile, 'utf8'));
  const width = test.info().title.match(/responsivos (\d+)px/);
  const index = width
    ? [1920, 1440, 1366, 1024, 768, 430, 390, 360].indexOf(Number(width[1])) + 1
    : 0;
  return accounts[admin ? 'ADMIN' : 'USER'][admin ? index : 0] as {
    email: string;
    password: string;
  };
}
async function login(page: Page, admin = false) {
  const credentials = account(admin);
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(credentials.email);
  await page.getByLabel('Senha', { exact: true }).fill(credentials.password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/conta/);
}
async function mode(page: Page) {
  await page.locator('.account-nav > button').click();
  await page.getByRole('button', { name: /Modo Admin/ }).click();
  await page.keyboard.press('Escape');
}
async function promotion(page: Page, start: number, end: number) {
  await page
    .locator('app-catalog .plan-card')
    .first()
    .getByRole('button', { name: '⚡ Promoção' })
    .click();
  const dialog = page.locator('.commerce-dialog[open]');
  const local = (ms: number) => {
    const d = new Date(ms);
    return new Date(ms - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  await dialog.getByLabel('Início', { exact: true }).fill(local(start));
  await dialog.getByLabel('Término', { exact: true }).fill(local(end));
  await dialog.getByRole('button', { name: 'Criar promoção', exact: true }).click();
  await expect(dialog).not.toBeVisible();
}
test('USER: erros, sessão, guard, vendas fechadas e logout', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(account().email);
  await page.getByLabel('Senha', { exact: true }).fill('wrong');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('incorretos');
  await login(page);
  await page.reload();
  await expect(page.locator('h1')).toHaveText('Minha conta');
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/loja');
  await expect(page.locator('.admin-controls')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Vendas em breve' })).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Vendas em breve' }).first()).toBeDisabled();
  await page.locator('.account-nav > button').click();
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.locator('.account-nav')).toHaveCount(0);
  await page.goto('/conta');
  await expect(page).toHaveURL(/login/);
});
test('ADMIN: preço persistente, promoção, edição, encerramento e agenda', async ({ page }) => {
  await login(page, true);
  await page.goto('/loja');
  await mode(page);
  await page.locator('.plan-card').first().getByRole('button', { name: '✎ Preço' }).click();
  let dialog = page.locator('.commerce-dialog[open]');
  await dialog.getByLabel('Novo preço').fill('29.90');
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await expect(page.locator('.plan-card').first()).toContainText('29,90');
  await promotion(page, Date.now() - 60000, Date.now() + 3600000);
  await expect(page.locator('.plan-card').first()).toContainText('20,93');
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Editar promoção', exact: true }).click();
  dialog = page.locator('.commerce-dialog[open]');
  await dialog.getByLabel('Nome da promoção').fill('Fim de Semana Atlas');
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('main')).toContainText('Fim de Semana Atlas');
  await page.getByRole('button', { name: 'Encerrar', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await page.goto('/loja');
  await promotion(page, Date.now() + 3600000, Date.now() + 7200000);
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Cancelar promoção', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await page.goto('/loja');
  await page.locator('.plan-card').first().getByRole('button', { name: '✎ Preço' }).click();
  dialog = page.locator('.commerce-dialog[open]');
  await dialog.getByLabel('Novo preço').fill('25.00');
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog).not.toBeVisible();
});
test('ADMIN: cria, edita e desativa produto real', async ({ page }) => {
  await login(page, true);
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Criar produto', exact: true }).click();
  const slug = 'test-' + randomUUID();
  await page.getByLabel('Nome', { exact: true }).fill('Produto de teste');
  await page.getByLabel('Identificador').fill(slug);
  await page.getByLabel('Descrição').fill('Catálogo persistente');
  await page.getByLabel('Categoria').selectOption('Chaves');
  await page.getByRole('button', { name: 'Salvar produto' }).click();
  const card = page.locator('article.card').filter({ hasText: 'Produto de teste' });
  await expect(card).toBeVisible();
  await page.reload();
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Desativar', exact: true }).click();
  await expect(card).toContainText('Desativado');
});
test('ADMIN: conflito mantém o formulário para revisão', async ({ page }) => {
  await login(page, true);
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Editar preço', exact: true }).first().click();
  const dialog = page.locator('dialog[open]');
  await dialog.getByLabel('Novo preço').fill('28.00');
  const csrf = await (await page.request.get('/api/v1/auth/csrf')).json();
  const data = await (await page.request.get('/api/v1/admin/catalog')).json();
  const item = data.products.find((p: { slug: string }) => p.slug === 'vip-1');
  expect(
    (
      await page.request.patch('/api/v1/admin/products/' + item.id + '/price', {
        headers: { [csrf.headerName]: csrf.token },
        data: { priceCents: 2600, revision: item.revision },
      })
    ).status(),
  ).toBe(200);
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Outra edição');
  await expect(dialog.getByLabel('Novo preço')).toHaveValue('28.00');
  await dialog.getByRole('button', { name: 'Atualizar revisão e manter formulário' }).click();
  await dialog.getByLabel('Novo preço').fill('25.00');
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog).not.toBeVisible();
});
test('cadastro valida confirmação e cria USER', async ({ page }) => {
  await page.goto('/cadastro');
  await page.getByLabel('Nickname').fill('NovoPlayer');
  const email = randomUUID() + '@example.invalid';
  const password = randomUUID();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByLabel('Confirmar senha').fill(randomUUID());
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('iguais');
  await page.getByLabel('Confirmar senha').fill(password);
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('email de confirmação');
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/conta/);
  await expect(page.locator('main')).toContainText('NovoPlayer');
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/$/);
});
for (const width of [1920, 1440, 1366, 1024, 768, 430, 390, 360]) {
  test(`conta, loja, admin e modal responsivos ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (
        m.type() === 'error' &&
        !(m.location().url.includes('/api/v1/users/me') && m.text().includes('401'))
      )
        errors.push(m.text());
    });
    await page.setViewportSize({ width, height: 900 });
    await login(page, true);
    for (const route of ['/conta', '/minhas-compras', '/admin', '/loja', '/cadastro']) {
      await page.goto(route);
      await expect(page.locator('h1')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    await page.goto('/admin');
    await page.getByRole('button', { name: 'Criar promoção' }).first().click();
    const dialog = page.locator('.commerce-dialog[open]');
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate((e) => e.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    expect(errors).toEqual([]);
  });
}
