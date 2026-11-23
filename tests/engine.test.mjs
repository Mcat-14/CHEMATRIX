// Automated tests for the CHEMATRIX calculation engine. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../app/js/engine/index.js';
import { CASES } from './cases.mjs';

export function matches(c, actual) {
  if (typeof c.expected === 'number') {
    if (typeof actual !== 'number' || !Number.isFinite(actual)) return false;
    const tol = c.tol ?? 1e-9;
    return Math.abs(actual - c.expected) <= Math.max(Math.abs(c.expected) * tol, 1e-12);
  }
  return String(actual) === String(c.expected);
}

// 1. Independently verified normal cases
for (const c of CASES) {
  test(`${c.calc}: ${c.input}`, () => {
    const actual = c.run();
    assert.ok(matches(c, actual), `expected ${c.expected}, got ${actual}`);
  });
}

// 2. Invalid input handling: every error is a ChemError with a helpful message
const throwsChem = (fn, re) => assert.throws(fn, (e) => e instanceof E.ChemError && (!re || re.test(e.message)));

test('formula parser rejects invalid input', () => {
  throwsChem(() => E.parseFormula(''), /Enter a chemical formula/);
  throwsChem(() => E.parseFormula('nacl'), /capital letter/);
  throwsChem(() => E.parseFormula('Xy2'), /not an element/);
  throwsChem(() => E.parseFormula('Ca(OH'), /Missing "\)"/);
  throwsChem(() => E.parseFormula('H2O)'), /Unexpected/);
  throwsChem(() => E.parseFormula('H0'), /subscript of 0/);
  throwsChem(() => E.parseFormula('2H2O'), /cannot start with a number/);
  throwsChem(() => E.parseFormula('<script>'), /characters/);
  throwsChem(() => E.parseFormula('H'.repeat(200)), /too long/);
});

test('formula parser handles brackets, hydrates, charges and states', () => {
  const k = E.parseFormula('K4[Fe(CN)6]');
  assert.equal(k.counts.get('C'), 6);
  assert.equal(k.counts.get('N'), 6);
  const h = E.parseFormula('CuSO4.5H2O');
  assert.equal(h.counts.get('O'), 9);
  assert.equal(h.counts.get('H'), 10);
  const s = E.parseFormula('SO4^2-');
  assert.equal(s.charge, -2);
  const g = E.parseFormula('CO2(g)');
  assert.equal(g.state, 'g');
  assert.equal(E.parseFormula('Co').counts.get('Co'), 1);
  assert.equal(E.parseFormula('CO').counts.get('O'), 1);
});

test('equation balancer reports impossible or malformed equations', () => {
  throwsChem(() => E.balanceEquation('H2 + O2'), /arrow/);
  throwsChem(() => E.balanceEquation('H2 -> O2'), /only on the/);
  throwsChem(() => E.balanceEquation('H2O -> H2O2'), /No set of positive/);
  throwsChem(() => E.balanceEquation('H2 + O2 -> H2O -> H2O2'), /more than one arrow/);
  throwsChem(() => E.balanceEquation('H2O + O2 -> H2'), /(moved to the other side|No set of positive|only on the)/);
});

test('balancer checks coefficients the user typed', () => {
  const ok = E.balanceEquation('2H2 + O2 -> 2H2O');
  assert.match(ok.givenCheck, /already balance/);
  const bad = E.balanceEquation('H2 + O2 -> H2O');
  assert.equal(bad.givenCheck, null); // no coefficients typed
  const wrong = E.balanceEquation('2H2 + 2O2 -> 2H2O');
  assert.match(wrong.givenCheck, /do not balance/);
});

test('balanced equations conserve every atom', () => {
  for (const eq of ['C8H18 + O2 -> CO2 + H2O', 'Fe2O3 + CO -> Fe + CO2', 'NH4NO3 -> N2O + H2O', 'Ca(OH)2 + H3PO4 -> Ca3(PO4)2 + H2O']) {
    const b = E.balanceEquation(eq);
    assert.ok(b.table.every((r) => r.ok), eq);
  }
});

test('gas laws reject unphysical input', () => {
  throwsChem(() => E.solveTwoState({ law: 'charles', unknown: 'V2', values: { V1: { value: '2', unit: 'L' }, T1: { value: '-300', unit: 'C' }, T2: { value: '50', unit: 'C' } } }), /absolute zero/);
  throwsChem(() => E.solveTwoState({ law: 'boyle', unknown: 'V2', values: { P1: { value: '0', unit: 'atm' }, V1: { value: '2', unit: 'L' }, P2: { value: '1', unit: 'atm' } } }), /greater than zero/);
  throwsChem(() => E.solveTwoState({ law: 'boyle', unknown: 'V2', values: { P1: { value: 'abc', unit: 'atm' }, V1: { value: '2', unit: 'L' }, P2: { value: '1', unit: 'atm' } } }), /not a valid number/);
  throwsChem(() => E.solveTwoState({ law: 'boyle', unknown: 'V2', values: { V1: { value: '2', unit: 'L' }, P2: { value: '1', unit: 'atm' } } }), /Enter a value/);
  throwsChem(() => E.solveIdeal({ unknown: 'V', values: { P: { value: '1', unit: 'atm' }, n: { value: '-1', unit: 'mol' }, T: { value: '300', unit: 'K' } } }), /greater than zero/);
});

test('gas laws never use Celsius directly (Charles 0 °C → 273.15 °C doubles volume)', () => {
  const s = E.solveTwoState({ law: 'charles', unknown: 'V2', values: { V1: { value: '1.00', unit: 'L' }, T1: { value: '0', unit: 'C' }, T2: { value: '273.15', unit: 'C' } } });
  assert.ok(Math.abs(s.answers[0].value - 2) < 1e-12);
  assert.ok(s.conversions.some((c) => c.includes('273.15')));
});

