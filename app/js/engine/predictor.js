// Product prediction assistant. It recognises common reaction patterns from
// introductory chemistry and explains each prediction. When a pattern needs
// information it does not have (a metal's charge, reaction conditions), it asks
// for it instead of guessing. It never invents products outside these rules.
import { ChemError } from './errors.js';
import { parseFormula } from './formula.js';
import { balanceEquation } from './equation.js';
import { isMetal, isElement, DIATOMIC } from './elements.js';
import {
  splitIonic, buildIonic, solubility, CATION_CHARGES, ACTIVITY_SERIES, COLD_WATER_METALS,
  HALOGEN_SERIES, MONATOMIC_ANIONS, chargeLabel,
} from './ions.js';

const elementForm = (el) => (DIATOMIC.has(el) ? `${el}2` : el);
const isEl = (p) => p.counts.size === 1 && p.charge === 0;
const elOf = (p) => [...p.counts.keys()][0];
const is = (p, f) => { try { const q = parseFormula(f); return q.counts.size === p.counts.size && [...q.counts].every(([e, n]) => p.counts.get(e) === n); } catch { return false; } };
const isHydrocarbonLike = (p) => p.counts.has('C') && p.counts.has('H') && [...p.counts.keys()].every((e) => ['C', 'H', 'O'].includes(e));

function chargeFor(metal, opts, reasons) {
  const list = CATION_CHARGES[metal];
  if (opts.charges && opts.charges[metal]) {
    const q = Number(opts.charges[metal]);
    reasons.push(`Using the ${metal}${chargeLabel(q)} ion as you selected.`);
    return { q };
  }
  if (!list) return { need: { metal, options: [1, 2, 3] } };
  if (list.length === 1) return { q: list[0] };
  return { need: { metal, options: list } };
}

function result(status, data) {
  return { status, products: [], reasons: [], assumptions: [], questions: [], ...data };
}

function finish(reactantStrs, productStrs, data) {
  const eqStr = `${reactantStrs.join(' + ')} -> ${productStrs.join(' + ')}`;
  let balanced = null;
  try {
    balanced = balanceEquation(eqStr);
  } catch (e) {
    data.reasons.push(`The predicted equation could not be balanced automatically: ${e.message}`);
  }
  return result('predicted', { ...data, products: productStrs, balanced, equation: eqStr });
}

/**
 * @param {string} input reactants, e.g. "AgNO3 + NaCl" (an arrow and products are ignored)
 * @param {{ heat?: boolean, charges?: Record<string, number> }} opts
 */
