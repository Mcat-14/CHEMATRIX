// Centralised unit conversion and physical constants.
// Sources: 2019 SI redefinition (CODATA 2018 exact values) for N_A, k_B and R;
// standard atmosphere and thermochemical calorie as defined by NIST SP 811.
import { ChemError } from './errors.js';

export const CONSTANTS = {
  NA: { value: 6.02214076e23, unit: 'mol⁻¹', name: "Avogadro's constant", source: 'SI 2019 (exact)' },
  R_J: { value: 8.314462618, unit: 'J/(mol·K)', name: 'Gas constant', source: 'CODATA 2018 (N_A·k_B, exact)' },
  R_LATM: { value: 0.082057366, unit: 'L·atm/(mol·K)', name: 'Gas constant', source: 'R / 101.325 J per L·atm' },
  R_LKPA: { value: 8.314462618, unit: 'L·kPa/(mol·K)', name: 'Gas constant', source: 'numerically equal to R in J/(mol·K)' },
  R_LMMHG: { value: 62.36359, unit: 'L·mmHg/(mol·K)', name: 'Gas constant', source: 'R / 0.133322 J per L·mmHg' },
  ATM_PA: { value: 101325, unit: 'Pa', name: 'Standard atmosphere', source: 'exact by definition' },
  CAL_J: { value: 4.184, unit: 'J', name: 'Thermochemical calorie', source: 'exact by definition' },
  C_WATER: { value: 4.184, unit: 'J/(g·°C)', name: 'Specific heat of liquid water (≈25 °C)', source: 'common textbook value (4.18 J/g·°C)' },
  STP_MOLAR_VOLUME: { value: 22.414, unit: 'L/mol', name: 'Molar volume of ideal gas at 0 °C and 1 atm', source: 'R·T/P with T = 273.15 K, P = 1 atm' },
};

// Each quantity: factor converts the unit TO the base unit (base * factor).
export const UNITS = {
  pressure: {
    base: 'Pa',
    units: {
      atm: { factor: 101325, label: 'atm' },
      kPa: { factor: 1000, label: 'kPa' },
      Pa: { factor: 1, label: 'Pa' },
      mmHg: { factor: 133.322387415, label: 'mmHg' },
      torr: { factor: 101325 / 760, label: 'torr' },
      bar: { factor: 1e5, label: 'bar' },
      psi: { factor: 6894.757293168, label: 'psi' },
    },
  },
  volume: {
    base: 'L',
    units: {
      L: { factor: 1, label: 'L' },
      mL: { factor: 1e-3, label: 'mL' },
      'cm3': { factor: 1e-3, label: 'cm³' },
      'dm3': { factor: 1, label: 'dm³' },
      'm3': { factor: 1000, label: 'm³' },
    },
  },
  mass: {
    base: 'g',
    units: {
      g: { factor: 1, label: 'g' },
      kg: { factor: 1000, label: 'kg' },
      mg: { factor: 1e-3, label: 'mg' },
      lb: { factor: 453.59237, label: 'lb' },
    },
  },
  energy: {
    base: 'J',
    units: {
      J: { factor: 1, label: 'J' },
      kJ: { factor: 1000, label: 'kJ' },
      cal: { factor: 4.184, label: 'cal' },
      kcal: { factor: 4184, label: 'kcal (Cal)' },
    },
  },
  amount: {
    base: 'mol',
    units: {
      mol: { factor: 1, label: 'mol' },
      mmol: { factor: 1e-3, label: 'mmol' },
      kmol: { factor: 1000, label: 'kmol' },
    },
  },
  concentration: {
    base: 'M',
    units: {
      M: { factor: 1, label: 'M (mol/L)' },
      mM: { factor: 1e-3, label: 'mM' },
      'uM': { factor: 1e-6, label: 'µM' },
    },
  },
  temperature: {
    base: 'K',
    units: {
      K: { label: 'K' },
      C: { label: '°C' },
      F: { label: '°F' },
    },
  },
};

export function unitLabel(quantity, unit) {
  return UNITS[quantity]?.units[unit]?.label ?? unit;
}

export function toKelvin(value, unit) {
  let k;
  if (unit === 'K') k = value;
  else if (unit === 'C') k = value + 273.15;
  else if (unit === 'F') k = (value - 32) * 5 / 9 + 273.15;
  else throw new ChemError(`Unknown temperature unit "${unit}".`);
  return k;
}

export function fromKelvin(k, unit) {
  if (unit === 'K') return k;
  if (unit === 'C') return k - 273.15;
  if (unit === 'F') return (k - 273.15) * 9 / 5 + 32;
  throw new ChemError(`Unknown temperature unit "${unit}".`);
}

/** Convert a temperature difference (ΔT). A difference of 1 K equals 1 °C equals 1.8 °F. */
export function deltaToKelvin(dv, unit) {
  if (unit === 'K' || unit === 'C') return dv;
  if (unit === 'F') return dv * 5 / 9;
  throw new ChemError(`Unknown temperature unit "${unit}".`);
}
export function deltaFromKelvin(dk, unit) {
  if (unit === 'K' || unit === 'C') return dk;
  if (unit === 'F') return dk * 9 / 5;
  throw new ChemError(`Unknown temperature unit "${unit}".`);
}

/** Generic conversion between two units of the same quantity. */
export function convert(value, quantity, from, to) {
  const q = UNITS[quantity];
  if (!q) throw new ChemError(`Unknown quantity "${quantity}".`);
  if (quantity === 'temperature') {
    const k = toKelvin(value, from);
    if (k < 0) throw new ChemError('That temperature is below absolute zero (0 K), which is physically impossible.');
    return fromKelvin(k, to);
  }
  const f = q.units[from], t = q.units[to];
  if (!f) throw new ChemError(`Unknown ${quantity} unit "${from}".`);
  if (!t) throw new ChemError(`Unknown ${quantity} unit "${to}".`);
  return value * f.factor / t.factor;
}

/** Gas constant matching chosen pressure and volume units (R in [P]·[V]/(mol·K)). */
export function gasConstantFor(pUnit, vUnit) {
  // R in Pa·m³/(mol·K) = J/(mol·K); rescale to the requested units
  const p = UNITS.pressure.units[pUnit];
  const vol = UNITS.volume.units[vUnit];
  if (!p || !vol) throw new ChemError('Unsupported pressure or volume unit for the gas constant.');
  const RinPaL = CONSTANTS.R_J.value * 1000; // Pa·L/(mol·K)
  return RinPaL / p.factor / vol.factor;
}

export function rLabel(pUnit, vUnit) {
  return `${unitLabel('volume', vUnit)}·${unitLabel('pressure', pUnit)}/(mol·K)`;
}
