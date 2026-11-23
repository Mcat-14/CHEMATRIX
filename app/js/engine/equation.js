// Chemical equation parsing and exact algebraic balancing.
import { ChemError, esc, formulaHtml } from './errors.js';
import { parseFormula, splitCoefficient } from './formula.js';
import { Frac, nullspace, toIntegers } from './rational.js';

const ARROWS = ['<=>', '⇌', '-->', '->', '→', '⟶', '=>', '='];
const MAX_SPECIES = 12;

/** Parse "A + B -> C + D" into species objects. */
export function parseEquation(input) {
  let s = String(input ?? '').trim();
  if (!s) throw new ChemError('Enter a chemical equation, for example H2 + O2 -> H2O.');
  if (s.length > 300) throw new ChemError('Equation is too long (maximum 300 characters).');
  let arrow = null, idx = -1;
  for (const a of ARROWS) {
    const i = s.indexOf(a);
    if (i >= 0) {
      arrow = a;
      idx = i;
      break;
    }
  }
  if (arrow == null) throw new ChemError('The equation needs an arrow between reactants and products. Type -> or = (for example CH4 + O2 -> CO2 + H2O).');
  const left = s.slice(0, idx);
  const right = s.slice(idx + arrow.length);
  if (ARROWS.some((a) => right.includes(a) && a !== '=') || right.includes('->')) {
    throw new ChemError('The equation has more than one arrow. Use a single arrow.');
  }
  const reactants = splitSide(left, 'reactant');
  const products = splitSide(right, 'product');
  if (reactants.length + products.length > MAX_SPECIES) throw new ChemError(`Too many substances (maximum ${MAX_SPECIES}).`);
  return { reactants, products, reversible: arrow === '<=>' || arrow === '⇌' };
}

function splitSide(side, role) {
  // split on "+" that is not part of a caret charge (e.g. Na^+ or Fe^3+)
  const tokens = side.split(/(?<!\^\d*)\+/).map((t) => t.trim()).filter(Boolean);
  if (tokens.length === 0) throw new ChemError(`The ${role} side of the equation is empty.`);
  return tokens.map((t) => {
    const { coefficient, formula } = splitCoefficient(t);
    const parsed = parseFormula(formula);
    return { ...parsed, given: coefficient, role };
  });
}

export function speciesHtml(sp, coef) {
  const c = coef != null && coef !== 1 ? `<b class="coef">${esc(coef)}</b>` : '';
  const st = sp.state ? `<span class="state">(${esc(sp.state)})</span>` : '';
  return `${c}${sp.html}${st}`;
}

export function equationHtml(reactants, products, rc, pc, arrow = '→') {
  const side = (list, cs) => list.map((sp, i) => speciesHtml(sp, cs ? cs[i] : null)).join(' + ');
  return `${side(reactants, rc)} ${arrow} ${side(products, pc)}`;
}

export function equationText(reactants, products, rc, pc) {
  const side = (list, cs) => list.map((sp, i) => `${cs && cs[i] !== 1 ? cs[i] : ''}${sp.formula}${sp.state ? `(${sp.state})` : ''}`).join(' + ');
  return `${side(reactants, rc)} → ${side(products, pc)}`;
}

/** Count atoms on each side for given coefficients. */
export function atomTable(reactants, products, rc, pc) {
  const els = [];
  const add = (sp) => { for (const el of sp.counts.keys()) if (!els.includes(el)) els.push(el); };
  reactants.forEach(add);
  products.forEach(add);
  return els.map((el) => {
    const l = reactants.reduce((s, sp, i) => s + (sp.counts.get(el) || 0) * rc[i], 0);
    const r = products.reduce((s, sp, i) => s + (sp.counts.get(el) || 0) * pc[i], 0);
    return { element: el, left: l, right: r, ok: Math.abs(l - r) < 1e-9 };
  });
}

const LETTERS = 'abcdefghijkl';

/**
 * Balance an equation. Returns coefficients and a transparent explanation.
 */
