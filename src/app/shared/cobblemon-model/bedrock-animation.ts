type Scalar = number | string;
type Vector = [Scalar, Scalar, Scalar];
type Frame =
  Vector | Scalar | { pre?: Vector | Scalar; post?: Vector | Scalar; lerp_mode?: string };
type Channel = Scalar | Vector | Record<string, Frame>;
export interface WalkAnimation {
  animation_length: number;
  bones: Record<string, { rotation?: Channel; position?: Channel; scale?: Channel }>;
}
type Expression = (time: number) => number;

// Only the arithmetic and degree-based Molang functions used by this asset.
// Parse once; never execute animation text as JavaScript.
function expression(value: Scalar): Expression {
  if (typeof value === 'number') return () => value;
  const normalized = value
    .toLowerCase()
    .replace(/query\./g, 'q.')
    .replace(/\s/g, '');
  const tokens =
    normalized.match(
      /q\.anim_time|math\.(?:sin|cos|clamp)|(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[()+*/,\-]/g,
    ) ?? [];
  if (tokens.join('') !== normalized) throw new Error('Unsupported animation expression');
  let cursor = 0;
  const expect = (token: string) => {
    if (tokens[cursor++] !== token) throw new Error('Invalid animation expression');
  };
  const primary = (): Expression => {
    const token = tokens[cursor++];
    if (token === '-') {
      const term = primary();
      return (t) => -term(t);
    }
    if (token === '+') return primary();
    if (token === '(') {
      const term = sum();
      expect(')');
      return term;
    }
    if (token === 'q.anim_time') return (t) => t;
    if (token?.startsWith('math.')) {
      expect('(');
      const first = sum();
      if (token === 'math.clamp') {
        expect(',');
        const minimum = sum();
        expect(',');
        const maximum = sum();
        expect(')');
        return (t) => Math.min(maximum(t), Math.max(minimum(t), first(t)));
      }
      expect(')');
      return token === 'math.sin'
        ? (t) => Math.sin((first(t) * Math.PI) / 180)
        : (t) => Math.cos((first(t) * Math.PI) / 180);
    }
    const number = Number(token);
    if (!Number.isFinite(number)) throw new Error('Invalid animation number');
    return () => number;
  };
  const product = (): Expression => {
    let left = primary();
    while (tokens[cursor] === '*' || tokens[cursor] === '/') {
      const operator = tokens[cursor++],
        right = primary(),
        previous = left;
      left = operator === '*' ? (t) => previous(t) * right(t) : (t) => previous(t) / right(t);
    }
    return left;
  };
  const sum = (): Expression => {
    let left = product();
    while (tokens[cursor] === '+' || tokens[cursor] === '-') {
      const operator = tokens[cursor++],
        right = product(),
        previous = left;
      left = operator === '+' ? (t) => previous(t) + right(t) : (t) => previous(t) - right(t);
    }
    return left;
  };
  const result = sum();
  if (cursor !== tokens.length) throw new Error('Invalid animation expression');
  return result;
}

export function compileChannel(
  channel: Channel,
  invalidAxis?: (value: Scalar) => number,
): (time: number) => [number, number, number] {
  const vector = (value: Scalar | Vector) =>
    (Array.isArray(value) ? value : [value, value, value]).map((value) => {
      try {
        return expression(value);
      } catch (error) {
        if (!invalidAxis) throw error;
        const fallback = invalidAxis(value);
        return () => fallback;
      }
    });
  if (typeof channel !== 'object' || Array.isArray(channel)) {
    const terms = vector(channel);
    return (time) => terms.map((term) => term(time)) as [number, number, number];
  }
  const frames = Object.entries(channel)
    .map(([time, value]) => {
      const frame =
        typeof value === 'object' && !Array.isArray(value) ? value : { pre: value, post: value };
      const pre = frame.pre ?? frame.post,
        post = frame.post ?? frame.pre;
      if (pre === undefined || post === undefined || !Number.isFinite(Number(time)))
        throw new Error('Invalid animation keyframe');
      return {
        time: Number(time),
        pre: vector(pre),
        post: vector(post),
        cubic: frame.lerp_mode === 'catmullrom',
      };
    })
    .sort((a, b) => a.time - b.time);
  if (!frames.length) throw new Error('Empty animation channel');
  return (time) => {
    const next = frames.findIndex((frame) => frame.time > time);
    const first = next === 0 ? frames[0] : frames[next < 0 ? frames.length - 1 : next - 1];
    const last = next <= 0 ? first : frames[next];
    if (first === last)
      return (next === 0 ? first.pre : first.post).map((term) => term(time)) as [
        number,
        number,
        number,
      ];
    const alpha = (time - first.time) / (last.time - first.time);
    return first.post.map((term, i) => {
      const a = term(time),
        b = last.pre[i](time);
      if (!first.cubic && !last.cubic) return a * (1 - alpha) + b * alpha;
      const before = frames[Math.max(0, next - 2)].post[i](time);
      const after = frames[Math.min(frames.length - 1, next + 1)].pre[i](time);
      return (
        0.5 *
        (2 * a +
          (-before + b) * alpha +
          (2 * before - 5 * a + 4 * b - after) * alpha ** 2 +
          (-before + 3 * a - 3 * b + after) * alpha ** 3)
      );
    }) as [number, number, number];
  };
}
