# Demonstration script (about 10 minutes)

Prepare: deploy the app (DEPLOYMENT.md), install it on a phone and open it once online. Project it from a laptop and keep the phone ready. Clear History beforehand (Settings) so the demo history is clean.

## 1. Introduction (1 min)

- Open the **welcome page**: CHEMATRIX solves stoichiometry, gas-law and thermochemistry problems and shows every step.
- Point out the **Online** indicator in the top bar.

## 2. Module 1: reactions and stoichiometry (3 min)

1. Reactions → **Balancer**: type `KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2` → Balance. Show the coefficients 2, 16, 2, 2, 8, 5, the algebra steps (one equation per element) and the atom-count table.
2. **Classifier**: example chip `Zn + CuSO4 -> ZnSO4 + Cu` → single displacement, with reasons. Then `4NH3 + 5O2 -> 4NO + 6H2O`: the app says it is *not* one of the five types instead of forcing a label.
3. **Predict products**: `Pb(NO3)2 + KI` → PbI₂ precipitate, with the solubility rule. Then `Fe + O2`: the app asks whether Fe²⁺ or Fe³⁺ forms (it does not guess).
4. Stoichiometry → **Limiting reactant** → Load example (10.0 g Al + 10.0 g O₂): Al limits, O₂ left over, 18.9 g Al₂O₃.

## 3. Module 2: gases and states of matter (2 min)

1. Gas laws → **Charles's law** → Load example: show the °C → K conversion lines and the graph through both states.
2. **Ideal gas**: solve V for 1.00 mol at 0 °C and 1.00 atm → 22.4 L; point out R chosen for L·atm.
3. **Graph explorer**: drag the volume slider on Boyle's law.
4. **States of matter**: switch solid → liquid → gas and raise the temperature slider.

## 4. Module 3: thermochemistry (2 min)

1. **Heat** → Load example → q = 4180 J, with the sign interpretation.
2. **Calorimetry** → Load example (hot metal in water): the result is compared with known metals.
3. **Hess's law** → Load example: the app finds the factors 2, 1 and −½ automatically and shows each adjustment of ΔH (226.7 kJ for acetylene).
4. **Energy diagram**: press "Combustion", then "Add a catalyst" (Ea drops, ΔH unchanged).

## 5. Offline and mobile (2 min)

1. On the phone, open the installed app from the home screen.
2. Turn on **airplane mode**. The status changes to Offline and a banner appears.
3. Do a calculation (e.g. molar mass of `CuSO4·5H2O` = 249.68 g/mol), open the Formula library, and open History; the earlier calculations are there.
4. Close the app completely and reopen it, still in airplane mode: it opens normally.

## 6. Accuracy and testing (1 min)

- Show docs/TEST_REPORT.md: 99 hand-verified cases and 114 automated tests, all passing.
- Show docs/OFFLINE_TEST_REPORT.md: 13 install/offline/mobile scenarios, all passing.
- Mention the topic checklist (Settings → Topic checklist) with the items still to confirm with the instructor.

## Manual checks on real devices (do before the presentation)

| Check | Android (Chrome) | iPhone (Safari) |
|---|---|---|
| Install from the browser | ☐ | ☐ |
| Opens from home screen in its own window | ☐ | ☐ |
| Works in airplane mode after closing and reopening | ☐ | ☐ |
| Numeric keyboard appears for number fields | ☐ | ☐ |
| Bottom bar and "More" menu easy to tap | ☐ | ☐ |
| Save as PDF / Print produces a readable report | ☐ | ☐ |
| Dark mode readable | ☐ | ☐ |

## Backup plan

If the projector or Wi-Fi fails: run `npm run serve` on the laptop and open http://localhost:8080. Everything works locally.