export function balanceEquation(input) {
  const eq = typeof input === 'string' ? parseEquation(input) : input;
  const { reactants, products } = eq;
  const all = [...reactants, ...products];
  const n = all.length;

  // element list in order of appearance
  const elements = [];
  all.forEach((sp) => { for (const el of sp.counts.keys()) if (!elements.includes(el)) elements.push(el); });

  // elements present on only one side make balancing impossible
  for (const el of elements) {
    const inL = reactants.some((s) => s.counts.has(el));
    const inR = products.some((s) => s.counts.has(el));
    if (!inL || !inR) {
      throw new ChemError(`${el} appears only on the ${inL ? 'reactant' : 'product'} side, so atoms of ${el} cannot be conserved. Check the formulas.`);
    }
  }

  const hasCharge = all.some((s) => s.charge !== 0);
  const rows = elements.map((el) => all.map((sp, j) => BigInt((sp.counts.get(el) || 0) * (j < reactants.length ? 1 : -1))));
  if (hasCharge) rows.push(all.map((sp, j) => BigInt(sp.charge * (j < reactants.length ? 1 : -1))));

  const basis = nullspace(rows);
  const steps = [];
  const vars = all.map((_, i) => LETTERS[i]);
  steps.push({
    title: 'Assign an unknown coefficient to each substance',
    html: all.map((sp, i) => `<i>${vars[i]}</i>·${sp.html}`).slice(0, reactants.length).join(' + ') + ' → ' +
      all.map((sp, i) => `<i>${vars[i]}</i>·${sp.html}`).slice(reactants.length).join(' + '),
  });
  steps.push({
    title: 'Write one atom-conservation equation per element (atoms in = atoms out)',
    lines: elements.map((el) => {
      const term = (list, off) => list.map((sp, i) => ({ c: sp.counts.get(el) || 0, v: vars[i + off] }))
        .filter((t) => t.c).map((t) => `${t.c === 1 ? '' : t.c}<i>${t.v}</i>`).join(' + ');
      return `${esc(el)}: ${term(reactants, 0)} = ${term(products, reactants.length)}`;
    }).concat(hasCharge ? [`Charge: ${all.map((sp, i) => (sp.charge ? `(${sp.charge})<i>${vars[i]}</i>` : '')).filter(Boolean).join(', ')} (total charge must be equal on both sides)`] : []),
  });

  if (basis.length === 0) {
    throw new ChemError('No set of positive whole-number coefficients balances this equation. The formulas are probably wrong (check subscripts and charges), or a substance is missing.');
  }

  let vec;
  let unique = true;
  if (basis.length === 1) {
    vec = basis[0];
  } else {
    unique = false;
    // look for a positive combination by summing basis vectors with small weights
    vec = findPositiveCombination(basis);
    if (!vec) {
      throw new ChemError('This equation can be balanced in more than one independent way, and no single set of positive coefficients could be chosen. It is probably two reactions combined; balance each reaction separately.');
    }
  }

  let ints = toIntegers(vec);
  if (ints.every((x) => x <= 0n)) ints = ints.map((x) => -x);
  if (ints.some((x) => x === 0n)) {
    const idx = ints.findIndex((x) => x === 0n);
    throw new ChemError(`${all[idx].formula} does not take part in the balanced reaction (its coefficient would be 0). Remove it or check the formulas.`);
  }
  if (ints.some((x) => x < 0n)) {
    const idx = ints.findIndex((x) => x < 0n);
    throw new ChemError(`The equation only balances if ${all[idx].formula} is moved to the other side. Check which substances are reactants and which are products.`);
  }

  const coefs = ints.map(Number);
  const rc = coefs.slice(0, reactants.length);
  const pc = coefs.slice(reactants.length);

  // explain the solve: set first variable to its value relative to the rest
  const rational = vec.map((x) => x.div(vec[0]));
  steps.push({
    title: 'Solve the system',
    html: `Setting <i>${vars[0]}</i> = 1 gives ${rational.map((x, i) => `<i>${vars[i]}</i> = ${esc(x.toString())}`).join(', ')}.`,
  });
  const scale = coefs[0];
  if (rational.some((x) => x.d !== 1n) || scale !== 1) {
    steps.push({
      title: 'Convert to the smallest whole numbers',
      html: `Multiply every coefficient by ${scale} to clear fractions: ${coefs.map((c, i) => `<i>${vars[i]}</i> = ${c}`).join(', ')}.`,
    });
  }

  const table = atomTable(reactants, products, rc, pc);
  const givenAll = all.every((s) => s.given != null);
  let givenCheck = null;
  if (all.some((s) => s.given != null)) {
    const g = all.map((s) => (s.given == null ? 1 : s.given));
    const gt = atomTable(reactants, products, g.slice(0, reactants.length), g.slice(reactants.length));
    const ok = gt.every((r) => r.ok) && (!hasCharge || true);
    givenCheck = ok
      ? 'The coefficients you typed already balance the equation.'
      : `The coefficients you typed${givenAll ? '' : ' (missing ones read as 1)'} do not balance the equation: ${gt.filter((r) => !r.ok).map((r) => `${r.element} ${r.left} vs ${r.right}`).join(', ')}.`;
  }

  return {
    reactants,
    products,
    coefficients: coefs,
    rc,
    pc,
    unique,
    html: equationHtml(reactants, products, rc, pc, eq.reversible ? '⇌' : '→'),
    text: equationText(reactants, products, rc, pc),
    table,
    steps,
    givenCheck,
    note: unique ? null : 'This equation has more than one independent balanced form; the smallest positive combination found is shown.',
  };
}

function findPositiveCombination(basis) {
  const k = basis.length;
  const weights = [1, 2, 3];
  const tryW = (w) => {
    const vec = basis[0].map((_, j) => basis.reduce((s, b, i) => s.add(b[j].mul(new Frac(BigInt(w[i])))), new Frac(0n)));
    if (vec.every((x) => x.sign() > 0)) return vec;
    if (vec.every((x) => x.sign() < 0)) return vec.map((x) => x.neg());
    return null;
  };
  const rec = (i, w) => {
    if (i === k) return tryW(w);
    for (const a of weights) for (const s of [1, -1]) {
      const r = rec(i + 1, [...w, a * s]);
      if (r) return r;
    }
    return null;
  };
  return k <= 4 ? rec(0, []) : null;
}
