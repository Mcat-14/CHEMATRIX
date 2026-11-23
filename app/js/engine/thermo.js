// Thermochemistry solvers: q = mcΔT, temperature change, specific heat,
// calorimetry, enthalpy of reaction, Hess's law, bond energies, energy diagrams.
import { ChemError, esc, v } from './errors.js';
import { parseMeasured, fmtWork, fmtPlain, sfFromDecimals } from './numbers.js';
import { convert, toKelvin, unitLabel, deltaToKelvin } from './units.js';
import { balanceEquation, parseEquation, equationHtml, equationText } from './equation.js';
import { molarMass, parseFormula } from './formula.js';
import { Frac, solveLinear } from './rational.js';
import { Solution, minSf, AMBIGUOUS_NOTE } from './solution.js';
import { DHF_SOURCE, lookupDHf, BOND_ENERGIES, BOND_SOURCE } from './thermo-data.js';

const C_UNITS = {
  'J/gC': { f: 1, label: 'J/(g·°C)' },
  'J/gK': { f: 1, label: 'J/(g·K)' },
  'J/kgK': { f: 1e-3, label: 'J/(kg·K)' },
  'cal/gC': { f: 4.184, label: 'cal/(g·°C)' },
};
export const SPECIFIC_HEAT_UNITS = C_UNITS;

function need(inp, label, key) {
  if (!inp || inp.value === '' || inp.value == null) throw new ChemError(`Enter a value for ${label}.`, key);
  return parseMeasured(inp.value, label);
}

function readMass(sol, inp, label = 'mass') {
  const m = need(inp, label, 'm');
  if (!(m.value > 0)) throw new ChemError(`The ${label} must be greater than zero.`);
  const g = convert(m.value, 'mass', inp.unit || 'g', 'g');
  if ((inp.unit || 'g') !== 'g') sol.convert(`${label}: ${fmtWork(m.value)} ${unitLabel('mass', inp.unit)} = ${fmtWork(g)} g`);
  if (m.ambiguous) sol.warn(AMBIGUOUS_NOTE);
  return { value: g, sf: m.sf, raw: m, unit: inp.unit || 'g' };
}
function readC(sol, inp, label = 'specific heat') {
  const c = need(inp, label, 'c');
  if (!(c.value > 0)) throw new ChemError('Specific heat capacity must be greater than zero.');
  const u = C_UNITS[inp.unit || 'J/gC'];
  if (!u) throw new ChemError('Unsupported specific heat unit.');
  const val = c.value * u.f;
  if (u.f !== 1) sol.convert(`c = ${fmtWork(c.value)} ${u.label} = ${fmtWork(val)} J/(g·°C)`);
  return { value: val, sf: c.sf, raw: c, unit: inp.unit || 'J/gC' };
}
function readQ(sol, inp, label = 'heat') {
  const q = need(inp, label, 'q');
  const val = convert(q.value, 'energy', inp.unit || 'J', 'J');
  if ((inp.unit || 'J') !== 'J') sol.convert(`q = ${fmtWork(q.value)} ${unitLabel('energy', inp.unit)} = ${fmtWork(val)} J`);
  return { value: val, sf: q.sf, raw: q, unit: inp.unit || 'J' };
}
/** ΔT from a direct value or from Ti and Tf (both same unit). Returns kelvin difference. */
function readDT(sol, p) {
  if (p.dT && p.dT.value !== '' && p.dT.value != null) {
    const d = parseMeasured(p.dT.value, 'temperature change');
    const k = deltaToKelvin(d.value, p.dT.unit || 'C');
    sol.give('ΔT', 'Temperature change', d.value, unitLabel('temperature', p.dT.unit || 'C'));
    if ((p.dT.unit || 'C') === 'F') sol.convert(`ΔT = ${fmtWork(d.value)} °F × 5/9 = ${fmtWork(k)} °C (a change of 1 °C equals a change of 1 K)`);
    return { value: k, sf: d.sf };
  }
  const ti = need(p.Ti, 'initial temperature', 'Ti');
  const tf = need(p.Tf, 'final temperature', 'Tf');
  const u = p.Ti.unit || 'C';
  const tiK = toKelvin(ti.value, u), tfK = toKelvin(tf.value, p.Tf.unit || u);
  if (tiK < 0 || tfK < 0) throw new ChemError('A temperature below absolute zero was entered.');
  sol.give(v('T', 'i'), 'Initial temperature', ti.value, unitLabel('temperature', u));
  sol.give(v('T', 'f'), 'Final temperature', tf.value, unitLabel('temperature', p.Tf.unit || u));
  const d = tfK - tiK;
  sol.convert(`ΔT = ${v('T', 'f')} − ${v('T', 'i')} = ${fmtWork(tf.value)} − ${fmtWork(ti.value)} = ${fmtWork(d)} ${u === 'K' ? 'K' : '°C'}${u === 'F' ? ' (converted from °F)' : ''}`);
  const dec = Math.min(ti.decimals, tf.decimals);
  return { value: d, sf: sfFromDecimals(d, dec) };
}