test('thermochemistry validates inputs and signs', () => {
  throwsChem(() => E.solveHeat({ solveFor: 'c', q: { value: '100', unit: 'J' }, m: { value: '10', unit: 'g' }, dT: { value: '0', unit: 'C' } }), /zero/);
  throwsChem(() => E.solveHeat({ solveFor: 'm', q: { value: '100', unit: 'J' }, c: { value: '4.184', unit: 'J/gC' }, dT: { value: '-5', unit: 'C' } }), /opposite signs/);
  throwsChem(() => E.solveCalorimetry({ mode: 'unknown-c', mMetal: { value: '50' }, mWater: { value: '100' }, TMetal: { value: '100' }, TWater: { value: '20' }, Tf: { value: '10' } }), /between/);
  throwsChem(() => E.enthalpyFromFormation({ equation: 'C4H8(g) + O2(g) -> CO2(g) + H2O(l)' }), /No ΔH°f value/);
  throwsChem(() => E.energyProfile({ dH: 50, Ea: 20 }), /at least as large/);
  const exo = E.energyProfile({ dH: -30, Ea: 50 });
  assert.equal(exo.type, 'exothermic');
  assert.equal(exo.EaReverse, 80);
});

test('ΔH°f overrides are used when supplied', () => {
  const s = E.enthalpyFromFormation({ equation: 'C4H8(g) + O2(g) -> CO2(g) + H2O(l)', overrides: { 'C4H8(g)': '-0.1' } });
  // C4H8 + 6O2 -> 4CO2 + 4H2O: 4(-393.5) + 4(-285.8) - (-0.1) = -2717.1
  assert.ok(Math.abs(s.answers[0].value - -2717.1) < 1e-9);
});

test('Hess automatic factors are reported', () => {
  const s = E.solveHess({ auto: true, target: 'C(s) + 1/2O2(g) -> CO(g)', steps: [{ equation: 'C(s) + O2(g) -> CO2(g)', dH: '-393.5' }, { equation: 'CO(g) + 1/2O2(g) -> CO2(g)', dH: '-283.0' }] });
  assert.deepEqual(s.factors, ['1', '-1']);
  throwsChem(() => E.solveHess({ auto: true, target: 'N2(g) -> 2N(g)', steps: [{ equation: 'C(s) + O2(g) -> CO2(g)', dH: '-393.5' }, { equation: 'CO(g) + 1/2O2(g) -> CO2(g)', dH: '-283.0' }] }), /cannot be made/);
});

test('scientific calculator never executes code and reports errors', () => {
  throwsChem(() => E.evaluate('alert(1)'), /Unknown name/);
  throwsChem(() => E.evaluate('constructor.constructor("x")()'), /(Unknown name|Unexpected)/);
  throwsChem(() => E.evaluate('1/0'), /Division by zero/);
  throwsChem(() => E.evaluate('(2+3'), /Expected/);
  throwsChem(() => E.evaluate('sqrt(-1)'), /negative/);
  throwsChem(() => E.evaluate('log(0)'), /positive/);
  throwsChem(() => E.evaluate('2 ; 3'), /Unexpected character/);
  assert.equal(E.evaluate('sin(90)', { deg: true }), 1);
  assert.equal(E.evaluate('ans*2', { ans: 21 }), 42);
});

test('number parser accepts scientific notation styles and rejects junk', () => {
  assert.equal(E.parseMeasured('6.022x10^23').value, 6.022e23);
  assert.equal(E.parseMeasured('6.022×10^23').sf, 4);
  assert.equal(E.parseMeasured('1,000.5').value, 1000.5);
  throwsChem(() => E.parseMeasured('12abc'), /not a valid number/);
  throwsChem(() => E.parseMeasured(''), /Enter a number/);
  throwsChem(() => E.parseMeasured('1e999'), /range/);
  const amb = E.parseMeasured('100');
  assert.equal(amb.ambiguous, true);
  assert.equal(amb.sf, 3); // ambiguous zeros counted as significant, with a note
  assert.equal(E.parseMeasured('1e2').sf, 1);
});

test('HTML produced from user formulas is escaped', () => {
  assert.equal(E.formulaHtml('<b>'), '&lt;b&gt;');
  assert.equal(E.formulaHtml('H2O'), 'H<sub>2</sub>O');
  assert.equal(E.formulaHtml('SO4^2-'), 'SO<sub>4</sub><sup>2-</sup>');
});

test('practice questions are deterministic per seed and answerable', () => {
  for (const t of E.TOPICS) {
    for (const d of ['easy', 'medium', 'hard']) {
      for (let seed = 1; seed <= 15; seed++) {
        const a = E.makeQuestion(t.id, d, seed);
        const b = E.makeQuestion(t.id, d, seed);
        assert.deepEqual(a, b);
        if (a.type === 'numeric') {
          assert.ok(Number.isFinite(a.answer), `${t.id} ${d} ${seed}`);
          assert.ok(E.checkNumeric(a, String(a.answer)).ok);
          assert.ok(!E.checkNumeric(a, String(a.answer * 1.2 + 1)).ok);
        } else {
          assert.ok(a.answer >= 0 && a.answer < a.choices.length, `${t.id} ${d} ${seed}`);
          assert.equal(new Set(a.choices).size, a.choices.length);
        }
      }
    }
  }
});

test('every element has a positive mass and unique symbol', () => {
  const syms = Object.keys(E.ELEMENTS);
  assert.equal(syms.length, 118);
  for (const s of syms) assert.ok(E.ELEMENTS[s].mass > 0);
});
