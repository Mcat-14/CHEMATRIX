# CHEMATRIX user guide

## Finding your way

- **Phone:** the bar at the bottom has Home, Stoich, Gases, Thermo and **More** (everything else).
- **Computer:** the menu on the left lists every section; the search box at the top finds any calculator or formula.
- **Dashboard:** modules, quick calculators, your recent calculations and a search box.

## Using any calculator

Every calculator works the same way:

1. Pick the calculator from the tabs at the top of a module.
2. If there is a **Solve for** row, choose the unknown. Only the inputs you need are shown.
3. Type the values and choose units. You can type scientific notation as `6.02e23` or `6.02x10^23`.
4. Press **Calculate** (or Balance, Classify, Predict). **Load example** fills in a sample problem.
5. Read the solution: the green box is the answer; below it are the numbered parts (given values, unknown, formula, variable definitions, unit conversions, substitution, calculation, final answer, interpretation). Some tools add a table or a graph.
6. **Copy answer**, **Copy full solution**, or **Save as PDF / Print** (choose "Save as PDF" in the print dialog).

If something is missing or impossible (for example a temperature below absolute zero), a red box explains what to fix.

## Tips by module

**Formulas and equations**
- Element symbols need correct capitals: `Co` is cobalt, `CO` is carbon monoxide.
- Brackets: `Ca(OH)2`, `K4[Fe(CN)6]`. Hydrates: `CuSO4·5H2O`, `CuSO4*5H2O` or `CuSO4.5H2O`.
- Arrows: `->` or `=`. Charges: `Fe^3+`, `SO4^2-`. States are optional: `H2O(l)`.
- The balancer checks any coefficients you type and tells you whether they were right.

**Product prediction**
- Enter one reactant (decomposition) or two reactants: `AgNO3 + NaCl`.
- For metals with more than one charge (Fe, Cu, Pb, Sn…), the app asks which ion forms. Enter the metal and charge in the optional fields and press Predict again.

**Gas laws**
- Temperatures can be in °C, K or °F; they are always converted to kelvin first.
- Choose the answer unit, or keep "Same unit as the given value".
- The **Graph explorer** tab shows each relationship with sliders.

**Thermochemistry**
- Sign convention: q > 0 means heat absorbed; q < 0 means heat released.
- For ΔH from formation data, add states, e.g. `H2O(l)` vs `H2O(g)`. If a value is not stored, add it under "Your own ΔH°f values".
- Hess's law: enter the given equations with their coefficients (fractions like `1/2O2` are fine). Either let the app find the factors from the target equation, or enter them yourself (−1 reverses, 2 doubles).

## Significant figures

By default the answer is rounded by the significant-figure rules (fewest significant figures among your measured values; decimal places for ΔT and °C conversions). Change it in Settings → Rounding. Calculations always keep full precision internally.

A value like `100` has ambiguous significant figures. The app counts the zeros as significant and shows a note. If you meant one significant figure, type `1e2`.

## Practice mode

Pick a topic and difficulty. Multiple-choice and numerical questions are generated fresh each time. Numerical answers within 1 % are accepted. Your progress per topic is saved on this device.

## History

Every calculation is saved on this device (can be turned off in Settings). In History you can filter, reopen a calculation with its full solution, copy the result, delete one entry or clear everything.

## Settings

Theme (light/dark/device), rounding, history on/off, show the tour again, clear all stored data, install guide and offline status, topic checklist, about and data sources.
