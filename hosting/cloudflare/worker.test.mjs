import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.mjs';
const request = (path, options) => new Request('https://atlascobblemon.com.br' + path, options);
async function usingFetch(mock, action) {
  const original = globalThis.fetch;
  globalThis.fetch = mock;
  try {
    await action();
  } finally {
    globalThis.fetch = original;
  }
}
test('static resources bypass API and remain available with VM offline', async () => {
  const response = await worker.fetch(request('/loja'), {
    ASSETS: { fetch: async () => new Response('static site') },
  });
  assert.equal(await response.text(), 'static site');
});
test('login preserves body, CSRF, session cookies and individual Set-Cookie headers', async () => {
  await usingFetch(
    async (url, options) => {
      assert.equal(url.toString(), 'https://api.atlascobblemon.com.br/api/v1/auth/login');
      assert.equal(options.method, 'POST');
      assert.equal(options.redirect, 'manual');
      assert.equal(options.headers.get('cookie'), 'ATLAS_SESSION=fixture');
      assert.equal(options.headers.get('x-csrf-token'), 'test-csrf');
      assert.equal(options.headers.get('x-forwarded-host'), null);
      assert.equal(new TextDecoder().decode(options.body), '{"test":true}');
      const headers = new Headers();
      headers.append(
        'Set-Cookie',
        'ATLAS_SESSION=newfixture; Path=/; Secure; HttpOnly; SameSite=Lax',
      );
      headers.append('Set-Cookie', 'other=fixture; Path=/; Secure');
      headers.set('Cache-Control', 'public, max-age=9999');
      return new Response('{"ok":true}', { headers });
    },
    async () => {
      const result = await worker.fetch(
        request('/api/v1/auth/login', {
          method: 'POST',
          body: '{"test":true}',
          headers: {
            cookie: 'ATLAS_SESSION=fixture',
            'x-csrf-token': 'test-csrf',
            'x-forwarded-host': 'evil.invalid',
          },
        }),
        {},
      );
      assert.equal(result.status, 200);
      assert.equal(result.headers.get('Cache-Control'), 'no-store');
      assert.equal(result.headers.getSetCookie().length, 2);
    },
  );
});
test('payment webhook retains signature, request ID and query unchanged', async () => {
  await usingFetch(
    async (url, options) => {
      assert.equal(
        url.toString(),
        'https://api.atlascobblemon.com.br/api/v1/webhooks/mercadopago?data.id=123&type=payment',
      );
      assert.equal(options.headers.get('x-signature'), 'signed-fixture');
      assert.equal(options.headers.get('x-request-id'), 'fixture-id');
      return new Response(null, { status: 200 });
    },
    async () => {
      const result = await worker.fetch(
        request('/api/v1/webhooks/mercadopago?data.id=123&type=payment', {
          method: 'POST',
          body: '{}',
          headers: { 'x-signature': 'signed-fixture', 'x-request-id': 'fixture-id' },
        }),
        {},
      );
      assert.equal(result.status, 200);
    },
  );
});
test('untrusted hosts never change destination, and redirects do not forward authentication', async () => {
  await usingFetch(
    async (url) => {
      assert.equal(url.origin, 'https://api.atlascobblemon.com.br');
      return new Response(null, {
        status: 302,
        headers: { Location: 'https://evil.invalid', 'Set-Cookie': 'sensitive=fixture' },
      });
    },
    async () => {
      const result = await worker.fetch(request('/api/v1/users/me?host=https://evil.invalid'), {});
      assert.equal(result.status, 503);
      assert.equal(result.headers.get('Location'), null);
      assert.equal(result.headers.get('Set-Cookie'), null);
    },
  );
});
test('oversized body and unimplemented API routes never reach the server', async () => {
  await usingFetch(
    () => {
      throw new Error('must not proxy');
    },
    async () => {
      assert.equal((await worker.fetch(request('/api/v2/users'), {})).status, 404);
      assert.equal(
        (
          await worker.fetch(
            request('/api/v1/auth/register', { method: 'POST', body: 'x'.repeat(65537) }),
            {},
          )
        ).status,
        413,
      );
      assert.equal(
        (await worker.fetch(request('/api/v1/test', { method: 'PUT' }), {})).status,
        405,
      );
    },
  );
});
test('network failure returns a recoverable API error without exception details', async () => {
  await usingFetch(
    () => {
      throw new Error('private network info');
    },
    async () => {
      const result = await worker.fetch(request('/api/v1/system'), {});
      assert.equal(result.status, 503);
      assert.equal((await result.json()).code, 'DEPENDENCY_UNAVAILABLE');
    },
  );
});

test('upstream outage hides gateway error details and returns API 503', async () => {
  await usingFetch(
    async () => new Response('Cloudflare 1016 internal diagnostic', { status: 530 }),
    async () => {
      const result = await worker.fetch(request('/api/v1/system'), {});
      assert.equal(result.status, 503);
      assert.equal((await result.json()).code, 'DEPENDENCY_UNAVAILABLE');
    },
  );
});