export function predictProducts(input, opts = {}) {
  let s = String(input ?? '').trim();
  if (!s) throw new ChemError('Enter the reactants, for example AgNO3 + NaCl.');
  s = s.split(/->|→|=/)[0];
  const tokens = s.split(/(?<!\^\d*)\+/).map((t) => t.trim()).filter(Boolean);
  if (tokens.length === 0 || tokens.length > 2) throw new ChemError('Enter one reactant (decomposition) or two reactants separated by +.');
  const R = tokens.map((t) => parseFormula(t.replace(/^\d+\s*/, '')));
  const names = R.map((r) => r.formula);
  const reasons = [];
  const assumptions = [];

  // ---------- one reactant: decomposition ----------
  if (R.length === 1) {
    const r = R[0];
    if (is(r, 'H2O2')) {
      reasons.push('Hydrogen peroxide decomposes into water and oxygen gas (speeded up by a catalyst such as MnO₂).');
      return finish(names, ['H2O', 'O2'], { type: 'Decomposition', reasons, assumptions });
    }
    if (is(r, 'H2O')) {
      reasons.push('Water can be decomposed into its elements by electrolysis.');
      assumptions.push('Requires electrical energy (electrolysis); water does not decompose on its own at ordinary temperatures.');
      return finish(names, ['H2', 'O2'], { type: 'Decomposition', reasons, assumptions });
    }
    if (is(r, 'H2CO3')) {
      reasons.push('Carbonic acid is unstable and decomposes into water and carbon dioxide.');
      return finish(names, ['H2O', 'CO2'], { type: 'Decomposition', reasons, assumptions });
    }
    const ion = splitIonic(r.formula);
    if (ion) {
      const { cation, anion } = ion;
      if (anion.f === 'CO3' && cation.f !== 'H') {
        if (['Na', 'K', 'Rb', 'Cs'].includes(cation.f)) {
          return result('no-reaction', { type: 'Decomposition', reasons: [`${r.formula} is a group 1 carbonate; these are thermally stable and do not decompose on ordinary heating.`], assumptions });
        }
        reasons.push('On heating, a metal carbonate decomposes into the metal oxide and carbon dioxide.');
        assumptions.push('Heat is applied.');
        return finish(names, [buildIonic(cation.f, cation.q, 'O', -2), 'CO2'], { type: 'Decomposition', reasons, assumptions });
      }
      if (anion.f === 'HCO3') {
        reasons.push('On heating, a hydrogen carbonate decomposes into the carbonate, water and carbon dioxide.');
        assumptions.push('Heat is applied.');
        return finish(names, [buildIonic(cation.f, cation.q, 'CO3', -2), 'H2O', 'CO2'], { type: 'Decomposition', reasons, assumptions });
      }
      if (anion.f === 'ClO3') {
        reasons.push('On heating, a metal chlorate decomposes into the metal chloride and oxygen gas.');
        assumptions.push('Heat is applied (often with an MnO₂ catalyst).');
        return finish(names, [buildIonic(cation.f, cation.q, 'Cl', -1), 'O2'], { type: 'Decomposition', reasons, assumptions });
      }
      if (anion.f === 'OH' && !['Li', 'Na', 'K', 'Rb', 'Cs', 'NH4'].includes(cation.f)) {
        reasons.push('On heating, a metal hydroxide decomposes into the metal oxide and water.');
        assumptions.push('Heat is applied.');
        return finish(names, [buildIonic(cation.f, cation.q, 'O', -2), 'H2O'], { type: 'Decomposition', reasons, assumptions });
      }
      if (!anion.poly && cation.f !== 'NH4') {
        reasons.push(`${r.formula} is a binary compound, so it decomposes into its two elements.`);
        if (DIATOMIC.has(anion.f)) reasons.push(`${anion.f} is diatomic as a free element, so it is written ${anion.f}₂.`);
        assumptions.push('Requires a large energy input (strong heating or electrolysis).');
        return finish(names, [elementForm(cation.f), elementForm(anion.f)], { type: 'Decomposition', reasons, assumptions });
      }
    }
    if (r.counts.size === 2 && !ion) {
      const [a, b] = [...r.counts.keys()];
      reasons.push(`${r.formula} is a binary compound, so it decomposes into its two elements.`);
      assumptions.push('Requires a large energy input. Many molecular compounds decompose differently in practice; check with your teacher.');
      return finish(names, [elementForm(a), elementForm(b)], { type: 'Decomposition', reasons, assumptions });
    }
    return result('unsupported', { reasons: [`No supported decomposition pattern matches ${r.formula}. More information about the conditions is needed.`], assumptions });
  }

  // ---------- two reactants ----------
  const [A, B] = R;
  const o2 = [A, B].find((x) => is(x, 'O2'));
  const other = o2 && (A === o2 ? B : A);

  // combustion of hydrocarbons and C/H/O compounds
  if (o2 && other && isHydrocarbonLike(other)) {
    reasons.push(`${other.formula} contains only carbon, hydrogen${other.counts.has('O') ? ' and oxygen' : ''}; burning it in oxygen gives carbon dioxide and water.`);
    assumptions.push('Complete combustion with enough oxygen (otherwise CO or soot also form).');
    return finish(names, ['CO2', 'H2O'], { type: 'Combustion', reasons, assumptions });
  }

  // element + element: synthesis
  if (isEl(A) && isEl(B)) {
    const a = elOf(A), b = elOf(B);
    const metal = isMetal(a) ? a : isMetal(b) ? b : null;
    const non = metal === a ? b : a;
    if (metal && MONATOMIC_ANIONS[non] && non !== 'H') {
      const c = chargeFor(metal, opts, reasons);
      if (c.need) return needCharge(c.need);
      const aq = MONATOMIC_ANIONS[non].q;
      reasons.push(`A metal and a nonmetal combine to form an ionic compound: ${metal}${chargeLabel(c.q)} and ${non}${chargeLabel(aq)} (${MONATOMIC_ANIONS[non].name}).`);
      reasons.push('The charges are balanced with the criss-cross rule so the compound is neutral.');
      return finish(names, [buildIonic(metal, c.q, non, aq)], { type: 'Synthesis', reasons, assumptions });
    }
    const set = new Set([a, b]);
    const known = [
      [['H', 'O'], 'H2O', 'Hydrogen burns in oxygen to form water.'],
      [['H', 'Cl'], 'HCl', 'Hydrogen and chlorine combine to form hydrogen chloride.'],
      [['H', 'F'], 'HF', 'Hydrogen and fluorine combine to form hydrogen fluoride.'],
      [['H', 'Br'], 'HBr', 'Hydrogen and bromine combine to form hydrogen bromide.'],
      [['H', 'I'], 'HI', 'Hydrogen and iodine combine to form hydrogen iodide.'],
      [['N', 'H'], 'NH3', 'Nitrogen and hydrogen combine to form ammonia (Haber process).'],
      [['C', 'O'], 'CO2', 'Carbon burns in plenty of oxygen to form carbon dioxide.'],
      [['S', 'O'], 'SO2', 'Sulfur burns in oxygen to form sulfur dioxide.'],
    ];
    for (const [pair, prod, why] of known) {
      if (set.has(pair[0]) && set.has(pair[1]) && set.size === 2) {
        reasons.push(why);
        if (prod === 'CO2') assumptions.push('Enough oxygen is present (limited oxygen gives CO).');
        if (prod === 'NH3') assumptions.push('High pressure, a catalyst and moderate temperature; the reaction is reversible.');
        return finish(names, [prod], { type: 'Synthesis', reasons, assumptions });
      }
    }
    return result('unsupported', { reasons: ['Two nonmetals can combine in several ratios (for example CO and CO₂). The product cannot be predicted from charges alone; more information is needed.'] });
  }

  // element + compound: single displacement
  if (isEl(A) !== isEl(B)) {
    const elS = isEl(A) ? A : B;
    const comp = elS === A ? B : A;
    const el = elOf(elS);

    // metal + water
    if (is(comp, 'H2O') && isMetal(el)) {
      if (COLD_WATER_METALS.includes(el)) {
        const c = chargeFor(el, opts, reasons);
        reasons.push(`${el} is reactive enough to displace hydrogen from cold water, forming the metal hydroxide and hydrogen gas.`);
        return finish(names, [buildIonic(el, c.q, 'OH', -1), 'H2'], { type: 'Single displacement', reasons, assumptions });
      }
      if (['Mg', 'Al', 'Zn', 'Fe'].includes(el)) {
        return result('needs-info', { reasons: [`${el} does not react noticeably with cold water. With steam it can form the metal oxide and hydrogen; tell your teacher's conditions before predicting.`], questions: ['Is the metal reacting with steam (high temperature)?'] });
      }
      return result('no-reaction', { type: 'Single displacement', reasons: [`${el} is below the water-reactive metals in the activity series, so no reaction is expected.`] });
    }

    const ion = splitIonic(comp.formula);
    if (ion && isMetal(el)) {
      const target = ion.cation.f;
      const iEl = ACTIVITY_SERIES.indexOf(el), iT = ACTIVITY_SERIES.indexOf(target);
      if (iEl < 0 || iT < 0) return result('unsupported', { reasons: [`${el} or ${target} is not in the activity series used by this app.`] });
      if (iEl > iT) {
        return result('no-reaction', { type: 'Single displacement', reasons: [`${el} is less reactive than ${target === 'H' ? 'hydrogen' : target} in the activity series, so it cannot displace it. No reaction.`] });
      }
      const c = chargeFor(el, opts, reasons);
      if (c.need) return needCharge(c.need);
      const newSalt = buildIonic(el, c.q, ion.anion.f, ion.anion.q);
      const freed = target === 'H' ? 'H2' : elementForm(target);
      reasons.push(`${el} is above ${target === 'H' ? 'hydrogen' : target} in the activity series, so it displaces ${target === 'H' ? 'hydrogen from the acid' : `${target} from its compound`}.`);
      reasons.push(`The new compound pairs ${el}${chargeLabel(c.q)} with the ${ion.anion.f}${chargeLabel(ion.anion.q)} ion: ${newSalt}.`);
      assumptions.push('The compound is dissolved in water (aqueous solution).');
      return finish(names, [newSalt, freed], { type: 'Single displacement', reasons, assumptions });
    }
    if (ion && HALOGEN_SERIES.includes(el)) {
      const target = ion.anion.f;
      if (!HALOGEN_SERIES.includes(target)) return result('unsupported', { reasons: [`A halogen can only displace another halide ion; ${comp.formula} contains no halide.`] });
      if (HALOGEN_SERIES.indexOf(el) >= HALOGEN_SERIES.indexOf(target)) {
        return result('no-reaction', { type: 'Single displacement', reasons: [`${el}₂ is not more reactive than ${target}₂ (halogen reactivity: F₂ > Cl₂ > Br₂ > I₂), so no reaction.`] });
      }
      reasons.push(`${el}₂ is more reactive than ${target}₂, so it displaces the ${MONATOMIC_ANIONS[target].name} ion.`);
      return finish(names, [buildIonic(ion.cation.f, ion.cation.q, el, -1), elementForm(target)], { type: 'Single displacement', reasons, assumptions });
    }
    return result('unsupported', { reasons: ['This element + compound combination does not match a supported single-displacement pattern.'] });
  }

  // compound + compound: double displacement
  const ia = splitIonic(A.formula), ib = splitIonic(B.formula);
  if (ia && ib) {
    if (ia.water || ib.water) return result('unsupported', { reasons: ['Reactions of salts with water (hydrolysis) are not covered by the five basic patterns.'] });
    const p1 = { cat: ia.cation, an: ib.anion }, p2 = { cat: ib.cation, an: ia.anion };
    const products = [];
    const states = [];
    let driving = false;
    for (const p of [p1, p2]) {
      const c = p.cat.f, a = p.an.f;
      if (c === 'H' && a === 'OH') {
        products.push('H2O(l)');
        reasons.push('H⁺ from the acid and OH⁻ from the base combine to form water (neutralisation).');
        driving = true;
        continue;
      }
      if (c === 'H' && (a === 'CO3' || a === 'HCO3')) {
        products.push('H2O(l)', 'CO2(g)');
        reasons.push('The carbonic acid formed (H₂CO₃) decomposes into water and carbon dioxide gas.');
        driving = true;
        continue;
      }
      if (c === 'NH4' && a === 'OH') {
        products.push('NH3(g)', 'H2O(l)');
        reasons.push('Ammonium hydroxide decomposes into ammonia gas and water.');
        driving = true;
        continue;
      }
      if (c === 'H' && a === 'S') {
        products.push('H2S(g)');
        reasons.push('Hydrogen sulfide forms and escapes as a gas.');
        driving = true;
        continue;
      }
      const f = buildIonic(c, p.cat.q, a, p.an.q);
      if (c === 'H') {
        products.push(`${f}(aq)`);
        continue;
      }
      const sol = solubility(c, a);
      states.push({ f, sol });
      if (sol.soluble === false) {
        products.push(`${f}(s)`);
        reasons.push(`${f} is insoluble and forms a precipitate. Rule: ${sol.rule}`);
        driving = true;
      } else if (sol.soluble === true) {
        products.push(`${f}(aq)`);
        reasons.push(`${f} is soluble, so it stays dissolved. Rule: ${sol.rule}`);
      } else {
        return result('needs-info', { reasons: [`The solubility of ${f} is not covered by the general rules, so the outcome cannot be predicted reliably.`] });
      }
    }
    if (!driving) {
      return result('no-reaction', {
        type: 'Double displacement',
        reasons: ['The ions would exchange partners, but every possible product is soluble and no water or gas forms.', ...reasons, 'All ions stay in solution, so no net reaction occurs.'],
        assumptions: ['Both reactants are in aqueous solution.'],
      });
    }
    reasons.unshift('Both reactants are ionic, so the cations and anions exchange partners (AB + CD → AD + CB).');
    assumptions.push('Both reactants are in aqueous solution; solubility follows the general rules at 25 °C.');
    const rs = [ia, ib].map((x, i) => {
      if (x.cation.f === 'H') return `${names[i]}(aq)`;
      const sol = solubility(x.cation.f, x.anion.f);
      return `${names[i]}(${sol.soluble === false ? 's' : 'aq'})`;
    });
    return finish(rs, products, { type: 'Double displacement', reasons, assumptions });
  }

  return result('unsupported', { reasons: ['These reactants do not match a supported pattern (synthesis, decomposition, single or double displacement, combustion). More information is needed to predict products.'] });

  function needCharge(need) {
    return result('needs-info', {
      reasons: [`${need.metal} commonly forms more than one ion (${need.options.map((q) => need.metal + chargeLabel(q)).join(', ')}). The product depends on which one forms.`],
      questions: [`Which ${need.metal} ion forms?`],
      need,
    });
  }
}

export { isElement };
