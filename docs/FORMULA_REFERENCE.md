# Formula reference

All formulas implemented in CHEMATRIX. The same content is in the app's Formula library.

## Constants and data sources

| Constant | Value | Source |
|---|---|---|
| Avogadro's constant | 6.02214076e+23 mol⁻¹ | SI 2019 (exact) |
| Gas constant | 8.314462618 J/(mol·K) | CODATA 2018 (N_A·k_B, exact) |
| Gas constant | 0.082057366 L·atm/(mol·K) | R / 101.325 J per L·atm |
| Gas constant | 8.314462618 L·kPa/(mol·K) | numerically equal to R in J/(mol·K) |
| Gas constant | 62.36359 L·mmHg/(mol·K) | R / 0.133322 J per L·mmHg |
| Standard atmosphere | 101325 Pa | exact by definition |
| Thermochemical calorie | 4.184 J | exact by definition |
| Specific heat of liquid water (≈25 °C) | 4.184 J/(g·°C) | common textbook value (4.18 J/g·°C) |
| Molar volume of ideal gas at 0 °C and 1 atm | 22.414 L/mol | R·T/P with T = 273.15 K, P = 1 atm |

- **Atomic masses:** IUPAC CIAAW abridged standard atomic weights (2021); mass number of the most stable isotope for radioactive elements.
- **Standard enthalpies of formation:** CRC Handbook of Chemistry and Physics, standard thermodynamic properties at 298.15 K (see also OpenStax Chemistry 2e, Appendix G). Your textbook may differ by a few tenths of kJ/mol.
- **Bond energies:** Typical average bond energies used in general chemistry (close to OpenStax Chemistry 2e, Table 7.3). Textbooks differ by a few kJ/mol, and averages make the result an estimate. Edit any value to match your textbook.
- **Unit definitions:** 1 atm = 101.325 kPa = 760 torr; 1 mmHg = 133.322387 Pa; 1 bar = 100 kPa; 1 cal = 4.184 J; T(K) = T(°C) + 273.15.
- **Significant figures:** multiplication/division answers use the fewest significant figures among measured inputs; sums and differences (ΔT, °C→K) use decimal places. Exact numbers (coefficients, N_A, 273.15, unit definitions) never limit precision. Trailing zeros without a decimal point (for example "100") are ambiguous; the app counts them as significant and shows a note.

## Stoichiometry

### Molar mass

`M = Σ nᵢ·Aᵢ`

| Symbol | Meaning | Units |
|---|---|---|
| M | molar mass | g/mol |
| nᵢ | atoms of element i per formula unit | – |
| Aᵢ | atomic mass of element i | g/mol |

Add the atomic masses of every atom in the formula. Numerically equal to the formula mass in atomic mass units.

- Conditions: Uses standard atomic weights (average isotopic composition).
- Example: H₂O: 2(1.008) + 15.999 = 18.015 g/mol
- Calculator: `#/stoichiometry/molar-mass`

### Mass–mole relationship

`n = m / M`

| Symbol | Meaning | Units |
|---|---|---|
| n | amount of substance | mol |
| m | mass | g |
| M | molar mass | g/mol |

Moles are mass divided by the mass of one mole.

- Conditions: Mass must be in grams when M is in g/mol.
- Example: 36.0 g H₂O ÷ 18.015 g/mol = 2.00 mol
- Calculator: `#/stoichiometry/moles`

### Particles and moles

`N = n · Nₐ`

| Symbol | Meaning | Units |
|---|---|---|
| N | number of particles | – |
| n | amount of substance | mol |
| Nₐ | Avogadro's constant, 6.02214076 × 10²³ | mol⁻¹ |

One mole contains exactly 6.02214076 × 10²³ particles (atoms, molecules, ions or formula units).

- Conditions: Nₐ is exact since the 2019 SI redefinition.
- Example: 0.500 mol CO₂ × 6.022 × 10²³ = 3.01 × 10²³ molecules
- Calculator: `#/stoichiometry/moles`

### Mole ratio

`n_B = n_A × (b / a)`

