import { test, expect } from '@playwright/test';

const widths = [1920, 1440, 1366, 1024, 768, 430, 390, 360];
for (const width of widths) {
  test(`quatro rotas sem overflow e erros — ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (
        message.type() === 'error' &&
        !(message.location().url.includes('/api/v1/users/me') && message.text().includes('401'))
      )
        errors.push(message.text());
    });
    for (const route of ['/', '/how-to-play', '/notices', '/store']) {
      await page.goto(route);
      await expect(page.locator('h1')).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        .toBe(true);
      const first = page.locator('h1');
      const rect = await first.boundingBox();
      expect(rect!.y).toBeGreaterThan(70);
    }
    expect(errors).toEqual([]);
  });
}

test('modal de acesso: endereço ausente, foco, Escape, botão e backdrop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const trigger = page.locator('.hero-copy .button').first();
  await trigger.click();
  const dialog = page.locator('.play-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Acesso público em preparação');
  await expect(dialog.getByRole('button', { name: 'Copiar IP' })).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() => document.querySelector('.play-dialog')?.contains(document.activeElement)),
    )
    .toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole('button', { name: 'Fechar acesso ao Atlas' }).click();
  await expect(dialog).not.toBeVisible();
  await trigger.click();
  await expect(dialog).toBeVisible();
  await page.mouse.click(5, 500);
  await expect(dialog).not.toBeVisible();
});

test('IP configurado: cópia com sucesso e falha tratada', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.route('**/site-settings.json', (r) =>
    r.fulfill({ json: { serverAddress: 'test.example.invalid:25565', heroVideo: null } }),
  );
  await page.goto('/');
  await page.locator('.hero-copy .button').first().click();
  await page.getByRole('button', { name: 'Copiar IP' }).click();
  await expect(page.getByRole('status')).toContainText('IP copiado');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'test.example.invalid:25565',
  );
  await page.evaluate(() => {
    Object.defineProperty(navigator.clipboard, 'writeText', {
      value: () => Promise.reject(new Error('Denied')),
    });
  });
  await page.getByRole('button', { name: 'Copiar IP' }).click();
  await expect(page.getByRole('status')).toContainText('copie manualmente');
});

test('menu mobile: teclado, scroll bloqueado, fechamento e navegação', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Abrir menu' });
  await trigger.click();
  const menu = page.locator('.mobile-menu');
  await expect(menu).toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden');
  for (let i = 0; i < 13; i++) {
    await page.keyboard.press('Tab');
    expect(
      await page.evaluate(() =>
        document.querySelector('.mobile-menu')?.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(menu).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole('button', { name: 'Fechar menu', exact: true }).click();
  await expect(menu).not.toBeVisible();
  await trigger.click();
  await page.mouse.click(3, 500);
  await expect(menu).not.toBeVisible();
  await trigger.click();
  await menu.getByRole('link', { name: 'Loja' }).click();
  await expect(page).toHaveURL(/store/);
  await expect(menu).not.toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe('hidden');
});

test('scroll reveal, parallax e navbar acompanham a Home', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.locator('header.site-header')).not.toHaveClass(/solid/);
  await page.locator('.desktop-nav a').filter({ hasText: 'Recursos' }).click();
  await expect(page.locator('#recursos .card').first()).toHaveClass(/is-visible/);
  await expect(page.locator('.desktop-nav a').filter({ hasText: 'Recursos' })).toHaveClass(
    /active/,
  );
  await expect(page.locator('header.site-header')).toHaveClass(/solid/);
  await page.locator('.panorama').scrollIntoViewIfNeeded();
  await expect
    .poll(() => page.locator('.panorama').evaluate((e) => e.style.getPropertyValue('--parallax')))
    .not.toBe('');
});

test('loja preserva preços, nove kits e ampliação', async ({ page }) => {
  await page.goto('/store');
  const prices = ['R$ 25,00', 'R$ 35,00', 'R$ 50,00'];
  for (let i = 0; i < 3; i++) {
    await expect(page.locator('.plan-card').nth(i)).toContainText(prices[i]);
    await page.locator('.plan-card').nth(i).getByRole('button', { name: /kits/ }).click();
    await expect(page.locator('.kit-card')).toHaveCount(3);
    for (let k = 0; k < 3; k++) {
      const image = page.locator('.kit-preview img').nth(k);
      await image.scrollIntoViewIfNeeded();
      await expect
        .poll(() => image.evaluate((e) => (e as HTMLImageElement).naturalWidth))
        .toBeGreaterThan(0);
      await page.locator('.kit-preview').nth(k).click();
      await expect(page.locator('.kit-dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('.kit-dialog')).not.toBeVisible();
    }
  }
  await expect(page.locator('.page-intro')).toContainText('sujeitos a alteração');
});

test('redução de movimento e economia de dados não carregam vídeo', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/site-settings.json', (r) =>
    r.fulfill({ json: { serverAddress: null, heroVideo: '/media/test.webm' } }),
  );
  await page.goto('/');
  await expect(page.locator('.hero-poster')).toBeVisible();
  await expect(page.locator('video')).toHaveCount(0);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe(
    'auto',
  );
  await page.locator('#recursos').scrollIntoViewIfNeeded();
  await expect(page.locator('#recursos .card').first()).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'connection', { value: { saveData: true } }),
  );
  await page.reload();
  await expect(page.locator('video')).toHaveCount(0);
});

test('vídeo inválido mantém poster sem bloquear Jogar', async ({ page }) => {
  await page.route('**/site-settings.json', (r) =>
    r.fulfill({ json: { serverAddress: null, heroVideo: '/media/test.webm' } }),
  );
  await page.route('**/media/test.webm', (r) =>
    r.fulfill({ status: 200, contentType: 'video/webm', body: 'not-a-video' }),
  );
  await page.goto('/');
  await expect(page.locator('.hero-poster')).toBeVisible();
  await expect(page.locator('video')).toHaveCount(0);
  await page.locator('.hero-copy .button').first().click();
  await expect(page.locator('.play-dialog')).toBeVisible();
});

test('rotas e títulos preservados via Router', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.locator('.desktop-nav').getByRole('link', { name: 'Novidades', exact: true }).click();
  await expect(page).toHaveTitle('Novidades | Atlas Cobblemon');
  await page.locator('.desktop-nav').getByRole('link', { name: 'Como jogar', exact: true }).click();
  await expect(page).toHaveTitle('Como jogar | Atlas Cobblemon');
  await page.locator('summary').first().click();
  await expect(page.locator('details').first()).toHaveAttribute('open', '');
});

test('vídeo: reprodução sem áudio, pausa e troca para imagem', async ({ page }) => {
  // Pequeno vídeo sintético gerado apenas para testar o player, nunca publicado como arte Atlas.
  await page.goto('/');
  const bytes = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#13432a';
    context.fillRect(0, 0, 64, 64);
    const stream = canvas.captureStream(10);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks: Blob[] = [];
    return await new Promise<number[]>((resolve) => {
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        for (const track of stream.getTracks()) track.stop();
        resolve(Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer())));
      };
      recorder.start();
      setTimeout(() => {
        context.fillStyle = '#90ab46';
        context.fillRect(5, 5, 32, 32);
      }, 150);
      setTimeout(() => recorder.stop(), 650);
    });
  });
  await page.route('**/site-settings.json', (r) =>
    r.fulfill({ json: { serverAddress: null, heroVideo: '/media/test.webm' } }),
  );
  await page.route('**/media/test.webm', (r) =>
    r.fulfill({ contentType: 'video/webm', body: Buffer.from(bytes) }),
  );
  await page.reload();
  const video = page.locator('video');
  await expect(video).toHaveClass(/loaded/);
  expect(await video.evaluate((v) => (v as HTMLVideoElement).muted)).toBe(true);
  await page.getByRole('button', { name: 'Pausar vídeo de fundo' }).click();
  expect(await video.evaluate((v) => (v as HTMLVideoElement).paused)).toBe(true);
  await page.getByRole('button', { name: 'Reproduzir vídeo de fundo' }).click();
  await expect.poll(() => video.evaluate((v) => (v as HTMLVideoElement).paused)).toBe(false);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(video).toHaveCount(0);
  await expect(page.locator('.hero-poster')).toBeVisible();
});
