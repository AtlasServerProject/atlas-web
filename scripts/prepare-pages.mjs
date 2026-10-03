import { readFile, writeFile, copyFile, rm } from 'node:fs/promises';
const output = new URL('../dist/atlas-web/browser/', import.meta.url);
await readFile(new URL('index.html', output));
await copyFile(
  new URL('../hosting/cloudflare/worker.mjs', import.meta.url),
  new URL('_worker.js', output),
);
await writeFile(
  new URL('_routes.json', output),
  JSON.stringify({ version: 1, include: ['/api', '/api/*'], exclude: [] }, null, 2) + '\n',
);
// Netlify's external proxy syntax does not apply to Pages. API routing is handled by the Worker.
await rm(new URL('_redirects', output), { force: true });
console.log('Cloudflare Pages build prepared; API origin: api.atlascobblemon.com.br');
