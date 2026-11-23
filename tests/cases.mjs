// Verification cases with INDEPENDENTLY derived expected answers.
// Each expected value was worked out by hand from the textbook formula and the
// atomic masses / constants stated in docs/FORMULA_REFERENCE.md (the derivation
// is written in `work`), not copied from the app's output.
// Used by tests/engine.test.mjs (pass/fail) and tools/test-report.mjs (docs/TEST_REPORT.md).
import * as E from '../app/js/engine/index.js';

const first = (s) => s.answers[0].value;
const ans = (s, label) => s.answers.find((a) => a.label.startsWith(label)).value;

export const CASES = [
  // ---------- Molar mass ----------
  { calc: 'Molar mass', input: 'H2O', expected: 18.015, tol: 1e-6, work: '2(1.008) + 15.999', run: () => E.molarMass('H2O').total },
  { calc: 'Molar mass', input: 'CO2', expected: 44.009, tol: 1e-6, work: '12.011 + 2(15.999)', run: () => E.molarMass('CO2').total },
  { calc: 'Molar mass', input: 'NaCl', expected: 58.44, tol: 1e-6, work: '22.990 + 35.45', run: () => E.molarMass('NaCl').total },
  { calc: 'Molar mass', input: 'H2SO4', expected: 98.072, tol: 1e-6, work: '2(1.008) + 32.06 + 4(15.999)', run: () => E.molarMass('H2SO4').total },
  { calc: 'Molar mass', input: 'Ca(OH)2', expected: 74.092, tol: 1e-6, work: '40.078 + 2(15.999 + 1.008)', run: () => E.molarMass('Ca(OH)2').total },
  { calc: 'Molar mass', input: 'Al2(SO4)3', expected: 342.132, tol: 1e-6, work: '2(26.982) + 3(32.06 + 4×15.999)', run: () => E.molarMass('Al2(SO4)3').total },
  { calc: 'Molar mass', input: 'CuSO4·5H2O', expected: 249.677, tol: 1e-6, work: '63.546 + 32.06 + 4(15.999) + 5(18.015)', run: () => E.molarMass('CuSO4·5H2O').total },
  { calc: 'Molar mass', input: 'C6H12O6', expected: 180.156, tol: 1e-6, work: '6(12.011) + 12(1.008) + 6(15.999)', run: () => E.molarMass('C6H12O6').total },
  { calc: 'Molar mass', input: '(NH4)2SO4', expected: 132.134, tol: 1e-6, work: '2(14.007 + 4×1.008) + 32.06 + 4(15.999)', run: () => E.molarMass('(NH4)2SO4').total },
  { calc: 'Molar mass', input: 'K4[Fe(CN)6]', expected: 368.345, tol: 1e-6, work: '4(39.098) + 55.845 + 6(12.011 + 14.007)', run: () => E.molarMass('K4[Fe(CN)6]').total },

  // ---------- Mole conversions ----------
  { calc: 'Mole conversion', input: '36.0 g H2O → mol', expected: 1.998335, tol: 1e-5, work: '36.0 ÷ 18.015', run: () => first(E.moleConversion({ mode: 'mass-mol', formula: 'H2O', value: '36.0', unit: 'g' })) },
  { calc: 'Mole conversion', input: '2.50 mol CO2 → g', expected: 110.0225, tol: 1e-6, work: '2.50 × 44.009', run: () => first(E.moleConversion({ mode: 'mol-mass', formula: 'CO2', value: '2.50', unit: 'mol' })) },
  { calc: 'Mole conversion', input: '0.500 mol → molecules', expected: 3.01107038e23, tol: 1e-8, work: '0.500 × 6.02214076e23', run: () => first(E.moleConversion({ mode: 'mol-particles', formula: 'H2O', value: '0.500', unit: 'mol' })) },
  { calc: 'Mole conversion', input: '1.204e24 molecules → mol', expected: 1.999289, tol: 1e-5, work: '1.204e24 ÷ 6.02214076e23', run: () => first(E.moleConversion({ mode: 'particles-mol', formula: 'H2O', value: '1.204e24' })) },
  { calc: 'Mole conversion', input: '10.0 g NaCl → formula units', expected: 1.030481e23, tol: 1e-5, work: '(10.0 ÷ 58.44) × 6.02214076e23', run: () => first(E.moleConversion({ mode: 'mass-particles', formula: 'NaCl', value: '10.0', unit: 'g', particle: 'formula units' })) },
  { calc: 'Mole conversion', input: '250 mg H2O → mol', expected: 0.01387732, tol: 1e-5, work: '0.250 g ÷ 18.015', run: () => first(E.moleConversion({ mode: 'mass-mol', formula: 'H2O', value: '250', unit: 'mg' })) },

  // ---------- Balancing ----------
  { calc: 'Equation balancer', input: 'C3H8 + O2 -> CO2 + H2O', expected: '1,5,3,4', run: () => E.balanceEquation('C3H8 + O2 -> CO2 + H2O').coefficients.join(','), work: 'C: 3=3, H: 8=8, O: 10=6+4' },
  { calc: 'Equation balancer', input: 'Al + H2SO4 -> Al2(SO4)3 + H2', expected: '2,3,1,3', run: () => E.balanceEquation('Al + H2SO4 -> Al2(SO4)3 + H2').coefficients.join(','), work: 'Al 2=2, S 3=3, H 6=6' },
  { calc: 'Equation balancer', input: 'KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2', expected: '2,16,2,2,8,5', run: () => E.balanceEquation('KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2').coefficients.join(','), work: 'textbook redox result' },
  { calc: 'Equation balancer', input: 'Cu + HNO3 -> Cu(NO3)2 + NO + H2O', expected: '3,8,3,2,4', run: () => E.balanceEquation('Cu + HNO3 -> Cu(NO3)2 + NO + H2O').coefficients.join(','), work: 'textbook redox result' },
  { calc: 'Equation balancer', input: 'Fe^3+ + Cu -> Fe^2+ + Cu^2+', expected: '2,1,2,1', run: () => E.balanceEquation('Fe^3+ + Cu -> Fe^2+ + Cu^2+').coefficients.join(','), work: 'charge: 6 = 4 + 2' },
  { calc: 'Equation balancer', input: 'C6H12O6 + O2 -> CO2 + H2O', expected: '1,6,6,6', run: () => E.balanceEquation('C6H12O6 + O2 -> CO2 + H2O').coefficients.join(','), work: 'C 6, H 12, O 18' },
  { calc: 'Equation balancer', input: 'Ca3(PO4)2 + H2SO4 -> CaSO4 + H3PO4', expected: '1,3,3,2', run: () => E.balanceEquation('Ca3(PO4)2 + H2SO4 -> CaSO4 + H3PO4').coefficients.join(','), work: 'Ca 3, P 2, S 3' },

  // ---------- Classification ----------
  { calc: 'Reaction classifier', input: '2Na + Cl2 -> 2NaCl', expected: 'synthesis', run: () => E.classifyReaction('2Na + Cl2 -> 2NaCl').type, work: 'A + B → AB' },
  { calc: 'Reaction classifier', input: '2H2O2 -> 2H2O + O2', expected: 'decomposition', run: () => E.classifyReaction('2H2O2 -> 2H2O + O2').type, work: 'AB → A + B' },
  { calc: 'Reaction classifier', input: 'Zn + CuSO4 -> ZnSO4 + Cu', expected: 'single-displacement', run: () => E.classifyReaction('Zn + CuSO4 -> ZnSO4 + Cu').type, work: 'A + BC → AC + B' },
  { calc: 'Reaction classifier', input: 'AgNO3 + NaCl -> AgCl + NaNO3', expected: 'double-displacement', run: () => E.classifyReaction('AgNO3 + NaCl -> AgCl + NaNO3').type, work: 'AB + CD → AD + CB' },
  { calc: 'Reaction classifier', input: 'C3H8 + 5O2 -> 3CO2 + 4H2O', expected: 'combustion', run: () => E.classifyReaction('C3H8 + 5O2 -> 3CO2 + 4H2O').type, work: 'hydrocarbon + O2 → CO2 + H2O' },
  { calc: 'Reaction classifier', input: 'NH3 + O2 -> NO + H2O (not supported)', expected: 'null', run: () => String(E.classifyReaction('4NH3 + 5O2 -> 4NO + 6H2O').type), work: 'not one of the five patterns' },

  // ---------- Product prediction ----------
  { calc: 'Product prediction', input: 'AgNO3 + NaCl', expected: 'AgCl(s)', run: () => E.predictProducts('AgNO3 + NaCl').products.find((p) => p.includes('(s)')), work: 'AgCl insoluble (halide rule)' },
  { calc: 'Product prediction', input: 'Cu + HCl', expected: 'no-reaction', run: () => E.predictProducts('Cu + HCl').status, work: 'Cu below H in activity series' },
  { calc: 'Product prediction', input: 'KCl + NaNO3', expected: 'no-reaction', run: () => E.predictProducts('KCl + NaNO3').status, work: 'all products soluble' },
  { calc: 'Product prediction', input: 'Fe + O2 (charge not given)', expected: 'needs-info', run: () => E.predictProducts('Fe + O2').status, work: 'Fe2+ or Fe3+ possible' },
  { calc: 'Product prediction', input: 'Fe + O2 with Fe3+', expected: '4Fe + 3O2 → 2Fe2O3', run: () => E.predictProducts('Fe + O2', { charges: { Fe: 3 } }).balanced.text, work: 'criss-cross Fe3+/O2−' },

  // ---------- Mole ratio / limiting / yield ----------
  { calc: 'Mole ratio', input: '6.00 mol H2 → mol NH3 (N2 + 3H2 → 2NH3)', expected: 4.0, tol: 1e-9, work: '6.00 × 2/3', run: () => first(E.moleRatio({ equation: 'N2 + H2 -> NH3', known: 'H2', amount: '6.00', unit: 'mol', target: 'NH3' })) },
  { calc: 'Mole ratio', input: '10.0 g H2 → g NH3', expected: 56.31944, tol: 1e-5, work: '(10.0/2.016) × 2/3 × 17.031', run: () => first(E.moleRatio({ equation: 'N2 + H2 -> NH3', known: 'H2', amount: '10.0', unit: 'g', target: 'NH3', outUnit: 'g' })) },
  { calc: 'Limiting reactant', input: '4.00 g H2 + 32.0 g O2 → H2O', expected: 'H2', run: () => E.limitingReactant({ equation: 'H2 + O2 -> H2O', amounts: [{ formula: 'H2', value: '4.00', unit: 'g' }, { formula: 'O2', value: '32.0', unit: 'g' }] }).limiting, work: '1.984/2 = 0.992 < 1.000/1' },
  { calc: 'Theoretical yield', input: '4.00 g H2 + 32.0 g O2 → g H2O', expected: 35.74405, tol: 1e-5, work: '(4.00/2.016) × 18.015', run: () => ans(E.limitingReactant({ equation: 'H2 + O2 -> H2O', amounts: [{ formula: 'H2', value: '4.00', unit: 'g' }, { formula: 'O2', value: '32.0', unit: 'g' }] }), 'Theoretical') },
  { calc: 'Excess remaining', input: 'O2 left over (g)', expected: 0.25597, tol: 1e-3, work: '(32.0/31.998 − 0.99206) × 31.998', run: () => ans(E.limitingReactant({ equation: 'H2 + O2 -> H2O', amounts: [{ formula: 'H2', value: '4.00', unit: 'g' }, { formula: 'O2', value: '32.0', unit: 'g' }] }), 'Excess') },
  { calc: 'Theoretical yield', input: '10.0 g Al + 10.0 g O2 → g Al2O3', expected: 18.8943, tol: 1e-5, work: '(10.0/26.982)/4 × 2 × 101.961', run: () => ans(E.limitingReactant({ equation: 'Al + O2 -> Al2O3', amounts: [{ formula: 'Al', value: '10.0', unit: 'g' }, { formula: 'O2', value: '10.0', unit: 'g' }] }), 'Theoretical') },
  { calc: 'Percent yield', input: 'actual 8.50 g, theoretical 10.0 g', expected: 85.0, tol: 1e-9, work: '8.50/10.0 × 100', run: () => first(E.percentYield({ solveFor: 'percent', actual: '8.50', theoretical: '10.0' })) },
  { calc: 'Percent yield', input: 'theoretical 25.0 g at 80.0 % → actual', expected: 20.0, tol: 1e-9, work: '0.800 × 25.0', run: () => first(E.percentYield({ solveFor: 'actual', percent: '80.0', theoretical: '25.0' })) },

  // ---------- Gas laws ----------
  { calc: "Boyle's law", input: '1.00 atm, 2.00 L → 2.50 atm', expected: 0.8, tol: 1e-9, work: '1.00 × 2.00 / 2.50', run: () => first(E.solveTwoState({ law: 'boyle', unknown: 'V2', values: { P1: { value: '1.00', unit: 'atm' }, V1: { value: '2.00', unit: 'L' }, P2: { value: '2.50', unit: 'atm' } } })) },
  { calc: "Boyle's law", input: '760 mmHg, 500 mL → 2.00 atm (answer in mL)', expected: 250, tol: 1e-6, work: '760 mmHg = 1.00 atm; 1 × 500 / 2', run: () => first(E.solveTwoState({ law: 'boyle', unknown: 'V2', outUnit: 'mL', values: { P1: { value: '760', unit: 'mmHg' }, V1: { value: '500', unit: 'mL' }, P2: { value: '2.00', unit: 'atm' } } })) },
  { calc: "Charles's law", input: '2.00 L at 25 °C → 50 °C', expected: 2.167701, tol: 1e-6, work: '2.00 × 323.15 / 298.15', run: () => first(E.solveTwoState({ law: 'charles', unknown: 'V2', values: { V1: { value: '2.00', unit: 'L' }, T1: { value: '25', unit: 'C' }, T2: { value: '50', unit: 'C' } } })) },
  { calc: "Gay-Lussac's law", input: '1.00 atm at 300 K → 450 K', expected: 1.5, tol: 1e-9, work: '1.00 × 450 / 300', run: () => first(E.solveTwoState({ law: 'gayLussac', unknown: 'P2', values: { P1: { value: '1.00', unit: 'atm' }, T1: { value: '300', unit: 'K' }, T2: { value: '450', unit: 'K' } } })) },
  { calc: "Gay-Lussac's law", input: 'Find T2 (°C): 100 kPa at 20 °C → 150 kPa', expected: 166.575, tol: 1e-5, work: 'T2 = 293.15 × 1.5 = 439.725 K = 166.575 °C', run: () => ans(E.solveTwoState({ law: 'gayLussac', unknown: 'T2', outUnit: 'C', values: { P1: { value: '100', unit: 'kPa' }, T1: { value: '20', unit: 'C' }, P2: { value: '150', unit: 'kPa' } } }), 'Temperature in') },
  { calc: 'Combined gas law', input: '101.3 kPa, 2.00 L, 298 K → 202.6 kPa, 323 K', expected: 1.083893, tol: 1e-6, work: '101.3 × 2.00 × 323 / (298 × 202.6)', run: () => first(E.solveTwoState({ law: 'combined', unknown: 'V2', values: { P1: { value: '101.3', unit: 'kPa' }, V1: { value: '2.00', unit: 'L' }, T1: { value: '298', unit: 'K' }, P2: { value: '202.6', unit: 'kPa' }, T2: { value: '323', unit: 'K' } } })) },
  { calc: "Avogadro's law", input: '5.00 L, 0.200 mol → 0.500 mol', expected: 12.5, tol: 1e-9, work: '5.00 × 0.500 / 0.200', run: () => first(E.solveTwoState({ law: 'avogadro', unknown: 'V2', values: { V1: { value: '5.00', unit: 'L' }, n1: { value: '0.200', unit: 'mol' }, n2: { value: '0.500', unit: 'mol' } } })) },
  { calc: 'Ideal gas law', input: 'V of 1.00 mol at 273.15 K, 1.00 atm', expected: 22.41397, tol: 1e-5, work: '1 × 0.0820574 × 273.15 / 1', run: () => first(E.solveIdeal({ unknown: 'V', outUnit: 'L', values: { P: { value: '1.00', unit: 'atm' }, n: { value: '1.00', unit: 'mol' }, T: { value: '273.15', unit: 'K' } } })) },
  { calc: 'Ideal gas law', input: 'P (kPa) of 2.00 mol in 10.0 L at 300 K', expected: 498.8678, tol: 1e-6, work: '2 × 8.314462618 × 300 / 10.0', run: () => first(E.solveIdeal({ unknown: 'P', outUnit: 'kPa', values: { V: { value: '10.0', unit: 'L' }, n: { value: '2.00', unit: 'mol' }, T: { value: '300', unit: 'K' } } })) },
  { calc: 'Ideal gas law', input: 'n at 1.00 atm, 5.00 L, 25 °C', expected: 0.2043702, tol: 1e-5, work: '5.00 / (0.0820574 × 298.15) = 5.00 / 24.46540', run: () => first(E.solveIdeal({ unknown: 'n', values: { P: { value: '1.00', unit: 'atm' }, V: { value: '5.00', unit: 'L' }, T: { value: '25', unit: 'C' } } })) },
  { calc: 'Ideal gas law', input: 'T of 0.500 mol at 1.50 atm, 10.0 L', expected: 365.5975, tol: 1e-5, work: '15.0 / (0.500 × 0.0820574)', run: () => first(E.solveIdeal({ unknown: 'T', values: { P: { value: '1.50', unit: 'atm' }, V: { value: '10.0', unit: 'L' }, n: { value: '0.500', unit: 'mol' } } })) },
  { calc: 'Ideal gas law', input: 'V of 1.00 mol at 0 °C, 760 mmHg', expected: 22.41397, tol: 1e-5, work: 'R = 62.3636 L·mmHg/(mol·K)', run: () => first(E.solveIdeal({ unknown: 'V', outUnit: 'L', values: { P: { value: '760', unit: 'mmHg' }, n: { value: '1.00', unit: 'mol' }, T: { value: '0', unit: 'C' } } })) },
  { calc: 'Gas density', input: 'CO2 at 1.00 atm, 273.15 K', expected: 1.963463, tol: 1e-5, work: '1.00 × 44.009 / (0.0820574 × 273.15)', run: () => first(E.gasDensity({ solveFor: 'd', P: { value: '1.00', unit: 'atm' }, T: { value: '273.15', unit: 'K' }, formula: 'CO2' })) },
  { calc: 'Gas molar mass', input: '1.60 g in 1.12 L at 0 °C, 1.00 atm', expected: 32.02, tol: 1e-4, work: '1.60 × 0.0820574 × 273.15 / 1.12', run: () => first(E.gasMolarMass({ m: { value: '1.60', unit: 'g' }, P: { value: '1.00', unit: 'atm' }, V: { value: '1.12', unit: 'L' }, T: { value: '0', unit: 'C' } })) },
  { calc: 'Gas molar mass (from density)', input: 'd = 1.25 g/L at 1.00 atm, 273.15 K', expected: 28.0174, tol: 1e-4, work: '1.25 × 0.0820574 × 273.15 / 1.00', run: () => first(E.gasDensity({ solveFor: 'M', P: { value: '1.00', unit: 'atm' }, T: { value: '273.15', unit: 'K' }, d: { value: '1.25' } })) },

  // ---------- Thermochemistry ----------
  { calc: 'Heat (q = mcΔT)', input: '100 g water, 20 → 30 °C', expected: 4184, tol: 1e-9, work: '100 × 4.184 × 10', run: () => first(E.solveHeat({ solveFor: 'q', m: { value: '100', unit: 'g' }, c: { value: '4.184', unit: 'J/gC' }, Ti: { value: '20', unit: 'C' }, Tf: { value: '30', unit: 'C' } })) },
  { calc: 'Heat (q = mcΔT)', input: 'mass from q = 4184 J, ΔT = 10 °C, water', expected: 100, tol: 1e-9, work: '4184 / (4.184 × 10)', run: () => first(E.solveHeat({ solveFor: 'm', q: { value: '4184', unit: 'J' }, c: { value: '4.184', unit: 'J/gC' }, dT: { value: '10', unit: 'C' } })) },
  { calc: 'Specific heat', input: '385 J, 10.0 g, ΔT = 100 °C', expected: 0.385, tol: 1e-9, work: '385 / (10.0 × 100)', run: () => first(E.solveHeat({ solveFor: 'c', q: { value: '385', unit: 'J' }, m: { value: '10.0', unit: 'g' }, dT: { value: '100', unit: 'C' } })) },
  { calc: 'Heat (q = mcΔT)', input: 'ΔT from 1.000 kJ into 50.0 g water', expected: 4.780115, tol: 1e-6, work: '1000 / (50.0 × 4.184)', run: () => first(E.solveHeat({ solveFor: 'dT', q: { value: '1.000', unit: 'kJ' }, m: { value: '50.0', unit: 'g' }, c: { value: '4.184', unit: 'J/gC' } })) },
  { calc: 'Heat (q = mcΔT)', input: '1.00 kg iron cools 80 → 30 °C (q negative)', expected: -22450, tol: 1e-9, work: '1000 × 0.449 × (−50)', run: () => first(E.solveHeat({ solveFor: 'q', m: { value: '1.00', unit: 'kg' }, c: { value: '0.449', unit: 'J/gC' }, Ti: { value: '80', unit: 'C' }, Tf: { value: '30', unit: 'C' } })) },
  { calc: 'Final temperature', input: '50.0 g water at 20.0 °C absorbs 2092 J', expected: 30.0, tol: 1e-9, work: '20.0 + 2092/(50.0 × 4.184)', run: () => first(E.solveTemperature({ solveFor: 'Tf', q: { value: '2092', unit: 'J' }, m: { value: '50.0', unit: 'g' }, c: { value: '4.184', unit: 'J/gC' }, Ti: { value: '20.0', unit: 'C' } })) },
  { calc: 'Calorimetry (mixing)', input: '100 g water 80 °C + 200 g water 20 °C', expected: 40.0, tol: 1e-9, work: '(100×80 + 200×20)/300', run: () => first(E.solveCalorimetry({ mode: 'mixing', m1: { value: '100' }, c1: { value: '4.184' }, T1: { value: '80', unit: 'C' }, m2: { value: '200' }, c2: { value: '4.184' }, T2: { value: '20', unit: 'C' } })) },
  { calc: 'Calorimetry (unknown metal)', input: '50.0 g at 100.0 °C into 100.0 g water at 20.0 °C, Tf 22.0 °C', expected: 0.2145641, tol: 1e-6, work: '100.0 × 4.184 × 2.0 / (50.0 × 78.0)', run: () => first(E.solveCalorimetry({ mode: 'unknown-c', mMetal: { value: '50.0' }, mWater: { value: '100.0' }, TMetal: { value: '100.0' }, TWater: { value: '20.0' }, Tf: { value: '22.0' } })) },
  { calc: 'Calorimetry (coffee cup)', input: '100.0 g soln, ΔT +5.00 °C, 0.0500 mol → ΔH', expected: -41.84, tol: 1e-9, work: '−(100.0 × 4.184 × 5.00)/1000/0.0500', run: () => ans(E.solveCalorimetry({ mode: 'reaction', m: { value: '100.0' }, dT: { value: '5.00', unit: 'C' }, n: { value: '0.0500' } }), 'Enthalpy') },
  { calc: 'Calorimetry (bomb)', input: 'C = 10.0 kJ/°C, ΔT = 2.50 °C', expected: -25.0, tol: 1e-9, work: '−10.0 × 2.50', run: () => first(E.solveCalorimetry({ mode: 'bomb', C: { value: '10.0', unit: 'kJ/C' }, dT: { value: '2.50', unit: 'C' } })) },
  { calc: 'Enthalpy (ΔH°f)', input: 'CH4(g) + 2O2(g) → CO2(g) + 2H2O(l)', expected: -890.5, tol: 1e-9, work: '−393.5 + 2(−285.8) − (−74.6)', run: () => first(E.enthalpyFromFormation({ equation: 'CH4(g) + O2(g) -> CO2(g) + H2O(l)' })) },
  { calc: 'Enthalpy (ΔH°f)', input: 'CaCO3(s) → CaO(s) + CO2(g)', expected: 179.2, tol: 1e-9, work: '−634.9 − 393.5 + 1207.6', run: () => first(E.enthalpyFromFormation({ equation: 'CaCO3(s) -> CaO(s) + CO2(g)' })) },
  { calc: 'Enthalpy for an amount', input: '32.0 g CH4 with ΔH = −890 kJ', expected: -1775.229, tol: 1e-5, work: '(32.0/16.043) × −890', run: () => first(E.enthalpyForAmount({ equation: 'CH4 + 2O2 -> CO2 + 2H2O', dH: '-890', species: 'CH4', amount: '32.0', unit: 'g' })) },
  { calc: 'Molar enthalpy', input: '5.56 kJ released by 0.0100 mol', expected: -556, tol: 1e-9, work: '−5.56 / 0.0100', run: () => first(E.enthalpyFromHeat({ q: { value: '5.56', unit: 'kJ' }, n: { value: '0.0100' }, process: 'released' })) },
  { calc: "Hess's law (manual)", input: 'C + O2 → CO2 (−393.5) ×1; CO + ½O2 → CO2 (−283.0) ×−1', expected: -110.5, tol: 1e-9, work: '−393.5 + 283.0', run: () => first(E.solveHess({ steps: [{ equation: 'C(s) + O2(g) -> CO2(g)', dH: '-393.5', factor: '1' }, { equation: 'CO(g) + 1/2O2(g) -> CO2(g)', dH: '-283.0', factor: '-1' }] })) },
  { calc: "Hess's law (automatic)", input: 'target C + ½O2 → CO', expected: -110.5, tol: 1e-9, work: 'factors 1 and −1 found by linear algebra', run: () => first(E.solveHess({ auto: true, target: 'C(s) + 1/2O2(g) -> CO(g)', steps: [{ equation: 'C(s) + O2(g) -> CO2(g)', dH: '-393.5' }, { equation: 'CO(g) + 1/2O2(g) -> CO2(g)', dH: '-283.0' }] })) },
  { calc: "Hess's law (automatic)", input: 'target 2C + H2 → C2H2 from combustion data', expected: 226.7, tol: 1e-9, work: '2(−393.5) + (−285.8) − (−1299.5)', run: () => first(E.solveHess({ auto: true, target: '2C(s) + H2(g) -> C2H2(g)', steps: [{ equation: 'C(s) + O2(g) -> CO2(g)', dH: '-393.5' }, { equation: 'H2(g) + 1/2O2(g) -> H2O(l)', dH: '-285.8' }, { equation: '2C2H2(g) + 5O2(g) -> 4CO2(g) + 2H2O(l)', dH: '-2599.0' }] })) },
  { calc: 'Bond energy', input: 'H2 + Cl2 → 2HCl', expected: -185, tol: 1e-9, work: '(436 + 243) − 2(432)', run: () => first(E.bondEnergy({ broken: [{ bond: 'H–H', count: '1' }, { bond: 'Cl–Cl', count: '1' }], formed: [{ bond: 'H–Cl', count: '2' }] })) },
  { calc: 'Bond energy', input: 'CH4 + 2O2 → CO2 + 2H2O', expected: -798, tol: 1e-9, work: '[4(415) + 2(498)] − [2(799) + 4(464)]', run: () => first(E.bondEnergy({ broken: [{ bond: 'H–C', count: '4' }, { bond: 'O=O', count: '2' }], formed: [{ bond: 'C=O (in CO₂)', count: '2' }, { bond: 'H–O', count: '4' }] })) },

  // ---------- Units ----------
  { calc: 'Unit converter', input: '1.00 atm → kPa', expected: 101.325, tol: 1e-12, work: 'definition', run: () => E.convert(1, 'pressure', 'atm', 'kPa') },
  { calc: 'Unit converter', input: '760 mmHg → atm', expected: 1.0000002, tol: 1e-6, work: '760 × 133.322387 / 101325', run: () => E.convert(760, 'pressure', 'mmHg', 'atm') },
  { calc: 'Unit converter', input: '760 torr → atm', expected: 1, tol: 1e-12, work: 'definition (1 torr = 1/760 atm)', run: () => E.convert(760, 'pressure', 'torr', 'atm') },
  { calc: 'Unit converter', input: '25 °C → K', expected: 298.15, tol: 1e-12, work: '25 + 273.15', run: () => E.convert(25, 'temperature', 'C', 'K') },
  { calc: 'Unit converter', input: '212 °F → °C', expected: 100, tol: 1e-12, work: '(212 − 32) × 5/9', run: () => E.convert(212, 'temperature', 'F', 'C') },
  { calc: 'Unit converter', input: '1 kcal → J', expected: 4184, tol: 1e-12, work: 'thermochemical calorie', run: () => E.convert(1, 'energy', 'kcal', 'J') },
  { calc: 'Unit converter', input: '500 mL → L', expected: 0.5, tol: 1e-12, work: '500 / 1000', run: () => E.convert(500, 'volume', 'mL', 'L') },
  { calc: 'Gas constant selection', input: 'R in L·mmHg/(mol·K)', expected: 62.36359, tol: 1e-6, work: '8314.462618 / 133.322387', run: () => E.gasConstantFor('mmHg', 'L') },

  // ---------- Scientific calculator ----------
  { calc: 'Scientific calculator', input: '2 + 3 × 4', expected: 14, tol: 1e-12, work: 'precedence', run: () => E.evaluate('2 + 3 × 4') },
  { calc: 'Scientific calculator', input: '2^3^2', expected: 512, tol: 1e-12, work: 'right-associative power', run: () => E.evaluate('2^3^2') },
  { calc: 'Scientific calculator', input: '-2^2', expected: -4, tol: 1e-12, work: 'power before negation', run: () => E.evaluate('-2^2') },
  { calc: 'Scientific calculator', input: 'sqrt(16) + log(1000)', expected: 7, tol: 1e-12, work: '4 + 3', run: () => E.evaluate('sqrt(16) + log(1000)') },
  { calc: 'Scientific calculator', input: '6.02e23 / 2', expected: 3.01e23, tol: 1e-12, work: 'scientific notation', run: () => E.evaluate('6.02e23 / 2') },
  { calc: 'Scientific calculator', input: '2(3+4)', expected: 14, tol: 1e-12, work: 'implicit multiplication', run: () => E.evaluate('2(3+4)') },
  { calc: 'Scientific calculator', input: 'ln(e) + 5!', expected: 121, tol: 1e-12, work: '1 + 120', run: () => E.evaluate('ln(e) + 5!') },

  // ---------- Significant figures ----------
  { calc: 'Significant figures', input: '0.00120', expected: 3, run: () => E.countSigFigs('0.00120').sf, work: 'leading zeros not significant' },
  { calc: 'Significant figures', input: '1200 (ambiguous)', expected: 2, run: () => E.countSigFigs('1200').sf, work: 'trailing zeros without decimal point' },
  { calc: 'Significant figures', input: '1200.', expected: 4, run: () => E.countSigFigs('1200.').sf, work: 'decimal point makes zeros significant' },
  { calc: 'Significant figures', input: '1.20e3', expected: 3, run: () => E.countSigFigs('1.20e3').sf, work: 'mantissa digits' },
  { calc: 'Rounding display', input: '298.15 to 3 sf', expected: '298', run: () => E.fmtSf(298.15, 3), work: '—' },
  { calc: 'Rounding display', input: '100 to 3 sf', expected: '100.', run: () => E.fmtSf(100, 3), work: 'trailing decimal point shows 3 sf' },
  { calc: 'Rounding display', input: '0.000123456 to 3 sf', expected: '1.23 × 10<sup>-4</sup>', run: () => E.fmtSf(0.000123456, 3), work: 'scientific notation for small values' },
  { calc: 'Answer sig figs', input: "Charles's law 2.00 L at 25 °C → 50 °C", expected: 3, run: () => E.solveTwoState({ law: 'charles', unknown: 'V2', values: { V1: { value: '2.00', unit: 'L' }, T1: { value: '25', unit: 'C' }, T2: { value: '50', unit: 'C' } } }).answers[0].ruleSf, work: '2.00 has 3 sf; 298 K and 323 K have 3 sf' },
];