/** q = mcΔT, solving for q, m, c or ΔT. */
export function solveHeat(p) {
  const solveFor = p.solveFor || 'q';
  const sol = new Solution('heat', solveFor === 'c' ? 'Specific heat capacity' : 'Heat (q = mcΔT)');
  sol.formula = 'q = m · c · ΔT';
  sol.define('q', 'heat absorbed (+) or released (−) by the substance', 'J');
  sol.define('m', 'mass', 'g');
  sol.define('c', 'specific heat capacity', 'J/(g·°C)');
  sol.define('ΔT', 'temperature change, T<sub>final</sub> − T<sub>initial</sub>', '°C (same size as K)');
  let ans, ms = [];
  if (solveFor === 'q') {
    const m = readMass(sol, p.m), c = readC(sol, p.c);
    sol.give('m', 'Mass', m.raw.value, unitLabel('mass', m.unit));
    sol.give('c', 'Specific heat capacity', c.raw.value, C_UNITS[c.unit].label);
    const dT = readDT(sol, p);
    sol.find('q', 'Heat');
    sol.substitution = `q = (${fmtWork(m.value)} g)(${fmtWork(c.value)} J/(g·°C))(${fmtWork(dT.value)} °C)`;
    ans = m.value * c.value * dT.value;
    ms = [m, c, dT];
    sol.step('Multiply', `q = ${fmtWork(ans)} J = ${fmtWork(ans / 1000)} kJ`);
    sol.answer('Heat', 'q', ans, 'J', minSf(...ms));
    sol.answer('Heat in kilojoules', 'q', ans / 1000, 'kJ', minSf(...ms));
  } else if (solveFor === 'm') {
    const q = readQ(sol, p.q), c = readC(sol, p.c);
    sol.give('q', 'Heat', q.raw.value, unitLabel('energy', q.unit));
    sol.give('c', 'Specific heat capacity', c.raw.value, C_UNITS[c.unit].label);
    const dT = readDT(sol, p);
    if (dT.value === 0) throw new ChemError('ΔT is zero, so the mass cannot be found (division by zero).');
    sol.find('m', 'Mass');
    sol.rearranged = 'm = q / (c · ΔT)';
    sol.substitution = `m = ${fmtWork(q.value)} J / ((${fmtWork(c.value)} J/(g·°C))(${fmtWork(dT.value)} °C))`;
    ans = q.value / (c.value * dT.value);
    if (ans <= 0) throw new ChemError('The heat and temperature change have opposite signs, which gives a negative mass. A substance that absorbs heat (q > 0) warms up (ΔT > 0); one that releases heat cools down.');
    ms = [q, c, dT];
    sol.step('Calculate', `m = ${fmtWork(ans)} g`);
    sol.answer('Mass', 'm', ans, 'g', minSf(...ms));
  } else if (solveFor === 'c') {
    const q = readQ(sol, p.q), m = readMass(sol, p.m);
    sol.give('q', 'Heat', q.raw.value, unitLabel('energy', q.unit));
    sol.give('m', 'Mass', m.raw.value, unitLabel('mass', m.unit));
    const dT = readDT(sol, p);
    if (dT.value === 0) throw new ChemError('ΔT is zero, so the specific heat cannot be found (division by zero).');
    sol.find('c', 'Specific heat capacity');
    sol.rearranged = 'c = q / (m · ΔT)';
    sol.substitution = `c = ${fmtWork(q.value)} J / ((${fmtWork(m.value)} g)(${fmtWork(dT.value)} °C))`;
    ans = q.value / (m.value * dT.value);
    if (ans <= 0) throw new ChemError('The heat and temperature change have opposite signs, which gives a negative specific heat. Check the signs: heat absorbed (q > 0) causes a temperature rise.');
    ms = [q, m, dT];
    sol.step('Calculate', `c = ${fmtWork(ans)} J/(g·°C)`);
    sol.answer('Specific heat capacity', 'c', ans, 'J/(g·°C)', minSf(...ms));
    const known = { 'water': 4.184, 'aluminium': 0.897, 'iron': 0.449, 'copper': 0.385, 'silver': 0.235, 'lead': 0.130, 'gold': 0.129 };
    const close = Object.entries(known).find(([, val]) => Math.abs(val - ans) / val < 0.03);
    if (close) sol.step('Compare with known values', `This is close to the specific heat of ${close[0]} (${close[1]} J/(g·°C)).`);
  } else if (solveFor === 'dT') {
    const q = readQ(sol, p.q), m = readMass(sol, p.m), c = readC(sol, p.c);
    sol.give('q', 'Heat', q.raw.value, unitLabel('energy', q.unit));
    sol.give('m', 'Mass', m.raw.value, unitLabel('mass', m.unit));
    sol.give('c', 'Specific heat capacity', c.raw.value, C_UNITS[c.unit].label);
    sol.find('ΔT', 'Temperature change');
    sol.rearranged = 'ΔT = q / (m · c)';
    sol.substitution = `ΔT = ${fmtWork(q.value)} J / ((${fmtWork(m.value)} g)(${fmtWork(c.value)} J/(g·°C)))`;
    ans = q.value / (m.value * c.value);
    ms = [q, m, c];
    sol.step('Calculate', `ΔT = ${fmtWork(ans)} °C`);
    sol.answer('Temperature change', 'ΔT', ans, '°C', minSf(...ms));
  } else throw new ChemError('Choose what to solve for.');
  const qv = solveFor === 'q' ? ans : null;
  if (solveFor === 'q') {
    sol.interpretation = qv > 0 ? `q is positive: the substance absorbed ${fmtWork(qv)} J of heat from its surroundings (its temperature rose).`
      : qv < 0 ? `q is negative: the substance released ${fmtWork(-qv)} J of heat to its surroundings (its temperature fell).` : 'No temperature change means no heat was transferred.';
  } else if (solveFor === 'dT') {
    sol.interpretation = ans > 0 ? `The temperature rises by ${fmtWork(ans)} °C (heat absorbed).` : `The temperature falls by ${fmtWork(-ans)} °C (heat released).`;
  } else if (solveFor === 'c') {
    sol.interpretation = `It takes ${fmtWork(ans)} J to raise the temperature of 1 g of this substance by 1 °C. ${ans > 1 ? 'That is a relatively high value (it heats up slowly).' : 'That is a relatively low value, typical of metals (it heats up quickly).'}`;
  } else {
    sol.interpretation = `${fmtWork(ans)} g of the substance would undergo this temperature change with this amount of heat.`;
  }
  sol.assume('No phase change occurs within the temperature range, and c is constant over that range.');
  sol.assume('Sign convention: q > 0 means heat absorbed by the substance; q < 0 means heat released.');
  return sol;
}

