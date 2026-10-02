import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
async function emailLink(email: string, route: string): Promise<string> {
  const directory = process.env.ATLAS_E2E_MAIL_DIRECTORY;
  if (!directory) throw new Error('Execute verify-local.py --web-tests.');
  let link = '';
  await expect
    .poll(
      () => {
        const files = readdirSync(directory)
          .filter((f) => f.endsWith('.eml'))
          .sort(
            (a, b) => statSync(join(directory, b)).mtimeMs - statSync(join(directory, a)).mtimeMs,
          );
        for (const file of files) {
          const text = readFileSync(join(directory, file), 'utf8');
          if (text.startsWith('To: ' + email + '\n') && text.includes(route)) {
            const match = text.match(/https?:\/\/[^\s]+#token=[A-Za-z0-9_-]+/);
            if (match) {
              const url = new URL(match[0]);
              link = url.pathname + url.hash;
              return true;
            }
          }
        }
        return false;
      },
      { timeout: 15000 },
    )
    .toBe(true);
  return link;
}
test('cadastro, confirmação, recuperação e revogação de sessão em outro navegador', async ({
  page,
  browser,
}) => {
  const email = randomUUID() + '@example.invalid';
  const password = randomUUID();
  const next = randomUUID();
  await page.goto('/cadastro');
  await page.getByLabel('Nickname').fill('Email test');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByLabel('Confirmar senha').fill(password);
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('email de confirmação');
  const verification = await emailLink(email, 'verificar-email');
  await page.goto(verification);
  await expect(page).toHaveURL(/verificar-email$/);
  await page.getByRole('button', { name: 'Confirmar email', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Email confirmado.');
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/conta/);
  await expect(page.getByRole('button', { name: 'Reenviar confirmação' })).toHaveCount(0);
  const other = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  try {
    const reset = await other.newPage();
    await reset.goto('/recuperar-senha');
    await reset.getByLabel('Email').fill(email);
    await reset.getByRole('button', { name: 'Enviar link' }).click();
    await expect(reset.getByRole('status')).toContainText('Se existir uma conta');
    await reset.goto(await emailLink(email, 'redefinir-senha'));
    await expect(reset).toHaveURL(/redefinir-senha$/);
    await reset.getByLabel('Nova senha', { exact: true }).fill(next);
    await reset.getByLabel('Confirmar senha').fill(next);
    await reset.getByRole('button', { name: 'Salvar nova senha' }).click();
    await expect(reset.getByRole('status')).toContainText('Senha atualizada');
    await page.reload();
    await expect(page).toHaveURL(/login/);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Senha', { exact: true }).fill(next);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page).toHaveURL(/conta/);
    await reset.goto(verification);
    await reset.getByRole('button', { name: 'Confirmar email', exact: true }).click();
    await expect(reset.getByRole('alert')).toContainText('inválido ou expirado');
  } finally {
    await other.close();
  }
});
test('armazenamento do navegador não concede ADMIN e links incompletos têm orientação', async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem(
      'atlas.mock.session',
      JSON.stringify({ id: 'forged', role: 'ADMIN', username: 'Injected' }),
    ),
  );
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/redefinir-senha');
  await expect(page.getByRole('alert')).toContainText('Link incompleto');
  await expect(page.getByRole('button', { name: 'Salvar nova senha' })).toBeDisabled();
});

for (const response of [
  {
    status: 200,
    contentType: 'text/html',
    body: '<!doctype html><html><body>Static SPA fallback</body></html>',
  },
  {
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({ code: 'DEPENDENCY_UNAVAILABLE' }),
  },
]) {
  test(`contas indisponíveis têm orientação e não aceitam senhas (${response.status})`, async ({
    page,
  }) => {
    await page.route('**/api/v1/**', (route) => route.fulfill(response));
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ['/login', '/cadastro', '/recuperar-senha']) {
      await page.goto(path);
      await expect(page.getByRole('status')).toContainText('temporariamente indisponíveis');
      await expect(page.locator('input[type="password"]')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    await page.goto('/loja');
    await expect(page.locator('h1')).toBeVisible();
  });
}
