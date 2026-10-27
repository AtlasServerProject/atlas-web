import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
const directory = await mkdtemp(join(tmpdir(), 'atlas-animation-test-'));
const source = await readFile(
  new URL('../src/app/shared/cobblemon-model/bedrock-animation.ts', import.meta.url),
  'utf8',
);
const filename = join(directory, 'animation.mjs');
await writeFile(
  filename,
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText,
);
const { compileChannel } = await import(pathToFileURL(filename));
after(() => rm(directory, { recursive: true, force: true }));
test('Molang uses degree trigonometry and supports query aliases and case', () => {
  assert.deepEqual(
    compileChannel(['Math.Sin(query.anim_time*90)', 'math.cos(q.anim_time*180)', '.5 + 1e-2'])(1),
    [1, -1, 0.51],
  );
  assert.deepEqual(compileChannel('1-math.sin(q.anim_time*90)*.1')(1), [0.9, 0.9, 0.9]);
  assert.deepEqual(compileChannel(['math.clamp(-2, 0, 1)', 0, 1])(0), [0, 0, 1]);
});
test('keyframes preserve pre/post discontinuities and cubic interpolation', () => {
  const channel = compileChannel({
    0: { post: [0, 0, 0], lerp_mode: 'catmullrom' },
    1: { pre: [10, 10, 10], post: [20, 20, 20] },
    2: [30, 30, 30],
  });
  assert.deepEqual(channel(0), [0, 0, 0]);
  assert.deepEqual(channel(1), [20, 20, 20]);
  assert.deepEqual(channel(2), [30, 30, 30]);
  assert(channel(0.5)[0] > 0 && channel(0.5)[0] < 10);
  assert.deepEqual(compileChannel({ 0: [0, 0, 0], 2: [10, 20, 30] })(1), [5, 10, 15]);
});
test('animation assets cannot execute code or arbitrary property access', () => {
  for (const value of [
    'globalThis.fetch("https://example.com")',
    'q.anim_time.constructor',
    '1;alert(1)',
    'Math.random()',
    'sin(90)',
    'q.anim_time+',
    'math.sin(3))',
  ])
    assert.throws(() => compileChannel([value, 0, 0]));
});
test('malformed source axes can hold at rest without losing other channels', () => {
  assert.throws(() => compileChannel(['math.sin(90))', 2, 3]));
  assert.deepEqual(compileChannel(['math.sin(90))', 2, 3], () => 0)(1), [0, 2, 3]);
});
test('existing Torterra animation channels still compile and sample', async () => {
  const walk = JSON.parse(
    await readFile(new URL('../public/pokemon/torterra/walk.json', import.meta.url)),
  );
  let count = 0;
  for (const tracks of Object.values(walk.bones))
    for (const channel of Object.values(tracks)) {
      const sample = compileChannel(channel);
      for (const time of [0, 0.1, 0.5, 1, 2, 4]) assert(sample(time).every(Number.isFinite));
      count++;
    }
  assert(count > 10);
});