/** Find the final (or initial) temperature: T_f = T_i + q/(mc). */
export function solveTemperature(p) {
  const findFinal = (p.solveFor || 'Tf') === 'Tf';
  const sol = new Solution('temperature', findFinal ? 'Final temperature' : 'Initial temperature');
  const q = readQ(sol, p.q), m = readMass(sol, p.m), c = readC(sol, p.c);
  const tk = findFinal ? p.Ti : p.Tf;
  const t = need(tk, findFinal ? 'initial temperature' : 'final temperature', findFinal ? 'Ti' : 'Tf');
  const tu = tk.unit || 'C';
  sol.give('q', 'Heat', q.raw.value, unitLabel('energy', q.unit));
  sol.give('m', 'Mass', m.raw.value, unitLabel('mass', m.unit));
  sol.give('c', 'Specific heat capacity', c.raw.value, C_UNITS[c.unit].label);
  sol.give(findFinal ? v('T', 'i') : v('T', 'f'), findFinal ? 'Initial temperature' : 'Final temperature', t.value, unitLabel('temperature', tu));
  sol.find(findFinal ? v('T', 'f') : v('T', 'i'), findFinal ? 'Final temperature' : 'Initial temperature');
  sol.formula = `q = m · c · (${v('T', 'f')} − ${v('T', 'i')})`;
  sol.rearranged = findFinal ? `${v('T', 'f')} = ${v('T', 'i')} + q / (m · c)` : `${v('T', 'i')} = ${v('T', 'f')} − q / (m · c)`;
  sol.define('q', 'heat absorbed (+) or released (−)', 'J');
  sol.define('m', 'mass', 'g');
  sol.define('c', 'specific heat capacity', 'J/(g·°C)');
  const dK = q.value / (m.value * c.value);
  const dU = tu === 'F' ? dK * 9 / 5 : dK;
  sol.step('Temperature change', `ΔT = q/(mc) = ${fmtWork(q.value)} / (${fmtWork(m.value)} × ${fmtWork(c.value)}) = ${fmtWork(dK)} °C${tu === 'F' ? ` = ${fmtWork(dU)} °F` : ''}`);
  const res = findFinal ? t.value + dU : t.value - dU;
  sol.substitution = findFinal ? `${v('T', 'f')} = ${fmtWork(t.value)} + (${fmtWork(dU)})` : `${v('T', 'i')} = ${fmtWork(t.value)} − (${fmtWork(dU)})`;
  if (toKelvin(res, tu) <= 0) throw new ChemError('The result is at or below absolute zero, which is impossible. Check the heat, mass and specific heat values.');
  sol.step('Calculate', `= ${fmtWork(res)} ${unitLabel('temperature', tu)}`);
  const sfD = minSf(q, m, c);
  // decimals of ΔT from its sig figs, combined with decimals of the temperature
  const dDec = sfD - 1 - Math.floor(Math.log10(Math.abs(dU) || 1));
  sol.answer(findFinal ? 'Final temperature' : 'Initial temperature', findFinal ? v('T', 'f') : v('T', 'i'), res, unitLabel('temperature', tu), sfFromDecimals(res, Math.min(dDec, t.decimals)));
  sol.interpretation = q.value >= 0 ? `Absorbing ${fmtWork(q.value)} J raises the temperature by ${fmtWork(Math.abs(dU))} ${unitLabel('temperature', tu)}.` : `Releasing ${fmtWork(-q.value)} J lowers the temperature by ${fmtWork(Math.abs(dU))} ${unitLabel('temperature', tu)}.`;
  sol.assume('No phase change occurs and c is constant.');
  return sol;
}

/**
 * Calorimetry.
 * mode 'mixing': two bodies reach a common final temperature.
 * mode 'unknown-c': hot metal into water, find the metal's specific heat.
 * mode 'reaction': coffee-cup calorimeter, find q_rxn and ΔH per mole.
 * mode 'bomb': bomb calorimeter with heat capacity C_cal.
 */
