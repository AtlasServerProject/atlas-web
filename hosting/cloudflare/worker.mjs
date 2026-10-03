const API_ORIGIN = 'https://api.atlascobblemon.com.br';
const ALLOWED_METHODS = new Set(['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS']);
const MAX_BODY = 65536;
function failure(status, code, message) {
  return Response.json({ code, message }, { status, headers: { 'Cache-Control': 'no-store' } });
}
export default {
  async fetch(request, env) {
    const incoming = new URL(request.url);
    if (incoming.pathname !== '/api' && !incoming.pathname.startsWith('/api/'))
      return env.ASSETS.fetch(request);
    if (!incoming.pathname.startsWith('/api/v1/'))
      return failure(404, 'NOT_FOUND', 'Recurso não encontrado.');
    if (!ALLOWED_METHODS.has(request.method))
      return failure(405, 'METHOD_NOT_ALLOWED', 'Método não permitido.');
    const headers = new Headers(request.headers);
    for (const name of [...headers.keys()]) {
      if (
        name.startsWith('x-forwarded-') ||
        [
          'host',
          'connection',
          'transfer-encoding',
          'content-length',
          'cf-connecting-ip',
          'cf-ray',
          'cf-worker',
          'forwarded',
        ].includes(name)
      )
        headers.delete(name);
    }
    try {
      // A fixed origin and normalized path keep caller-controlled hosts out of the proxy.
      const target = new URL(API_ORIGIN);
      target.pathname = incoming.pathname;
      target.search = incoming.search;
      let body;
      if (!['GET', 'HEAD'].includes(request.method)) {
        const length = request.headers.get('content-length');
        if (length && (!/^\d+$/.test(length) || Number(length) > MAX_BODY))
          return failure(413, 'PAYLOAD_TOO_LARGE', 'Requisição muito grande.');
        if (request.body) {
          const reader = request.body.getReader();
          const parts = [];
          let size = 0;
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            size += value.length;
            if (size > MAX_BODY) {
              await reader.cancel();
              return failure(413, 'PAYLOAD_TOO_LARGE', 'Requisição muito grande.');
            }
            parts.push(value);
          }
          body = new Uint8Array(size);
          let offset = 0;
          for (const part of parts) {
            body.set(part, offset);
            offset += part.length;
          }
        }
      }
      const upstream = await fetch(target, {
        method: request.method,
        headers,
        body,
        redirect: 'manual',
        signal: AbortSignal.timeout(15000),
        cache: 'no-store',
      });
      // API redirects must never forward session cookies to another origin.
      if ((upstream.status >= 300 && upstream.status < 400) || upstream.status >= 500) {
        await upstream.body?.cancel();
        return failure(503, 'DEPENDENCY_UNAVAILABLE', 'Serviço temporariamente indisponível.');
      }
      const responseHeaders = new Headers(upstream.headers);
      responseHeaders.set('Cache-Control', 'no-store');
      responseHeaders.delete('Location');
      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: responseHeaders,
      });
    } catch {
      return failure(503, 'DEPENDENCY_UNAVAILABLE', 'Serviço temporariamente indisponível.');
    }
  },
};