| Symbol | Meaning | Units |
|---|---|---|
| n_A, n_B | moles of substances A and B | mol |
| a, b | coefficients of A and B in the balanced equation | – |

Coefficients of a balanced equation give the ratio in which substances react and form.

- Conditions: Equation must be balanced.
- Example: N₂ + 3H₂ → 2NH₃: 1.5 mol H₂ × (2/3) = 1.0 mol NH₃
- Calculator: `#/stoichiometry/mole-ratio`

### Limiting reactant

`smallest of nᵢ / cᵢ`

| Symbol | Meaning | Units |
|---|---|---|
| nᵢ | moles of reactant i available | mol |
| cᵢ | coefficient of reactant i | – |

The reactant with the smallest moles-to-coefficient ratio runs out first and sets the theoretical yield.

- Conditions: Reaction goes to completion as written.
- Example: 2H₂ + O₂ → 2H₂O with 4 mol H₂ and 3 mol O₂: 4/2 = 2 < 3/1, so H₂ limits
- Calculator: `#/stoichiometry/limiting`

### Percent yield

`% yield = (actual / theoretical) × 100 %`

| Symbol | Meaning | Units |
|---|---|---|
| actual | product actually obtained | g or mol |
| theoretical | maximum product from stoichiometry | g or mol |

Measures how efficient a reaction was.

- Conditions: Both yields in the same unit; cannot exceed 100 % for a pure product.
- Example: 8.5 g obtained, 10.0 g possible: 85 %
- Calculator: `#/stoichiometry/percent-yield`

### Percent composition

`% element = (nᵢ·Aᵢ / M) × 100 %`

| Symbol | Meaning | Units |
|---|---|---|
| nᵢ·Aᵢ | mass of element i in one mole | g |
| M | molar mass of the compound | g/mol |

The fraction of a compound's mass contributed by each element.

- Conditions: —
- Example: H in H₂O: 2.016 / 18.015 × 100 % = 11.19 %
- Calculator: `#/stoichiometry/molar-mass`

## Chemical reactions

### Conservation of atoms

`atoms of each element (reactants) = atoms (products)`

| Symbol | Meaning | Units |
|---|---|---|
| coefficient | number of units of a substance | – |
| subscript | number of atoms within one unit (never changed when balancing) | – |

Balancing changes only coefficients. Subscripts define the substance itself.

- Conditions: Charge must also balance for ionic equations.
- Example: CH₄ + 2O₂ → CO₂ + 2H₂O: C 1=1, H 4=4, O 4=4
- Calculator: `#/reactions/balancer`

## Gas laws

### Boyle's law

`P₁V₁ = P₂V₂`

| Symbol | Meaning | Units |
|---|---|---|
| P | pressure | atm, kPa, mmHg |
| V | volume | L, mL |

Pressure and volume are inversely proportional.

- Conditions: Constant temperature and amount of gas.
- Example: 2.0 L at 1.0 atm → 1.0 L at 2.0 atm
- Calculator: `#/gas-laws/boyle`

### Charles's law

`V₁/T₁ = V₂/T₂`

| Symbol | Meaning | Units |
|---|---|---|
| V | volume | L, mL |
| T | absolute temperature | K |

Volume is directly proportional to absolute temperature.

- Conditions: Constant pressure and amount. T must be in kelvin.
- Example: 1.00 L at 273 K → 2.00 L at 546 K
- Calculator: `#/gas-laws/charles`

### Gay-Lussac's law

`P₁/T₁ = P₂/T₂`

| Symbol | Meaning | Units |
|---|---|---|
| P | pressure | atm, kPa, mmHg |
| T | absolute temperature | K |

Pressure is directly proportional to absolute temperature.

- Conditions: Constant volume and amount. T in kelvin.
- Example: 1.00 atm at 300 K → 1.20 atm at 360 K
- Calculator: `#/gas-laws/gay-lussac`

### Combined gas law

`P₁V₁/T₁ = P₂V₂/T₂`