export function solveCalorimetry(p) {
  const mode = p.mode || 'mixing';
  const sol = new Solution('calorimetry', 'Calorimetry');
  sol.assume('The calorimeter is isolated: no heat is exchanged with the outside surroundings (q_lost + q_gained = 0).');
  if (mode === 'mixing') {
    const m1 = readMass(sol, p.m1, 'mass 1'), c1 = readC(sol, p.c1, 'specific heat 1');
    const m2 = readMass(sol, p.m2, 'mass 2'), c2 = readC(sol, p.c2, 'specific heat 2');
    const t1 = need(p.T1, 'temperature 1', 'T1'), t2 = need(p.T2, 'temperature 2', 'T2');
    const u = p.T1.unit || 'C';
    const T1 = toKelvin(t1.value, u) - 273.15, T2 = toKelvin(t2.value, p.T2.unit || u) - 273.15;
    sol.give(v('m', '1'), 'Mass of substance 1', m1.raw.value, unitLabel('mass', m1.unit));
    sol.give(v('c', '1'), 'Specific heat 1', c1.raw.value, C_UNITS[c1.unit].label);
    sol.give(v('T', '1'), 'Initial temperature 1', t1.value, unitLabel('temperature', u));
    sol.give(v('m', '2'), 'Mass of substance 2', m2.raw.value, unitLabel('mass', m2.unit));
    sol.give(v('c', '2'), 'Specific heat 2', c2.raw.value, C_UNITS[c2.unit].label);
    sol.give(v('T', '2'), 'Initial temperature 2', t2.value, unitLabel('temperature', p.T2.unit || u));
    if (u !== 'C') sol.convert(`Temperatures converted to °C: ${fmtWork(T1)} °C and ${fmtWork(T2)} °C`);
    sol.find(v('T', 'f'), 'Final (equilibrium) temperature');
    sol.formula = `${v('m', '1')}${v('c', '1')}(${v('T', 'f')} − ${v('T', '1')}) + ${v('m', '2')}${v('c', '2')}(${v('T', 'f')} − ${v('T', '2')}) = 0`;
    sol.rearranged = `${v('T', 'f')} = (${v('m', '1')}${v('c', '1')}${v('T', '1')} + ${v('m', '2')}${v('c', '2')}${v('T', '2')}) / (${v('m', '1')}${v('c', '1')} + ${v('m', '2')}${v('c', '2')})`;
    sol.define('m', 'mass', 'g'); sol.define('c', 'specific heat capacity', 'J/(g·°C)'); sol.define('T', 'temperature', '°C');
    const a = m1.value * c1.value, b = m2.value * c2.value;
    sol.substitution = `${v('T', 'f')} = (${fmtWork(a)} × ${fmtWork(T1)} + ${fmtWork(b)} × ${fmtWork(T2)}) / (${fmtWork(a)} + ${fmtWork(b)})`;
    const Tf = (a * T1 + b * T2) / (a + b);
    sol.step('Calculate', `${v('T', 'f')} = ${fmtWork(Tf)} °C`);
    const q1 = a * (Tf - T1), q2 = b * (Tf - T2);
    sol.step('Check: heat lost = heat gained', `q₁ = ${fmtWork(q1)} J, q₂ = ${fmtWork(q2)} J, sum = ${fmtWork(q1 + q2 === 0 ? 0 : q1 + q2)} J`);
    const dec = Math.min(t1.decimals, t2.decimals);
    sol.answer('Final temperature', v('T', 'f'), Tf, '°C', Math.min(sfFromDecimals(Tf, dec), minSf(m1, c1, m2, c2) + 1));
    sol.answer('Heat transferred', 'q', Math.abs(q1), 'J', minSf(m1, c1, m2, c2));
    sol.interpretation = `The hotter substance releases ${fmtWork(Math.abs(q1))} J and the cooler one absorbs the same amount. Both end at ${fmtWork(Tf)} °C, closer to the initial temperature of the substance with the larger m·c.`;
  } else if (mode === 'unknown-c') {
    const mm = readMass(sol, p.mMetal, 'mass of metal');
    const mw = readMass(sol, p.mWater, 'mass of water');
    const cw = readC(sol, p.cWater || { value: '4.184', unit: 'J/gC' }, 'specific heat of water');
    const tm = need(p.TMetal, 'initial temperature of metal', 'TMetal');
    const tw = need(p.TWater, 'initial temperature of water', 'TWater');
    const tf = need(p.Tf, 'final temperature', 'Tf');
    sol.give(v('m', 'metal'), 'Mass of metal', mm.raw.value, unitLabel('mass', mm.unit));
    sol.give(v('T', 'metal'), 'Initial temperature of metal', tm.value, '°C');
    sol.give(v('m', 'water'), 'Mass of water', mw.raw.value, unitLabel('mass', mw.unit));
    sol.give(v('T', 'water'), 'Initial temperature of water', tw.value, '°C');
    sol.give(v('T', 'f'), 'Final temperature', tf.value, '°C');
    sol.give(v('c', 'water'), 'Specific heat of water', cw.value, 'J/(g·°C)');
    sol.find(v('c', 'metal'), 'Specific heat of the metal');
    sol.formula = `−q<sub>metal</sub> = q<sub>water</sub>  →  −${v('m', 'metal')}${v('c', 'metal')}ΔT<sub>metal</sub> = ${v('m', 'water')}${v('c', 'water')}ΔT<sub>water</sub>`;
    sol.rearranged = `${v('c', 'metal')} = −${v('m', 'water')}${v('c', 'water')}ΔT<sub>water</sub> / (${v('m', 'metal')}ΔT<sub>metal</sub>)`;
    const dTw = tf.value - tw.value, dTm = tf.value - tm.value;
    if (dTm === 0) throw new ChemError('The metal\'s temperature did not change, so its specific heat cannot be found.');
    if (Math.sign(dTw) === Math.sign(dTm)) throw new ChemError('The final temperature must lie between the initial temperatures of the metal and the water (heat flows from hot to cold).');
    const qw = mw.value * cw.value * dTw;
    sol.step('Heat gained by water', `q<sub>water</sub> = ${fmtWork(mw.value)} × ${fmtWork(cw.value)} × ${fmtWork(dTw)} = ${fmtWork(qw)} J`);
    sol.step('Heat lost by metal', `q<sub>metal</sub> = −q<sub>water</sub> = ${fmtWork(-qw)} J`);
    sol.substitution = `${v('c', 'metal')} = ${fmtWork(-qw)} J / ((${fmtWork(mm.value)} g)(${fmtWork(dTm)} °C))`;
    const c = -qw / (mm.value * dTm);
    sol.step('Calculate', `${v('c', 'metal')} = ${fmtWork(c)} J/(g·°C)`);
    const sfDT = Math.min(sfFromDecimals(dTw, Math.min(tf.decimals, tw.decimals)), sfFromDecimals(dTm, Math.min(tf.decimals, tm.decimals)));
    sol.answer('Specific heat of the metal', v('c', 'metal'), c, 'J/(g·°C)', Math.min(minSf(mm, mw), sfDT));
    const known = { aluminium: 0.897, iron: 0.449, copper: 0.385, silver: 0.235, lead: 0.130, gold: 0.129 };
    const close = Object.entries(known).sort((a, b) => Math.abs(a[1] - c) - Math.abs(b[1] - c))[0];
    sol.interpretation = `The metal releases ${fmtWork(-qw)} J, which the water absorbs. Its specific heat, ${fmtWork(c)} J/(g·°C), is closest to ${close[0]} (${close[1]} J/(g·°C)).`;
    sol.assume('The heat capacity of the cup itself is negligible.');
  } else if (mode === 'reaction') {
    const ms = readMass(sol, p.m, 'mass of solution');
    const cs = readC(sol, p.c || { value: '4.184', unit: 'J/gC' }, 'specific heat of solution');
    sol.give('m', 'Mass of solution', ms.raw.value, unitLabel('mass', ms.unit));
    sol.give('c', 'Specific heat of solution', cs.value, 'J/(g·°C)');
    const dT = readDT(sol, p);
    sol.find('ΔH', 'Heat of reaction');
    sol.formula = 'q<sub>rxn</sub> = −q<sub>solution</sub> = −m·c·ΔT;   ΔH = q<sub>rxn</sub> / n';
    sol.define('q<sub>rxn</sub>', 'heat released or absorbed by the reaction', 'J');
    sol.define('n', 'moles of the reactant the ΔH refers to', 'mol');
    const qs = ms.value * cs.value * dT.value;
    sol.substitution = `q<sub>solution</sub> = (${fmtWork(ms.value)} g)(${fmtWork(cs.value)} J/(g·°C))(${fmtWork(dT.value)} °C) = ${fmtWork(qs)} J`;
    const qr = -qs;
    sol.step('Heat of reaction', `q<sub>rxn</sub> = −q<sub>solution</sub> = ${fmtWork(qr)} J = ${fmtWork(qr / 1000)} kJ`);
    const sf = minSf(ms, cs, dT);
    sol.answer('Heat of reaction', 'q<sub>rxn</sub>', qr / 1000, 'kJ', sf);
    if (p.n && p.n.value !== '' && p.n.value != null) {
      const n = need(p.n, 'moles of reactant', 'n');
      if (!(n.value > 0)) throw new ChemError('Moles must be greater than zero.');
      sol.give('n', 'Moles of reactant', n.value, 'mol');
      const dH = qr / 1000 / n.value;
      sol.step('Enthalpy change per mole', `ΔH = ${fmtWork(qr / 1000)} kJ / ${fmtWork(n.value)} mol = ${fmtWork(dH)} kJ/mol`);
      sol.answer('Enthalpy change', 'ΔH', dH, 'kJ/mol', Math.min(sf, n.sf));
    }
    sol.interpretation = qr < 0 ? 'The solution warmed up, so the reaction released heat: it is exothermic (ΔH < 0).' : 'The solution cooled down, so the reaction absorbed heat from the solution: it is endothermic (ΔH > 0).';
    sol.assume('The solution has the specific heat of water and the cup absorbs no heat (coffee-cup calorimeter).');
    sol.assume('Constant pressure, so q_rxn equals ΔH.');
  } else if (mode === 'bomb') {
    const C = need(p.C, 'heat capacity of the calorimeter', 'C');
    if (!(C.value > 0)) throw new ChemError('Calorimeter heat capacity must be greater than zero.');
    const Cu = p.C.unit || 'kJ/C';
    const CkJ = Cu === 'J/C' ? C.value / 1000 : C.value;
    sol.give(v('C', 'cal'), 'Heat capacity of calorimeter', C.value, Cu === 'J/C' ? 'J/°C' : 'kJ/°C');
    if (Cu === 'J/C') sol.convert(`${v('C', 'cal')} = ${fmtWork(CkJ)} kJ/°C`);
    const dT = readDT(sol, p);
    sol.find('q<sub>rxn</sub>', 'Heat of reaction');
    sol.formula = `q<sub>rxn</sub> = −${v('C', 'cal')} · ΔT`;
    sol.define(v('C', 'cal'), 'heat capacity of the whole calorimeter', 'kJ/°C');
    const qr = -CkJ * dT.value;
    sol.substitution = `q<sub>rxn</sub> = −(${fmtWork(CkJ)} kJ/°C)(${fmtWork(dT.value)} °C)`;
    sol.step('Calculate', `q<sub>rxn</sub> = ${fmtWork(qr)} kJ`);
    const sf = minSf(C, dT);
    sol.answer('Heat of reaction', 'q<sub>rxn</sub>', qr, 'kJ', sf);
    let nVal = null, nSf = 99;
    if (p.n && p.n.value) { const n = need(p.n, 'moles', 'n'); nVal = n.value; nSf = n.sf; sol.give('n', 'Moles burned', n.value, 'mol'); }
    else if (p.sampleMass && p.sampleMass.value && p.formula) {
      const sm = need(p.sampleMass, 'sample mass', 'sampleMass');
      const mm = molarMass(p.formula);
      nVal = sm.value / mm.total; nSf = sm.sf;
      sol.give('m', `Mass of ${mm.formula} burned`, sm.value, 'g');
      sol.convert(`n = ${fmtWork(sm.value)} g ÷ ${fmtWork(mm.total)} g/mol = ${fmtWork(nVal)} mol`);
    }
    if (nVal) {
      sol.step('Per mole', `${fmtWork(qr)} kJ / ${fmtWork(nVal)} mol = ${fmtWork(qr / nVal)} kJ/mol`);
      sol.answer('Energy change per mole (ΔE ≈ ΔH)', 'ΔE', qr / nVal, 'kJ/mol', Math.min(sf, nSf));
    }
    sol.interpretation = qr < 0 ? 'The temperature rose, so the reaction released energy (exothermic).' : 'The temperature fell, so the reaction absorbed energy (endothermic).';
    sol.assume('A bomb calorimeter works at constant volume, so it measures ΔE; for most reactions ΔH ≈ ΔE within a few kJ/mol.');
  } else throw new ChemError('Choose a calorimetry problem type.');
  return sol;
}

