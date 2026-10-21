type Scalar = number | string;
type Vector = [Scalar, Scalar, Scalar];
type Channel = number | Vector | Record<string, Vector>;
export interface WalkAnimation { animation_length: number; bones: Record<string, { rotation?: Channel; position?: Channel; scale?: Channel }>; }
type Expression = (time: number) => number;

// Only the arithmetic and degree-based Molang functions used by this asset.
// Parse once; never execute animation text as JavaScript.
function expression(value: Scalar): Expression {
  if (typeof value === 'number') return () => value;
  const tokens = value.match(/q\.anim_time|math\.(?:sin|cos|clamp)|\d+(?:\.\d+)?|[()+*/,\-]/g) ?? [];
  if (tokens.join('') !== value.replace(/\s/g, '')) throw new Error('Unsupported animation expression');
  let cursor = 0;
  const expect = (token: string) => { if (tokens[cursor++] !== token) throw new Error('Invalid animation expression'); };
  const primary = (): Expression => {
    const token = tokens[cursor++];
    if (token === '-') { const term = primary(); return t => -term(t); }
    if (token === '+') return primary();
    if (token === '(') { const term = sum(); expect(')'); return term; }
    if (token === 'q.anim_time') return t => t;
    if (token?.startsWith('math.')) {
      expect('('); const first = sum();
      if (token === 'math.clamp') {
        expect(','); const minimum = sum(); expect(','); const maximum = sum(); expect(')');
        return t => Math.min(maximum(t), Math.max(minimum(t), first(t)));
      }
      expect(')');
      return token === 'math.sin' ? t => Math.sin(first(t) * Math.PI / 180) : t => Math.cos(first(t) * Math.PI / 180);
    }
    const number = Number(token);
    if (!Number.isFinite(number)) throw new Error('Invalid animation number');
    return () => number;
  };
  const product = (): Expression => {
    let left = primary();
    while (tokens[cursor] === '*' || tokens[cursor] === '/') {
      const operator = tokens[cursor++], right = primary(), previous = left;
      left = operator === '*' ? t => previous(t) * right(t) : t => previous(t) / right(t);
    }
    return left;
  };
  const sum = (): Expression => {
    let left = product();
    while (tokens[cursor] === '+' || tokens[cursor] === '-') {
      const operator = tokens[cursor++], right = product(), previous = left;
      left = operator === '+' ? t => previous(t) + right(t) : t => previous(t) - right(t);
    }
    return left;
  };
  const result = sum();
  if (cursor !== tokens.length) throw new Error('Invalid animation expression');
  return result;
}

export function compileChannel(channel: Channel): (time: number) => [number, number, number] {
  const vector = (value: number | Vector) => (typeof value === 'number' ? [value, value, value] : value).map(expression);
  if (typeof channel === 'number' || Array.isArray(channel)) {
    const terms = vector(channel);
    return time => terms.map(term => term(time)) as [number, number, number];
  }
  const frames = Object.entries(channel).map(([time, value]) => ({ time: Number(time), terms: vector(value) })).sort((a, b) => a.time - b.time);
  if (!frames.length) throw new Error('Empty animation channel');
  return time => {
    const next = frames.findIndex(frame => frame.time > time);
    const first = next === 0 ? frames[0] : frames[next < 0 ? frames.length - 1 : next - 1];
    const last = next <= 0 ? first : frames[next];
    const alpha = last.time === first.time ? 0 : (time - first.time) / (last.time - first.time);
    return first.terms.map((term, i) => term(time) * (1 - alpha) + last.terms[i](time) * alpha) as [number, number, number];
  };
}
