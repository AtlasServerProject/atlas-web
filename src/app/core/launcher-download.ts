const PUBLIC_KEY = 'MCowBQYDK2VwAyEASKDfWWuo6YlQ6YvyqKZVIaHdFbKPFkVOYdDUtLjQMLM=';
const unbase64 = (value: string) => Uint8Array.from(atob(value), x => x.charCodeAt(0));
const hex = (value: ArrayBuffer) => Array.from(new Uint8Array(value), x => x.toString(16).padStart(2, '0')).join('');
export async function downloadAtlasLauncher(onProgress: (percent: number) => void, signal: AbortSignal) {
  const response = await fetch('/launcher/windows/latest.json', {cache: 'no-store', signal, redirect: 'error'});
  if (!response.ok) throw new Error('Catálogo indisponível.');
  const envelope = await response.json();
  if (envelope.keyId !== 'atlas-release-2026' || typeof envelope.payload !== 'string' || envelope.payload.length > 700000 || typeof envelope.signature !== 'string') throw new Error('Manifesto inválido.');
  const payload = unbase64(envelope.payload);
  const key = await crypto.subtle.importKey('spki', unbase64(PUBLIC_KEY), {name: 'Ed25519'}, false, ['verify']);
  if (!await crypto.subtle.verify('Ed25519', key, unbase64(envelope.signature), payload)) throw new Error('Assinatura inválida.');
  const release = JSON.parse(new TextDecoder().decode(payload));
  if (release.schemaVersion !== 2 || release.platform !== 'win32-x64' || !Number.isSafeInteger(release.size) || release.size < 1 || release.size > 1024 ** 3 || !/^Atlas-Launcher-[0-9A-Za-z.+-]+-Setup-x64\.exe$/.test(release.filename) || !Array.isArray(release.parts) || release.parts.length < 1 || release.parts.length > 128 || !/^[a-f0-9]{64}$/.test(release.sha256)) throw new Error('Pacote inválido.');
  let total = 0; const seen = new Set<string>();
  for (const part of release.parts) {
    if (!/^launcher\/files\/[0-9A-Za-z.+-]+\/[0-9]{3}\.bin$/.test(part.path) || seen.has(part.path) || !Number.isSafeInteger(part.size) || part.size < 1 || part.size > 20 * 1024 ** 2 || !/^[a-f0-9]{64}$/.test(part.sha256)) throw new Error('Parte inválida.');
    seen.add(part.path); total += part.size;
  }
  if (total !== release.size) throw new Error('Tamanho inválido.');
  const output = new Uint8Array(release.size); let offset = 0;
  for (const part of release.parts) {
    const response = await fetch('/' + part.path, {signal, redirect: 'error'});
    if (!response.ok) throw new Error('Download indisponível.');
    const data = await response.arrayBuffer();
    if (data.byteLength !== part.size || hex(await crypto.subtle.digest('SHA-256', data)) !== part.sha256) throw new Error('Arquivo inválido.');
    output.set(new Uint8Array(data), offset); offset += data.byteLength; onProgress(Math.round(offset / release.size * 100));
  }
  signal.throwIfAborted();
  if (hex(await crypto.subtle.digest('SHA-256', output)) !== release.sha256) throw new Error('Pacote inválido.');
  return {filename: release.filename as string, blob: new Blob([output], {type: 'application/octet-stream'})};
}