/** ΔH°rxn from standard enthalpies of formation. overrides: { 'H2O(l)': -285.8, ... } */
export function enthalpyFromFormation({ equation, overrides = {} }) {
  const bal = balanceEquation(equation);
  const sol = new Solution('enthalpy-formation', 'Enthalpy of reaction from ΔH°f');
  sol.give('Equation', 'Balanced equation', bal.html);
  sol.find('ΔH°<sub>rxn</sub>', 'Standard enthalpy change of reaction');
  sol.formula = 'ΔH°<sub>rxn</sub> = Σ n·ΔH°<sub>f</sub>(products) − Σ n·ΔH°<sub>f</sub>(reactants)';
  sol.define('n', 'coefficient in the balanced equation', 'mol');
  sol.define('ΔH°<sub>f</sub>', 'standard enthalpy of formation', 'kJ/mol');
  const rows = [];
  const missing = [];
  const val = (sp) => {
    const key = `${sp.formula}${sp.state ? `(${sp.state})` : ''}`;
    if (overrides[key] !== undefined && overrides[key] !== '') {
      const m = parseMeasured(overrides[key], `ΔH°f of ${key}`);
      return { value: m.value, key, source: 'you entered' };
    }
    const found = lookupDHf(sp.formula, sp.state);
    if (!found) { missing.push(key); return null; }
    if (found.guessedState) sol.warn(`No state was given for ${sp.formula}; the value for ${found.key} was used. Add (l), (g), (s) or (aq) to choose.`);
    return { value: found.value, key: found.key, source: 'table' };
  };
  const side = (list, coefs) => list.map((sp, i) => ({ sp, n: coefs[i], d: val(sp) }));
  const R = side(bal.reactants, bal.rc), P = side(bal.products, bal.pc);
  if (missing.length) {
    const e = new ChemError(`No ΔH°f value is stored for ${missing.join(', ')}. Enter the value from your textbook to continue.`);
    e.missing = missing;
    throw e;
  }
  const sum = (arr) => arr.reduce((s, x) => s + x.n * x.d.value, 0);
  const sp = sum(P), sr = sum(R);
  [...P, ...R].forEach((x) => rows.push([`${x.sp.html}${x.sp.state ? `(${x.sp.state})` : ''}`, x === P.find((y) => y === x) ? 'product' : 'reactant', String(x.n), x.d.value.toFixed(1), (x.n * x.d.value).toFixed(1), x.d.source]));
  sol.table('Values used', ['Substance', 'Role', 'n (mol)', 'ΔH°f (kJ/mol)', 'n·ΔH°f (kJ)', 'Source'], rows);
  sol.substitution = `ΔH° = [${P.map((x) => `${x.n}(${x.d.value})`).join(' + ')}] − [${R.map((x) => `${x.n}(${x.d.value})`).join(' + ')}]`;
  sol.step('Sum products and reactants', `Σ products = ${sp.toFixed(1)} kJ;  Σ reactants = ${sr.toFixed(1)} kJ`);
  const dH = sp - sr;
  sol.step('Subtract', `ΔH°<sub>rxn</sub> = ${sp.toFixed(1)} − (${sr.toFixed(1)}) = ${dH.toFixed(1)} kJ`);
  sol.answer('Enthalpy of reaction', 'ΔH°<sub>rxn</sub>', dH, 'kJ', sfFromDecimals(dH, 1));
  sol.interpretation = interpretDH(dH, bal.html);
  sol.assume(`ΔH°f data: ${DHF_SOURCE}`);
  sol.assume('ΔH° refers to the reaction exactly as written (per mole of reaction, at 298 K and 1 bar). Elements in their standard states have ΔH°f = 0.');
  sol.balanced = bal;
  sol.dH = dH;
  return sol;
}