| Symbol | Meaning | Units |
|---|---|---|
| P | pressure | any, consistent |
| V | volume | any, consistent |
| T | absolute temperature | K |

Combines Boyle's, Charles's and Gay-Lussac's laws.

- Conditions: Fixed amount of gas. T in kelvin.
- Example: 101.3 kPa, 2.00 L, 298 K → 202.6 kPa, 323 K: V₂ = 1.08 L
- Calculator: `#/gas-laws/combined`

### Avogadro's law

`V₁/n₁ = V₂/n₂`

| Symbol | Meaning | Units |
|---|---|---|
| V | volume | L |
| n | amount of gas | mol |

Equal volumes of gases at the same T and P contain equal numbers of particles.

- Conditions: Constant temperature and pressure.
- Example: 5.0 L with 0.20 mol → 10.0 L with 0.40 mol
- Calculator: `#/gas-laws/avogadro`

### Ideal gas law

`PV = nRT`

| Symbol | Meaning | Units |
|---|---|---|
| P | pressure | atm / kPa / mmHg |
| V | volume | L |
| n | amount | mol |
| R | 0.082057 L·atm/(mol·K) = 8.3145 L·kPa/(mol·K) = 62.364 L·mmHg/(mol·K) | — |
| T | absolute temperature | K |

Relates all four gas variables for an ideal gas.

- Conditions: Ideal behaviour (low pressure, high temperature). Choose R to match the units of P and V.
- Example: 1.00 mol at 273.15 K and 1.00 atm occupies 22.4 L
- Calculator: `#/gas-laws/ideal`

### Gas density

`d = PM / (RT)`

| Symbol | Meaning | Units |
|---|---|---|
| d | density | g/L |
| P | pressure | atm |
| M | molar mass | g/mol |
| R | 0.082057 L·atm/(mol·K) | — |
| T | absolute temperature | K |

Derived from PV = nRT with n = m/M.

- Conditions: Ideal gas.
- Example: CO₂ at 1.00 atm, 273 K: d = 1.96 g/L
- Calculator: `#/gas-laws/density`

### Molar mass of a gas

`M = mRT / (PV) = dRT / P`

| Symbol | Meaning | Units |
|---|---|---|
| M | molar mass | g/mol |
| m | mass of sample | g |
| d | density | g/L |

Identify an unknown gas from measured mass, volume, temperature and pressure.

- Conditions: Ideal gas, pure sample.
- Example: 1.60 g in 1.12 L at STP: M = 32.0 g/mol (O₂)
- Calculator: `#/gas-laws/molar-mass`

### Celsius to kelvin

`T(K) = T(°C) + 273.15`

| Symbol | Meaning | Units |
|---|---|---|
| T | temperature | K or °C |

Gas laws need absolute temperature because volume and pressure are proportional to T only on the kelvin scale.

- Conditions: Always convert before using a gas law.
- Example: 25 °C = 298 K
- Calculator: `#/units`

## Thermochemistry

### Heat and temperature change

`q = m·c·ΔT`

| Symbol | Meaning | Units |
|---|---|---|
| q | heat (positive = absorbed) | J |
| m | mass | g |
| c | specific heat capacity | J/(g·°C) |
| ΔT | T_final − T_initial | °C or K |

Heat needed to change the temperature of a substance.

- Conditions: No phase change; c constant.
- Example: 100 g water from 20 °C to 30 °C: q = 100 × 4.184 × 10 = 4184 J
- Calculator: `#/thermochemistry/heat`

### Specific heat capacity

`c = q / (m·ΔT)`

| Symbol | Meaning | Units |
|---|---|---|
| c | specific heat | J/(g·°C) |

Energy to raise 1 g of a substance by 1 °C.

- Conditions: No phase change.
- Example: 385 J warms 10.0 g by 100 °C: c = 0.385 J/(g·°C) (copper)
- Calculator: `#/thermochemistry/specific-heat`

### Final temperature

`T_f = T_i + q / (m·c)`

| Symbol | Meaning | Units |
|---|---|---|
| T_f, T_i | final and initial temperature | °C |

Rearranged form of q = mcΔT.

