// Exact rational arithmetic (BigInt) and exact linear algebra used by the
// equation balancer and the Hess's law solver. Exact arithmetic avoids the
// floating-point drift that would make "nearly integer" coefficients wrong.

const babs = (a) => (a < 0n ? -a : a);
export function bgcd(a, b) {
  a = babs(a);
  b = babs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}
export function blcm(a, b) {
  return a === 0n || b === 0n ? 0n : babs(a * b) / bgcd(a, b);
}

export class Frac {
  constructor(n, d = 1n) {
    n = BigInt(n);
    d = BigInt(d);
    if (d === 0n) throw new Error('Division by zero in fraction.');
    if (d < 0n) {
      n = -n;
      d = -d;
    }
    const g = bgcd(n, d) || 1n;
    this.n = n / g;
    this.d = d / g;
  }
  static from(x) {
    if (x instanceof Frac) return x;
    if (typeof x === 'bigint') return new Frac(x);
    if (Number.isInteger(x)) return new Frac(BigInt(x));
    // finite decimal -> exact fraction of its decimal representation
    const s = String(x);
    if (/e/i.test(s)) throw new Error('Cannot convert exponent notation to exact fraction.');
    const [i, f = ''] = s.split('.');
    return new Frac(BigInt(i + f), 10n ** BigInt(f.length));
  }
  add(o) { return new Frac(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { return new Frac(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { return new Frac(this.n * o.n, this.d * o.d); }
  div(o) { return new Frac(this.n * o.d, this.d * o.n); }
  neg() { return new Frac(-this.n, this.d); }
  isZero() { return this.n === 0n; }
  sign() { return this.n === 0n ? 0 : this.n > 0n ? 1 : -1; }
  toNumber() { return Number(this.n) / Number(this.d); }
  toString() { return this.d === 1n ? `${this.n}` : `${this.n}/${this.d}`; }
}

/**
 * Reduced row echelon form of a matrix of Frac (in place copy).
 * @returns {{ m: Frac[][], pivots: number[] }}
 */
export function rref(matrix) {
  const m = matrix.map((r) => r.map(Frac.from));
  const rows = m.length;
  const cols = rows ? m[0].length : 0;
  const pivots = [];
  let r = 0;
  for (let c = 0; c < cols && r < rows; c++) {
    let p = r;
    while (p < rows && m[p][c].isZero()) p++;
    if (p === rows) continue;
    [m[r], m[p]] = [m[p], m[r]];
    const pv = m[r][c];
    m[r] = m[r].map((x) => x.div(pv));
    for (let i = 0; i < rows; i++) {
      if (i !== r && !m[i][c].isZero()) {
        const f = m[i][c];
        m[i] = m[i].map((x, j) => x.sub(f.mul(m[r][j])));
      }
    }
    pivots.push(c);
    r++;
  }
  return { m, pivots };
}

/** Basis of the null space of A (A·x = 0), each vector as Frac[]. */
export function nullspace(A) {
  const cols = A[0].length;
  const { m, pivots } = rref(A);
  const free = [];
  for (let c = 0; c < cols; c++) if (!pivots.includes(c)) free.push(c);
  return free.map((f) => {
    const vec = Array.from({ length: cols }, () => new Frac(0n));
    vec[f] = new Frac(1n);
    pivots.forEach((pc, row) => {
      vec[pc] = m[row][f].neg();
    });
    return vec;
  });
}

/** Scale a rational vector to the smallest integers (sign kept). */
export function toIntegers(vec) {
  let l = 1n;
  for (const x of vec) l = blcm(l, x.d);
  let ints = vec.map((x) => (x.n * l) / x.d);
  let g = 0n;
  for (const x of ints) g = bgcd(g, x);
  if (g > 1n) ints = ints.map((x) => x / g);
  return ints;
}

/**
 * Solve A·x = b exactly. Returns { status: 'unique'|'none'|'infinite', x?: Frac[] }.
 */
export function solveLinear(A, b) {
  const aug = A.map((row, i) => [...row, b[i]]);
  const cols = A[0].length;
  const { m, pivots } = rref(aug);
  if (pivots.includes(cols)) return { status: 'none' };
  if (pivots.length < cols) return { status: 'infinite' };
  const x = Array.from({ length: cols }, () => new Frac(0n));
  pivots.forEach((pc, row) => (x[pc] = m[row][cols]));
  return { status: 'unique', x };
}
