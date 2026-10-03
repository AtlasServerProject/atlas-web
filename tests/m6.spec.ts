import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
function account(role: 'USER' | 'ADMIN', index = 0) {
  const file = process.env.ATLAS_E2E_ACCOUNTS_FILE;
  if (!file) throw new Error('Execute verify-local.py --web-tests com ambiente isolado.');
  return JSON.parse(readFileSync(file, 'utf8'))[role][index];
}
test('M6: conta mostra nível atual e saldo pausado; atualização reflete retomada', async ({ page }) => {
  const user = account('USER');
  let vip = { linked: true, synchronizedWithCore: true, activeLevel: 3, activeUntil: '2026-11-03T12:00:00Z', paused: [{ level: 1, remainingSeconds: 20 * 86400 }] };
  await page.route('**/api/v1/users/me/vip', route => route.fulfill({ json: vip }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByLabel('Senha', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText('VIP 3 ativo', { exact: true })).toBeVisible();
  await expect(page.getByText('VIP 1 pausado · 20 dias restantes.', { exact: true })).toBeVisible();
  vip = { ...vip, activeLevel: 1, paused: [] };
  await page.getByRole('button', { name: 'Atualizar VIP', exact: true }).click();
  await expect(page.getByText('VIP 1 ativo', { exact: true })).toBeVisible();
  await expect(page.getByText(/VIP 1 pausado/)).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('M6: administrador reprocessa com justificativa e mantém o identificador da entrega', async ({ page }) => {
  const user = account('ADMIN', 8); const id = randomUUID(); const orderId = randomUUID();
  await page.route('**/api/v1/admin/deliveries?page=0', route => route.fulfill({ json: [{ id, orderId, nickname: 'OfflineTest', state: 'REVIEW', attempts: 8, leaseUntil: null, nextAttempt: new Date().toISOString(), lastError: 'RETRY_LIMIT', createdAt: new Date().toISOString() }] }));
  let sent: unknown;
  await page.route('**/api/v1/admin/deliveries/' + id + '/retry', async route => { sent = route.request().postDataJSON(); await route.fulfill({ status: 204 }); });
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByLabel('Senha', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/conta/); await page.goto('/admin');
  await expect(page.getByText('OfflineTest', { exact: true })).toBeVisible();
  await page.getByLabel('Justificativa', { exact: true }).fill('Identidade conferida em ambiente de teste');
  await page.getByRole('button', { name: 'Solicitar reprocessamento', exact: true }).click();
  await expect(page.getByText('Reprocessamento solicitado. A entrega mantém o mesmo identificador.', { exact: true })).toBeVisible();
  expect(sent).toEqual({ reason: 'Identidade conferida em ambiente de teste' });
});