- Conditions: No phase change.
- Example: 50.0 g water at 20.0 °C absorbs 2092 J: T_f = 30.0 °C
- Calculator: `#/thermochemistry/temperature`

### Calorimetry (heat exchange)

`q_lost + q_gained = 0 ;  q_rxn = −q_solution`

| Symbol | Meaning | Units |
|---|---|---|
| q_lost | heat released by the hotter object or reaction | J |
| q_gained | heat absorbed by the colder object or solution | J |

In an isolated calorimeter, energy is conserved: heat lost by one part is gained by another.

- Conditions: Isolated system; calorimeter heat capacity negligible (coffee cup) or known (bomb).
- Example: Metal releases the heat the water absorbs
- Calculator: `#/thermochemistry/calorimetry`

### Bomb calorimeter

`q_rxn = −C_cal · ΔT`

| Symbol | Meaning | Units |
|---|---|---|
| C_cal | heat capacity of the calorimeter | kJ/°C |

Constant-volume calorimetry used for combustion.

- Conditions: Measures ΔE; ΔH ≈ ΔE for most reactions.
- Example: C = 10.0 kJ/°C, ΔT = 2.50 °C: q_rxn = −25.0 kJ
- Calculator: `#/thermochemistry/calorimetry`

### Enthalpy from formation data

`ΔH°rxn = Σn·ΔH°f(products) − Σn·ΔH°f(reactants)`

| Symbol | Meaning | Units |
|---|---|---|
| ΔH°f | standard enthalpy of formation | kJ/mol |
| n | coefficient | mol |

Products minus reactants, each weighted by its coefficient.

- Conditions: Standard state (298 K, 1 bar). Elements in standard state have ΔH°f = 0.
- Example: CH₄ + 2O₂ → CO₂ + 2H₂O(l): ΔH° = −890.5 kJ (using the ΔH°f table in this app)
- Calculator: `#/thermochemistry/enthalpy`

### Molar enthalpy

`ΔH = q / n`

| Symbol | Meaning | Units |
|---|---|---|
| ΔH | enthalpy change per mole | kJ/mol |
| q | heat of the system | kJ |
| n | moles | mol |

Negative ΔH: exothermic (heat released). Positive ΔH: endothermic (heat absorbed).

- Conditions: Constant pressure.
- Example: −5.56 kJ released by 0.0100 mol: ΔH = −556 kJ/mol
- Calculator: `#/thermochemistry/enthalpy`

### Hess's law

`ΔH_overall = Σ (factorᵢ × ΔHᵢ)`

| Symbol | Meaning | Units |
|---|---|---|
| factor | multiplier for each step (negative if reversed) | – |

Enthalpy is a state function, so the ΔH of steps adds up to the overall ΔH.

- Conditions: Reverse an equation → change the sign of ΔH. Multiply an equation → multiply ΔH.
- Example: C + O₂ → CO₂ (−393.5) and CO + ½O₂ → CO₂ (−283.0) give C + ½O₂ → CO: −110.5 kJ
- Calculator: `#/thermochemistry/hess`

### Bond energies

`ΔH ≈ Σ BE(broken) − Σ BE(formed)`

| Symbol | Meaning | Units |
|---|---|---|
| BE | average bond energy | kJ/mol |

Breaking bonds absorbs energy; forming bonds releases energy.

- Conditions: Gas phase; average values give an estimate.
- Example: H₂ + Cl₂ → 2HCl: (436 + 243) − 2(432) = −185 kJ
- Calculator: `#/thermochemistry/bond-energy`

### Activation energy and ΔH

`ΔH = H(products) − H(reactants);  Ea(reverse) = Ea(forward) − ΔH`

| Symbol | Meaning | Units |
|---|---|---|
| Ea | activation energy | kJ/mol |

The energy diagram shows the barrier (Ea) and the overall energy change (ΔH).

- Conditions: —
- Example: Ea = 50 kJ, ΔH = −30 kJ: reverse Ea = 80 kJ
- Calculator: `#/thermochemistry/energy-diagram`
