// Number parsing, significant figures and display formatting.
import { ChemError } from './errors.js';

/**
 * Parse a user-entered measurement string.
 * Accepts: "25", "-3.50", "6.022e23", "6.022E-3", "6.022x10^23", "6.022×10^23", "6.022*10^23".
 * Returns { value, sf, decimals, ambiguous } where sf is the count of significant figures.
 */
// Remembers how recently parsed values were typed (e.g. "2.00"), so "Given values"
// can show them exactly as entered instead of a re-formatted number.
const ENTERED = new Map();
export function enteredText(value) { return ENTERED.get(value); }

export function parseMeasured(input, label = 'value') {
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) throw new ChemError(`${label} must be a finite number.`);
    return { value: input, sf: countSigFigs(String(input)).sf, decimals: decimalsOf(String(input)), ambiguous: false };
  }
  let s = String(input ?? '').trim().replace(/\s+/g, '').replace(/,/g, '');
  if (s === '') throw new ChemError(`Enter a number for ${label}.`);
  if (s.length > 40) throw new ChemError(`${label} is too long to be a number.`);
  // normalise "x10^n" style scientific notation to e-notation
  s = s.replace(/[x×*]10\^\(?([+-]?\d+)\)?$/i, 'e$1').replace(/−/g, '-');
  if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) {
    throw new ChemError(`"${String(input).slice(0, 40)}" is not a valid number for ${label}. Use digits, a decimal point and optional scientific notation like 6.02e23.`);
  }
  const value = Number(s);
  if (!Number.isFinite(value)) throw new ChemError(`${label} is outside the range this calculator can handle.`);
  const { sf, ambiguous } = countSigFigs(s);
  // Trailing zeros without a decimal point (e.g. "100") are ambiguous. Students usually
  // mean them as measured digits, so they are counted as significant, and the solution
  // shows a note explaining how to write the value if fewer figures were intended.
  if (ENTERED.size > 500) ENTERED.clear();
  ENTERED.set(value, String(input).trim());
  const full = ambiguous ? s.replace(/^[+-]/, '').split(/e/i)[0].replace(/^0+/, '').length : sf;
  return { value, sf: full, decimals: decimalsOf(s), ambiguous };
}

/** Count significant figures in a numeric string (standard textbook rules). */
export function countSigFigs(str) {
  let s = String(str).trim().replace(/^[+-]/, '');
  let mant = s.split(/e/i)[0];
  if (/^0*\.?0*$/.test(mant)) {
    // the value zero: count zeros after the decimal point, minimum 1
    const dec = mant.includes('.') ? mant.split('.')[1].length : 0;
    return { sf: Math.max(1, dec), ambiguous: false };
  }
  if (mant.includes('.')) {
    const digits = mant.replace('.', '').replace(/^0+/, '');
    return { sf: digits.length, ambiguous: false };
  }
  // no decimal point: trailing zeros are ambiguous (e.g. 1200)
  const stripped = mant.replace(/^0+/, '');
  const noTrail = stripped.replace(/0+$/, '');
  return { sf: noTrail.length, ambiguous: noTrail.length !== stripped.length };
}

/** Number of digits after the decimal point, accounting for e-notation. */
export function decimalsOf(str) {
  const s = String(str).toLowerCase();
  const [mant, expStr] = s.split('e');
  const dec = mant.includes('.') ? mant.split('.')[1].length : 0;
  const exp = expStr ? parseInt(expStr, 10) : 0;
  return dec - exp; // may be negative (e.g. 1.2e3 is known to the hundreds)
}

/** Significant figures of a sum/difference whose least precise term has `decimals` places. */
export function sfFromDecimals(value, decimals) {
  if (value === 0) return 1;
  const mag = Math.floor(Math.log10(Math.abs(value)));
  return Math.max(1, mag + 1 + decimals);
}

/** Round to n significant figures, returning a Number. */
export function roundSf(x, n) {
  if (x === 0 || !Number.isFinite(x)) return x;
  return Number(x.toPrecision(Math.min(Math.max(n, 1), 15)));
}

/**
 * Format a number with n significant figures for display.
 * Uses scientific notation (×10ⁿ) for very large/small magnitudes.
 * Returns HTML (only <sup> tags).
 */
export function fmtSf(x, n = 4) {
  if (!Number.isFinite(x)) return String(x);
  if (x === 0) return n > 1 ? '0.' + '0'.repeat(n - 1) : '0';
  n = Math.min(Math.max(Math.round(n), 1), 15);
  const mag = Math.floor(Math.log10(Math.abs(Number(x.toPrecision(n)))));
  if (mag >= 6 || mag <= -4) {
    const [m, e] = x.toExponential(n - 1).split('e');
    return `${m} × 10<sup>${parseInt(e, 10)}</sup>`;
  }
  let s = x.toPrecision(n);
  if (s.includes('e')) s = Number(s).toFixed(Math.max(0, n - 1 - mag));
  // a value like 1200 with 2 sf: toPrecision gives "1.2e+3" handled above; for
  // integers with trailing significant zeros add a decimal point (e.g. "100." for 3 sf)
  if (!s.includes('.') && mag + 1 === n && /0$/.test(s)) s += '.';
  return s;
}

/** Plain-text version of fmtSf (for clipboard and plain contexts). */
export function fmtSfText(x, n = 4) {
  return fmtSf(x, n).replace(/ × 10<sup>(-?\d+)<\/sup>/, ' × 10^$1');
}

/** Format an intermediate value with generous precision (no premature rounding shown). */
export function fmtWork(x) {
  return fmtSf(x, 6);
}

/**
 * Decide displayed significant figures for a result.
 * mode: 'auto' -> use the sig-fig rule result (min of inputs), clamped to [2, 6]
 *       number -> fixed number of sig figs
 */
export function displaySf(ruleSf, mode = 'auto') {
  if (mode === 'auto' || mode == null) return Math.min(Math.max(ruleSf || 3, 1), 8);
  const n = Number(mode);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 10) : 3;
}

/** Ensure a value is strictly positive, otherwise throw a helpful error. */
export function requirePositive(x, label) {
  if (!(x > 0)) throw new ChemError(`${label} must be greater than zero.`);
  return x;
}

export function requireNonZero(x, label) {
  if (x === 0) throw new ChemError(`${label} cannot be zero (it would cause division by zero).`);
  return x;
}

/** Compact plain representation without trailing padding zeros (e.g. -393.5, 226.7). */
export function fmtPlain(x) {
  if (!Number.isFinite(x)) return String(x);
  const a = Math.abs(x);
  if (a !== 0 && (a >= 1e6 || a < 1e-4)) return fmtWork(x);
  return String(Number(x.toPrecision(10)));
}
