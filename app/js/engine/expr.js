// Safe scientific expression evaluator for the calculator page.
// A hand-written tokenizer and recursive-descent parser: user input is never
// passed to eval(), Function() or any dynamic code execution.
import { ChemError } from './errors.js';

const MAX_LEN = 200;
const MAX_DEPTH = 40;

const CONSTS = {
  pi: Math.PI, 'π': Math.PI, e: Math.E,
  NA: 6.02214076e23, R: 8.314462618, kB: 1.380649e-23, h: 6.62607015e-34, c: 299792458,
};

function fact(n) {
  if (!Number.isInteger(n) || n < 0) throw new ChemError('Factorial needs a whole number ≥ 0.');
  if (n > 170) throw new ChemError('Factorial too large.');
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

const FUNCS = (deg) => {
  const toRad = (x) => (deg ? (x * Math.PI) / 180 : x);
  const fromRad = (x) => (deg ? (x * 180) / Math.PI : x);
  return {
    sqrt: [1, (x) => { if (x < 0) throw new ChemError('Square root of a negative number is not a real number.'); return Math.sqrt(x); }],
    cbrt: [1, Math.cbrt],
    log: [1, (x) => { if (x <= 0) throw new ChemError('log is only defined for positive numbers.'); return Math.log10(x); }],
    ln: [1, (x) => { if (x <= 0) throw new ChemError('ln is only defined for positive numbers.'); return Math.log(x); }],
    exp: [1, Math.exp],
    abs: [1, Math.abs],
    sin: [1, (x) => Math.sin(toRad(x))],
    cos: [1, (x) => Math.cos(toRad(x))],
    tan: [1, (x) => Math.tan(toRad(x))],
    asin: [1, (x) => fromRad(Math.asin(x))],
    acos: [1, (x) => fromRad(Math.acos(x))],
    atan: [1, (x) => fromRad(Math.atan(x))],
    antilog: [1, (x) => 10 ** x],
  };
};

export function tokenize(src) {
  const s = String(src ?? '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/√/g, 'sqrt');
  if (s.length > MAX_LEN) throw new ChemError(`Expression too long (maximum ${MAX_LEN} characters).`);
  const out = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }
    const num = s.slice(i).match(/^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/);
    if (num) {
      out.push({ t: 'num', v: Number(num[0]) });
      i += num[0].length;
      continue;
    }
    const id = s.slice(i).match(/^([A-Za-zπ][A-Za-z]*)/);
    if (id) { out.push({ t: 'id', v: id[0] }); i += id[0].length; continue; }
    if ('+-*/^()!,%'.includes(ch)) { out.push({ t: 'op', v: ch }); i++; continue; }
    throw new ChemError(`Unexpected character "${ch}" in expression.`);
  }
  return out;
}

/** Evaluate an expression string. opts: { deg: boolean, ans: number } */
export function evaluate(src, opts = {}) {
  const toks = tokenize(src);
  if (toks.length === 0) throw new ChemError('Enter an expression.');
  const F = FUNCS(!!opts.deg);
  let p = 0, depth = 0;
  const peek = () => toks[p];
  const isOp = (v) => peek() && peek().t === 'op' && peek().v === v;
  const expect = (v) => { if (!isOp(v)) throw new ChemError(`Expected "${v}".`); p++; };

  function expr() {
    if (++depth > MAX_DEPTH) throw new ChemError('Expression is nested too deeply.');
    let v = term();
    while (isOp('+') || isOp('-')) {
      const op = toks[p++].v;
      const r = term();
      v = op === '+' ? v + r : v - r;
    }
    depth--;
    return v;
  }
  function term() {
    let v = unary();
    for (;;) {
      if (isOp('*') || isOp('/')) {
        const op = toks[p++].v;
        const r = unary();
        if (op === '/' && r === 0) throw new ChemError('Division by zero.');
        v = op === '*' ? v * r : v / r;
      } else if (peek() && (peek().t === 'num' || peek().t === 'id' || isOp('('))) {
        v *= unary(); // implicit multiplication: 2pi, 3(4+1)
      } else break;
    }
    return v;
  }
  function unary() {
    if (isOp('-')) { p++; return -unary(); }
    if (isOp('+')) { p++; return unary(); }
    return power();
  }
  function power() {
    const base = postfix();
    if (isOp('^')) {
      p++;
      const ex = unary();
      const r = base ** ex;
      if (Number.isNaN(r)) throw new ChemError('That power is not a real number (negative base with a fractional exponent).');
      return r;
    }
    return base;
  }
  function postfix() {
    let v = primary();
    for (;;) {
      if (isOp('!')) { p++; v = fact(v); } else if (isOp('%')) { p++; v = v / 100; } else break;
    }
    return v;
  }
  function primary() {
    const t = peek();
    if (!t) throw new ChemError('The expression ends too early.');
    if (t.t === 'num') { p++; return t.v; }
    if (t.t === 'op' && t.v === '(') {
      p++;
      const v = expr();
      expect(')');
      return v;
    }
    if (t.t === 'id') {
      p++;
      if (t.v === 'ans') {
        if (opts.ans === undefined || opts.ans === null) throw new ChemError('There is no previous answer yet.');
        return opts.ans;
      }
      if (Object.prototype.hasOwnProperty.call(F, t.v)) {
        if (!isOp('(')) {
          // allow "sqrt 9" style: function applied to the next unary
          return F[t.v][1](unary());
        }
        p++;
        const a = expr();
        expect(')');
        return F[t.v][1](a);
      }
      if (Object.prototype.hasOwnProperty.call(CONSTS, t.v)) return CONSTS[t.v];
      throw new ChemError(`Unknown name "${t.v}". Available functions: sqrt, log, ln, exp, abs, sin, cos, tan; constants: pi, e, NA, R.`);
    }
    throw new ChemError(`Unexpected "${t.v}".`);
  }

  const v = expr();
  if (p < toks.length) throw new ChemError(`Unexpected "${toks[p].v}" — check the brackets and operators.`);
  if (!Number.isFinite(v)) throw new ChemError('The result is too large or undefined.');
  return v;
}
