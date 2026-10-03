import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
test('M4: vínculo comprovado no Core, confirmação web, pedido revisado e histórico real', async ({
  page,
  request,
}) => {
  const file = process.env.ATLAS_E2E_ACCOUNTS_FILE;
  const coreUrl = process.env.ATLAS_E2E_CORE_API_URL;
  const key = process.env.ATLAS_CORE_KEY;
  if (!file || !coreUrl || !key)
    throw new Error('Execute verify-local.py --web-tests com ambiente isolado.');
  const account = JSON.parse(readFileSync(file, 'utf8')).USER[0];
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(account.email);
  await page.getByLabel('Senha', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/conta/);
  await page.getByRole('button', { name: 'Vincular conta Minecraft', exact: true }).click();
  const command = page.locator('.link-command');
  await expect(command).toContainText('/site vincular ');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const code = (await command.innerText()).trim().split(' ').at(-1)!;
  const subject = randomUUID();
  const proof = {
    code,
    subject,
    corePlayerId: 345,
    minecraftUuid: randomUUID(),
    nickname: 'TestFromCore',
    server: 'emerald',
  };
  expect(
    (await request.post(coreUrl + '/internal/v1/minecraft/proofs', { data: proof })).status(),
  ).toBe(403);
  expect(
    (
      await request.post(coreUrl + '/internal/v1/minecraft/proofs', {
        headers: { 'X-Atlas-Key': key },
        data: proof,
      })
    ).status(),
  ).toBe(204);
  await page.getByRole('button', { name: 'Já executei no jogo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Confirmar vínculo', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar vínculo', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Confirmar vínculo Minecraft' });
  await expect(dialog).toContainText('TestFromCore');
  await expect(dialog.getByRole('button', { name: 'Cancelar', exact: true })).toBeFocused();
  await dialog.getByRole('button', { name: 'Sim, este é meu jogador' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('app-minecraft-link')).toContainText('Vinculado a TestFromCore');
  await page.reload();
  await expect(page.locator('app-minecraft-link')).toContainText('Vinculado a TestFromCore');
  await page.goto('/minhas-compras');
  await expect(page.getByText('Você ainda não tem pedidos.', { exact: true })).toBeVisible();
  let price = 2500;
  let created: any = null;
  const attempts: { key: string; body: any }[] = [];
  // Isolated UI fault injection; backend ownership, concurrency and pricing have separate real PostgreSQL tests.
  await page.route(/\/api\/v1\/(admin\/)?catalog$/, async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    data.products = data.products
      .filter((p: any) => p.id <= 3)
      .map((p: any) =>
        p.id === 1 ? { ...p, purchasable: true, priceCents: price, finalCents: price } : p,
      );
    data.promotions = [];
    await route.fulfill({ response, json: data });
  });
  await page.route(/\/api\/v1\/orders\?page=\d+$/, (route) =>
    route.fulfill({ json: { items: created ? [created] : [], page: 0, size: 20, hasNext: false } }),
  );
  await page.route('**/api/v1/orders/checkout', (route) => {
    const body = route.request().postDataJSON();
    attempts.push({ key: route.request().headers()['idempotency-key'], body });
    if (attempts.length === 1) {
      price = 3000;
      return route.fulfill({
        status: 409,
        json: {
          code: 'QUOTE_CHANGED',
          message: 'O preço mudou. Atualize e confirme o valor novamente.',
        },
      });
    }
    if (attempts.length === 2)
      return route.fulfill({
        status: 503,
        json: { message: 'Serviço temporariamente indisponível. Tente novamente.' },
      });
    created = {
      id: randomUUID(),
      snapshot: {
        productName: 'VIP 1',
        nickname: 'TestFromCore',
        subject,
        server: 'emerald',
        durationDays: 30,
        unitCents: price,
      },
      totalCents: price,
      currency: 'BRL',
      quantity: 1,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 1800000).toISOString(),
      paymentStatus: 'PENDING',
      deliveryStatus: 'WAITING',
    };
    return route.fulfill({ json: created });
  });
  await page.goto('/loja');
  await page.getByRole('button', { name: 'Preparar pedido', exact: true }).click();
  const checkout = page.getByRole('dialog', { name: 'Confira seu pedido' });
  await expect(checkout).toContainText('TestFromCore');
  await expect(checkout).toContainText('25,00');
  await checkout.getByRole('button', { name: 'Confirmar pedido', exact: true }).click();
  await expect(checkout.getByRole('alert')).toContainText('preço mudou');
  await checkout.getByRole('button', { name: 'Atualizar valor e revisar' }).click();
  await expect(checkout).toContainText('30,00');
  await checkout.getByRole('button', { name: 'Confirmar pedido', exact: true }).click();
  await expect(checkout.getByRole('alert')).toContainText('temporariamente');
  await checkout.getByRole('button', { name: 'Confirmar pedido', exact: true }).click();
  await expect(page).toHaveURL(/minhas-compras/);
  await expect(page.locator('main')).toContainText('Aguardando pagamento');
  await expect(page.locator('main')).toContainText('30,00');
  expect(attempts[0].key).not.toBe(attempts[1].key);
  expect(attempts[1]).toEqual(attempts[2]);
  await page.goto('/conta');
  await page.getByRole('button', { name: 'Desvincular jogador', exact: true }).click();
  const unlink = page.getByRole('dialog', { name: 'Desvincular jogador' });
  await unlink.getByLabel('Senha da conta do site').fill('senha-incorreta');
  await unlink.getByRole('button', { name: 'Confirmar desvinculação' }).click();
  await expect(unlink.getByRole('alert')).toBeVisible();
  await unlink.getByLabel('Senha da conta do site').fill(account.password);
  await unlink.getByRole('button', { name: 'Confirmar desvinculação' }).click();
  await expect(unlink).not.toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Vincular conta Minecraft', exact: true }),
  ).toBeVisible();
});
