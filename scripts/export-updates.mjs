import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';

// Compile the same editorial source used by Angular; no second copy to maintain.
const source = await readFile(new URL('../src/app/pages/notices/patch-notes.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
});
const { patchNotes } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const ids = new Set();
for (const note of patchNotes) {
  if (!/^[a-z0-9-]{1,60}$/.test(note.id) || ids.has(note.id)) throw new Error('ID de novidade inválido ou duplicado.');
  ids.add(note.id);
}
await writeFile(new URL('../public/updates.json', import.meta.url), JSON.stringify({
  schemaVersion: 1,
  notes: patchNotes,
}, null, 2) + '\n');
console.log(`${patchNotes.length} novidades exportadas para /updates.json.`);