function interpretDH(dH, eqHtml) {
  if (dH < 0) return `ΔH is negative, so the reaction is <b>exothermic</b>: it releases ${fmtPlain(-dH)} kJ of heat to the surroundings for the reaction as written (${eqHtml}). The products are lower in enthalpy than the reactants.`;
  if (dH > 0) return `ΔH is positive, so the reaction is <b>endothermic</b>: it absorbs ${fmtPlain(dH)} kJ of heat from the surroundings for the reaction as written. The products are higher in enthalpy than the reactants.`;
  return 'ΔH is zero: no net heat is exchanged.';
}

/** Heat released/absorbed for a given amount, from a thermochemical equation. */
export function enthalpyForAmount({ equation, dH, species, amount, unit = 'g' }) {
  const bal = balanceEquation(equation);
  const sol = new Solution('enthalpy-amount', 'Heat for a given amount');
  const d = parseMeasured(dH, 'ΔH');
  const all = [...bal.reactants, ...bal.products];
  const idx = all.findIndex((s) => s.formula === String(species).trim());
  if (idx < 0) throw new ChemError(`${species} is not in the equation.`);
  const S = all[idx];
  const a = parseMeasured(amount, `the amount of ${species}`);
  if (!(a.value > 0)) throw new ChemError('Amount must be greater than zero.');
  sol.give('Equation', 'Thermochemical equation', `${bal.html}, ΔH = ${fmtWork(d.value)} kJ`);
  sol.give(`n(${S.formula})`, `Amount of ${S.formula}`, a.value, unit);
  sol.find('q', 'Heat for this amount');
  sol.formula = 'q = (n<sub>given</sub> / coefficient) × ΔH';
  sol.define('coefficient', `coefficient of ${S.formula} in the equation`);
  let n = a.value;
  if (unit === 'g') {
    const mm = molarMass(S.formula);
    n = a.value / mm.total;
    sol.convert(`n = ${fmtWork(a.value)} g ÷ ${fmtWork(mm.total)} g/mol = ${fmtWork(n)} mol`);
  }
  const coef = bal.coefficients[idx];
  sol.substitution = `q = (${fmtWork(n)} mol / ${coef} mol) × (${fmtWork(d.value)} kJ)`;
  const q = (n / coef) * d.value;
  sol.step('Calculate', `q = ${fmtWork(q)} kJ`);
  sol.answer('Heat', 'q', q, 'kJ', Math.min(a.sf, d.sf));
  sol.interpretation = q < 0 ? `${fmtWork(-q)} kJ of heat is released.` : `${fmtWork(q)} kJ of heat is absorbed.`;
  sol.assume('ΔH is for the reaction exactly as written by the balanced equation.');
  return sol;
}

/** ΔH from measured heat and moles (sign convention explained). */
export function enthalpyFromHeat({ q, n, process = 'released' }) {
  const sol = new Solution('enthalpy-heat', 'Enthalpy change from heat');
  const qq = readQ(sol, q);
  const nn = need(n, 'moles', 'n');
  if (!(nn.value > 0)) throw new ChemError('Moles must be greater than zero.');
  const mag = Math.abs(qq.value) / 1000;
  const signed = process === 'released' ? -mag : mag;
  sol.give('|q|', `Heat ${process}`, qq.raw.value, unitLabel('energy', qq.unit));
  sol.give('n', 'Moles', nn.value, 'mol');
  sol.find('ΔH', 'Molar enthalpy change');
  sol.formula = 'ΔH = q / n   (q < 0 if heat is released by the system)';
  sol.define('q', 'heat of the system (reaction)', 'kJ');
  sol.define('n', 'moles of substance', 'mol');
  sol.step('Apply the sign convention', `Heat ${process} by the system → q = ${process === 'released' ? '−' : '+'}${fmtWork(mag)} kJ`);
  sol.substitution = `ΔH = ${fmtWork(signed)} kJ / ${fmtWork(nn.value)} mol`;
  const dH = signed / nn.value;
  sol.step('Calculate', `ΔH = ${fmtWork(dH)} kJ/mol`);
  sol.answer('Enthalpy change', 'ΔH', dH, 'kJ/mol', Math.min(qq.sf, nn.sf));
  sol.interpretation = dH < 0 ? 'Negative ΔH: the process is exothermic (the system releases heat).' : 'Positive ΔH: the process is endothermic (the system absorbs heat).';
  return sol;
}

