// Thermochemical reference data.
//
// Standard enthalpies of formation, ΔH°f (kJ/mol) at 298.15 K and 1 bar.
// Values follow the CRC Handbook of Chemistry and Physics table "Standard
// Thermodynamic Properties of Chemical Substances" (also reproduced in the
// appendices of OpenStax Chemistry 2e). Textbooks round some values differently
// by a few tenths of a kJ/mol; users can override any value in the app.
export const DHF_SOURCE = 'CRC Handbook of Chemistry and Physics, standard thermodynamic properties at 298.15 K (see also OpenStax Chemistry 2e, Appendix G). Your textbook may differ by a few tenths of kJ/mol.';

// key: formula(state)
export const DHF = {
  'H2O(l)': -285.8, 'H2O(g)': -241.8, 'H2O2(l)': -187.8,
  'CO2(g)': -393.5, 'CO(g)': -110.5,
  'CH4(g)': -74.6, 'C2H6(g)': -84.0, 'C3H8(g)': -103.8, 'C4H10(g)': -125.7,
  'C2H4(g)': 52.4, 'C2H2(g)': 227.4, 'C6H6(l)': 49.1, 'C8H18(l)': -250.1,
  'CH3OH(l)': -239.2, 'C2H5OH(l)': -277.6, 'C6H12O6(s)': -1273.3, 'C12H22O11(s)': -2226.1,
  'NH3(g)': -45.9, 'NO(g)': 91.3, 'NO2(g)': 33.2, 'N2O(g)': 81.6, 'N2O4(g)': 11.1, 'HNO3(l)': -174.1,
  'SO2(g)': -296.8, 'SO3(g)': -395.7, 'H2S(g)': -20.6, 'H2SO4(l)': -814.0,
  'HF(g)': -273.3, 'HCl(g)': -92.3, 'HBr(g)': -36.3, 'HI(g)': 26.5,
  'NaCl(s)': -411.2, 'NaOH(s)': -425.8, 'Na2CO3(s)': -1130.7, 'NaHCO3(s)': -950.8,
  'KCl(s)': -436.5, 'KClO3(s)': -397.7,
  'CaCO3(s)': -1207.6, 'CaO(s)': -634.9, 'Ca(OH)2(s)': -985.2,
  'MgO(s)': -601.6, 'Al2O3(s)': -1675.7, 'Fe2O3(s)': -824.2, 'Fe3O4(s)': -1118.4,
  'CuO(s)': -157.3, 'ZnO(s)': -350.5, 'SiO2(s)': -910.7, 'AgCl(s)': -127.0,
  // elements in their standard states (zero by definition)
  'H2(g)': 0, 'O2(g)': 0, 'N2(g)': 0, 'F2(g)': 0, 'Cl2(g)': 0, 'Br2(l)': 0, 'I2(s)': 0,
  'C(s)': 0, 'S(s)': 0, 'Na(s)': 0, 'K(s)': 0, 'Mg(s)': 0, 'Ca(s)': 0, 'Al(s)': 0, 'Fe(s)': 0, 'Cu(s)': 0, 'Zn(s)': 0, 'Ag(s)': 0,
  'O3(g)': 142.7,
};

/** Find ΔH°f for a species; state optional (falls back to the only/first listed state). */
export function lookupDHf(formula, state) {
  const f = String(formula).replace(/\^.*/, '');
  if (state && DHF[`${f}(${state})`] !== undefined) return { value: DHF[`${f}(${state})`], key: `${f}(${state})` };
  if (state) return null;
  const keys = Object.keys(DHF).filter((k) => k.startsWith(f + '('));
  if (keys.length === 0) return null;
  return { value: DHF[keys[0]], key: keys[0], guessedState: keys.length > 1 ? keys.map((k) => k.slice(f.length)) : null };
}

// Average bond enthalpies (kJ/mol): typical general-chemistry values, close to
// OpenStax Chemistry 2e, Table 7.3. Textbooks differ by a few kJ/mol. Bond enthalpies are averages
// over many molecules, so ΔH estimates from them are approximate (often within
// about ±10 %).
export const BOND_SOURCE = 'Typical average bond energies used in general chemistry (close to OpenStax Chemistry 2e, Table 7.3). Textbooks differ by a few kJ/mol, and averages make the result an estimate. Edit any value to match your textbook.';
export const BOND_ENERGIES = {
  'H–H': 436, 'H–C': 415, 'H–N': 390, 'H–O': 464, 'H–F': 569, 'H–Cl': 432, 'H–Br': 370, 'H–I': 295, 'H–S': 340,
  'C–C': 345, 'C=C': 611, 'C≡C': 837, 'C–N': 290, 'C=N': 615, 'C≡N': 891, 'C–O': 350, 'C=O': 741, 'C≡O': 1080,
  'C–F': 439, 'C–Cl': 330, 'C–Br': 275, 'C–I': 240, 'C–S': 260,
  'N–N': 160, 'N=N': 418, 'N≡N': 946, 'N–O': 200, 'N=O': 631, 'N–F': 270, 'N–Cl': 200,
  'O–O': 140, 'O=O': 498, 'O–F': 190, 'O–Cl': 203,
  'F–F': 160, 'Cl–Cl': 243, 'Br–Br': 190, 'I–I': 150, 'S–S': 225, 'S=O': 522,
  'C=O (in CO₂)': 799,
};

// Specific heat capacities (J/(g·°C)) near 25 °C: common textbook values
// (see OpenStax Chemistry 2e Table 5.1 and the CRC Handbook; editable in the app).
export const SPECIFIC_HEATS = {
  'Water (liquid)': 4.184, 'Water (ice)': 2.09, 'Water (steam)': 2.01,
  Aluminium: 0.897, Copper: 0.385, Iron: 0.449, Lead: 0.130, Silver: 0.235, Gold: 0.129,
  Glass: 0.84, Ethanol: 2.44, Granite: 0.79, Air: 1.01,
};
