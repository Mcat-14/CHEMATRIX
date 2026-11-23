// Safe, hand-written chemical formula parser (no eval, no regex backtracking traps).
// Supports: subscripts, nested () and [] groups, hydrates (CuSO4·5H2O, CuSO4*5H2O,
// CuSO4.5H2O), optional ionic charge written with a caret (SO4^2-, Na^+, NH4^+),
// and state labels (s), (l), (g), (aq) which are recorded and removed.
import { ChemError, formulaHtml } from './errors.js';
import { ELEMENTS, isElement } from './elements.js';

const MAX_LEN = 120;
const STATE_RE = /\((s|l|g|aq)\)$/i;

/**
 * Parse a formula string.
 * @returns {{ formula: string, counts: Map<string, number>, charge: number, state: string|null, html: string }}
 */
export function parseFormula(input) {
  let s = String(input ?? '').trim();
  if (!s) throw new ChemError('Enter a chemical formula, for example H2O or Ca(OH)2.');
  if (s.length > MAX_LEN) throw new ChemError(`Formula is too long (maximum ${MAX_LEN} characters).`);
  s = s.replace(/\s+/g, '');

  let state = null;
  const sm = s.match(STATE_RE);
  if (sm) {
    state = sm[1].toLowerCase();
    s = s.slice(0, -sm[0].length);
  }

  // charge with a caret: ^2-, ^+, ^3+
  let charge = 0;
  const cm = s.match(/\^(\d*)([+-])$/);
  if (cm) {
    const mag = cm[1] ? parseInt(cm[1], 10) : 1;
    charge = cm[2] === '+' ? mag : -mag;
    s = s.slice(0, -cm[0].length);
  }

  if (!/^[A-Za-z0-9()[\]·*.]+$/.test(s)) {
    throw new ChemError(`"${String(input).slice(0, 40)}" contains characters that cannot appear in a chemical formula. Use element symbols, numbers and brackets only.`);
  }

  // hydrate parts
  const parts = s.split(/[·*.]/);
  const counts = new Map();
  parts.forEach((part, idx) => {
    if (!part) throw new ChemError('A hydrate dot must be followed by a formula, for example CuSO4·5H2O.');
    let mult = 1;
    let body = part;
    if (idx > 0) {
      const m = part.match(/^(\d+)/);
      if (m) {
        mult = parseInt(m[1], 10);
        body = part.slice(m[1].length);
      }
    } else if (/^\d/.test(part)) {
      throw new ChemError('A formula cannot start with a number. Write coefficients in the equation tools, not in a single formula (for example H2O, not 2H2O).');
    }
    const p = new Parser(body);
    const c = p.parseSequence();
    if (p.i < body.length) throw new ChemError(`Unexpected "${body[p.i]}" in formula. Check that every bracket is closed.`);
    for (const [el, n] of c) counts.set(el, (counts.get(el) || 0) + n * mult);
  });

  if (counts.size === 0) throw new ChemError('No elements found in the formula.');
  const formula = s + (charge ? `^${Math.abs(charge) === 1 ? '' : Math.abs(charge)}${charge > 0 ? '+' : '-'}` : '');
  return { formula, counts, charge, state, html: formulaHtml(formula) };
}

class Parser {
  constructor(s) {
    this.s = s;
    this.i = 0;
    this.depth = 0;
  }
  parseSequence() {
    const total = new Map();
    while (this.i < this.s.length) {
      const ch = this.s[this.i];
      let group;
      if (ch === '(' || ch === '[') {
        const close = ch === '(' ? ')' : ']';
        this.i++;
        if (++this.depth > 6) throw new ChemError('Brackets are nested too deeply.');
        group = this.parseSequence();
        if (this.s[this.i] !== close) throw new ChemError(`Missing "${close}" in formula.`);
        this.depth--;
        this.i++;
        if (group.size === 0) throw new ChemError('Empty brackets in formula.');
      } else if (ch === ')' || ch === ']') {
        break;
      } else if (/[A-Z]/.test(ch)) {
        let sym = ch;
        this.i++;
        if (this.i < this.s.length && /[a-z]/.test(this.s[this.i])) {
          const two = sym + this.s[this.i];
          if (isElement(two)) {
            sym = two;
            this.i++;
          }
        }
        if (!isElement(sym)) throw new ChemError(`"${sym}" is not an element symbol.`);
        if (this.i < this.s.length && /[a-z]/.test(this.s[this.i])) {
          throw new ChemError(`"${sym}${this.s[this.i]}" is not an element symbol. Element symbols start with a capital letter (for example Co for cobalt, CO for carbon monoxide).`);
        }
        group = new Map([[sym, 1]]);
      } else if (/[a-z]/.test(ch)) {
        throw new ChemError(`Element symbols must start with a capital letter ("${ch}" found). For example, write NaCl, not nacl.`);
      } else if (/[0-9]/.test(ch)) {
        throw new ChemError('A number must follow an element symbol or a closing bracket.');
      } else {
        throw new ChemError(`Unexpected "${ch}" in formula.`);
      }
      const n = this.readCount();
      for (const [el, c] of group) total.set(el, (total.get(el) || 0) + c * n);
    }
    return total;
  }
  readCount() {
    let j = this.i;
    while (j < this.s.length && /[0-9]/.test(this.s[j])) j++;
    if (j === this.i) return 1;
    const n = parseInt(this.s.slice(this.i, j), 10);
    if (n === 0) throw new ChemError('A subscript of 0 is not allowed.');
    if (n > 999) throw new ChemError('Subscripts larger than 999 are not supported.');
    this.i = j;
    return n;
  }
}

/** Molar mass with per-element contributions. */
export function molarMass(input) {
  const p = typeof input === 'string' ? parseFormula(input) : input;
  const rows = [];
  let total = 0;
  for (const [el, n] of p.counts) {
    const e = ELEMENTS[el];
    const sub = e.mass * n;
    total += sub;
    rows.push({ symbol: el, name: e.name, count: n, atomicMass: e.mass, subtotal: sub, radioactive: e.radioactive });
  }
  rows.forEach((r) => (r.percent = (r.subtotal / total) * 100));
  return { formula: p.formula, html: p.html, counts: p.counts, rows, total };
}

/** Total number of atoms in a formula unit. */
export function atomCount(counts) {
  let n = 0;
  for (const c of counts.values()) n += c;
  return n;
}

/**
 * Split a species token that may have a leading coefficient, e.g. "2H2O(l)".
 * Returns { coefficient: number|null, formula: string }.
 */
export function splitCoefficient(token) {
  const t = token.trim();
  const m = t.match(/^(\d+(?:\.\d+)?|\d+\/\d+)\s*(?=[A-Z([])/);
  if (!m) return { coefficient: null, formula: t };
  let c;
  if (m[1].includes('/')) {
    const [a, b] = m[1].split('/').map(Number);
    c = a / b;
  } else c = Number(m[1]);
  return { coefficient: c, formula: t.slice(m[0].length) };
}