/**
 * Hess's law. steps: [{ equation, dH, factor }] where factor is a number
 * (negative to reverse; fractions like 0.5 or "1/2" allowed). If target is given and
 * factors are omitted, they are found automatically by exact linear algebra.
 */
export function solveHess({ steps, target = null, auto = false }) {
  if (!Array.isArray(steps) || steps.length < 2) throw new ChemError('Enter at least two thermochemical equations.');
  if (steps.length > 8) throw new ChemError('At most 8 equations are supported.');
  const sol = new Solution('hess', "Hess's law");
  sol.formula = 'ΔH<sub>overall</sub> = Σ (factor<sub>i</sub> × ΔH<sub>i</sub>)';
  sol.define('factor', 'multiplier applied to an equation (negative = reversed)');
  sol.define('ΔH<sub>i</sub>', 'enthalpy change of equation i as given', 'kJ');
  sol.assume('Enthalpy is a state function, so ΔH depends only on the initial and final states, not on the path.');
  sol.assume('Reversing an equation changes the sign of ΔH; multiplying an equation multiplies ΔH by the same factor.');
  const parsed = steps.map((s, i) => {
    const eq = parseEquation(s.equation);
    const d = parseMeasured(s.dH, `ΔH of equation ${i + 1}`);
    // equations in Hess problems are given already balanced; respect given coefficients
    const vec = new Map();
    const add = (sp, sign) => {
      const key = sp.formula + (sp.state ? `(${sp.state})` : '');
      vec.set(key, (vec.get(key) || 0) + sign * (sp.given ?? 1));
    };
    eq.reactants.forEach((sp) => add(sp, -1));
    eq.products.forEach((sp) => add(sp, 1));
    const html = equationHtml(eq.reactants, eq.products, eq.reactants.map((sp) => sp.given ?? 1), eq.products.map((sp) => sp.given ?? 1));
    return { eq, d, vec, html, i };
  });
  let factors;
  let targetVec = null;
  if (target) {
    const t = parseEquation(target);
    targetVec = new Map();
    t.reactants.forEach((sp) => { const k = sp.formula + (sp.state ? `(${sp.state})` : ''); targetVec.set(k, (targetVec.get(k) || 0) - (sp.given ?? 1)); });
    t.products.forEach((sp) => { const k = sp.formula + (sp.state ? `(${sp.state})` : ''); targetVec.set(k, (targetVec.get(k) || 0) + (sp.given ?? 1)); });
    sol.give('Target', 'Target equation', equationHtml(t.reactants, t.products, t.reactants.map((sp) => sp.given ?? 1), t.products.map((sp) => sp.given ?? 1)));
  }
  parsed.forEach((p) => sol.give(`(${p.i + 1})`, `Equation ${p.i + 1}`, `${p.html}  ΔH = ${fmtPlain(p.d.value)} kJ`));
  sol.find('ΔH', 'Enthalpy change of the overall reaction');

  if (auto) {
    if (!targetVec) throw new ChemError('Enter the target equation to find the factors automatically.');
    const keys = [...new Set([...targetVec.keys(), ...parsed.flatMap((p) => [...p.vec.keys()])])];
    const A = keys.map((k) => parsed.map((p) => Frac.from(p.vec.get(k) || 0)));
    const b = keys.map((k) => Frac.from(targetVec.get(k) || 0));
    const r = solveLinear(A, b);
    if (r.status === 'none') throw new ChemError('The target equation cannot be made by combining these equations. Check the equations, states and coefficients.');
    if (r.status === 'infinite') throw new ChemError('More than one combination of these equations gives the target; enter the factors yourself.');
    factors = r.x.map((x) => ({ num: x.toNumber(), str: x.toString() }));
    sol.step('Find the factors', `Matching each substance's net amount to the target equation gives the factors: ${factors.map((f, i) => `(${i + 1}) × ${f.str}`).join(', ')}.`);
  } else {
    factors = steps.map((s, i) => {
      const str = String(s.factor ?? '1').trim();
      let num;
      if (/^-?\d+\/\d+$/.test(str)) { const [a, b] = str.split('/').map(Number); num = a / b; }
      else num = parseMeasured(str, `factor of equation ${i + 1}`).value;
      if (num === 0) throw new ChemError(`Factor of equation ${i + 1} is zero; remove the equation instead.`);
      return { num, str };
    });
  }
  // apply and explain each adjustment
  let total = 0;
  const net = new Map();
  parsed.forEach((p, i) => {
    const f = factors[i].num;
    const adj = f * p.d.value;
    total += adj;
    const what = f < 0 ? (Math.abs(f) === 1 ? 'Reverse it' : `Reverse it and multiply by ${fmtFactor(-f)}`) : f === 1 ? 'Use as written' : `Multiply by ${fmtFactor(f)}`;
    sol.step(`Equation ${i + 1}: ${what}`, `ΔH = ${fmtFactor(f)} × (${fmtPlain(p.d.value)} kJ) = ${fmtPlain(adj)} kJ${f < 0 ? ' (sign changes when reversed)' : ''}`);
    for (const [k, c] of p.vec) net.set(k, (net.get(k) || 0) + f * c);
  });
  // build the net equation
  const left = [], right = [];
  for (const [k, c] of net) {
    if (Math.abs(c) < 1e-9) continue;
    const coef = Math.abs(c);
    const ctext = Math.abs(coef - 1) < 1e-9 ? '' : fmtFactor(coef);
    const sp = parseFormula(k);
    const h = `${ctext ? `<b class="coef">${esc(ctext)}</b>` : ''}${sp.html}${sp.state ? `<span class="state">(${esc(sp.state)})</span>` : ''}`;
    (c < 0 ? left : right).push(h);
  }
  sol.step('Add the adjusted equations and cancel substances that appear on both sides', `${left.join(' + ')} → ${right.join(' + ')}`);
  if (targetVec) {
    const ok = [...new Set([...net.keys(), ...targetVec.keys()])].every((k) => Math.abs((net.get(k) || 0) - (targetVec.get(k) || 0)) < 1e-9);
    if (!ok) sol.warn('The combined equation does not match the target equation. Check the factors.');
    else sol.step('Check', 'The combined equation matches the target equation.');
  }
  sol.substitution = `ΔH = ${parsed.map((p, i) => `(${fmtFactor(factors[i].num)})(${fmtPlain(p.d.value)})`).join(' + ')}`;
  const dec = Math.min(...parsed.map((p) => p.d.decimals));
  sol.answer('Overall enthalpy change', 'ΔH', total, 'kJ', sfFromDecimals(total, Math.max(dec, 0)));
  sol.interpretation = interpretDH(total, 'overall reaction');
  sol.factors = factors.map((f) => f.str);
  return sol;
}

function fmtFactor(f) {
  if (Number.isInteger(f)) return String(f);
  for (const d of [2, 3, 4, 6]) if (Number.isInteger(Math.round(f * d * 1e9) / 1e9)) return `${Math.round(f * d)}/${d}`;
  return fmtWork(f);
}

/** Bond energy estimate: ΔH ≈ Σ BE(broken) − Σ BE(formed). */
export function bondEnergy({ broken = [], formed = [], overrides = {} }) {
  const sol = new Solution('bond-energy', 'Enthalpy from bond energies');
  if (!broken.length || !formed.length) throw new ChemError('List at least one bond broken (reactants) and one bond formed (products).');
  const get = (b) => {
    if (overrides[b.bond] !== undefined && overrides[b.bond] !== '') return parseMeasured(overrides[b.bond], `bond energy of ${b.bond}`).value;
    if (b.energy !== undefined && b.energy !== '') return parseMeasured(b.energy, `bond energy of ${b.bond}`).value;
    const e = BOND_ENERGIES[b.bond];
    if (e === undefined) throw new ChemError(`No bond energy is stored for ${b.bond}; enter it yourself.`);
    return e;
  };
  const line = (arr) => arr.map((b) => {
    const n = parseMeasured(b.count, `number of ${b.bond} bonds`).value;
    if (!(n > 0) || !Number.isInteger(n)) throw new ChemError(`The number of ${b.bond} bonds must be a positive whole number.`);
    return { ...b, n, e: get(b) };
  });
  const B = line(broken), F = line(formed);
  const sb = B.reduce((s, x) => s + x.n * x.e, 0), sf = F.reduce((s, x) => s + x.n * x.e, 0);
  sol.find('ΔH', 'Estimated enthalpy change');
  sol.formula = 'ΔH ≈ Σ BE(bonds broken) − Σ BE(bonds formed)';
  sol.define('BE', 'average bond energy (energy needed to break one mole of the bond in the gas phase)', 'kJ/mol');
  B.forEach((b) => sol.give(esc(b.bond), `Broken: ${b.n} × ${b.bond}`, b.e, 'kJ/mol'));
  F.forEach((b) => sol.give(esc(b.bond), `Formed: ${b.n} × ${b.bond}`, b.e, 'kJ/mol'));
  sol.table('Bonds', ['Bond', 'Broken or formed', 'Number', 'BE (kJ/mol)', 'Energy (kJ)'], [
    ...B.map((b) => [esc(b.bond), 'broken (energy in, +)', String(b.n), String(b.e), String(b.n * b.e)]),
    ...F.map((b) => [esc(b.bond), 'formed (energy out, −)', String(b.n), String(b.e), String(b.n * b.e)]),
  ]);
  sol.step('Energy to break bonds (absorbed)', `${B.map((b) => `${b.n}(${b.e})`).join(' + ')} = ${sb} kJ`);
  sol.step('Energy released forming bonds', `${F.map((b) => `${b.n}(${b.e})`).join(' + ')} = ${sf} kJ`);
  sol.substitution = `ΔH ≈ ${sb} kJ − ${sf} kJ`;
  const dH = sb - sf;
  sol.step('Subtract', `ΔH ≈ ${dH} kJ`);
  sol.answer('Estimated enthalpy change', 'ΔH', dH, 'kJ', Math.max(2, sfFromDecimals(dH, 0)));
  sol.interpretation = `${dH < 0 ? 'More energy is released forming the new bonds than is needed to break the old ones, so the reaction is exothermic.' : 'More energy is needed to break bonds than is released forming new ones, so the reaction is endothermic.'} Because bond energies are averages, this is an estimate; ΔH°f data give a more accurate value.`;
  sol.assume(BOND_SOURCE);
  sol.assume('All species are gases (bond energies are defined for the gas phase).');
  return sol;
}

/** Energy profile data for a diagram. */
export function energyProfile({ reactantH = 0, dH, Ea }) {
  const d = Number(dH), ea = Number(Ea), r = Number(reactantH);
  if (!Number.isFinite(d) || !Number.isFinite(ea)) throw new ChemError('Enter numbers for ΔH and the activation energy.');
  if (ea <= 0) throw new ChemError('Activation energy must be greater than zero.');
  if (ea < d) throw new ChemError('For an endothermic reaction the activation energy must be at least as large as ΔH (the transition state cannot be lower than the products).');
  const p = r + d, ts = r + ea;
  return {
    reactant: r, product: p, transition: ts, dH: d, Ea: ea, EaReverse: ea - d,
    type: d < 0 ? 'exothermic' : d > 0 ? 'endothermic' : 'thermoneutral',
    explanation: d < 0
      ? `Exothermic: the products (${fmtWork(p)} kJ) are lower than the reactants (${fmtWork(r)} kJ), so ${fmtWork(-d)} kJ is released. Reactants must still climb an activation barrier of ${fmtWork(ea)} kJ to reach the transition state. The reverse reaction has a larger barrier of ${fmtWork(ea - d)} kJ.`
      : d > 0
        ? `Endothermic: the products (${fmtWork(p)} kJ) are higher than the reactants (${fmtWork(r)} kJ), so ${fmtWork(d)} kJ is absorbed. The activation energy of ${fmtWork(ea)} kJ is at least ΔH. The reverse reaction has a smaller barrier of ${fmtWork(ea - d)} kJ.`
        : 'Reactants and products have the same enthalpy.',
  };
}

export { equationText };
